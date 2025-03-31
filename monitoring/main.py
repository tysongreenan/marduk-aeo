from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Set, Tuple
import uuid
import os
import json
import httpx
import asyncio
import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.executors.pool import ThreadPoolExecutor
from supabase import create_client, Client
from dotenv import load_dotenv
from redis import asyncio as aioredis
import hashlib
import random
from collections import defaultdict
import time
import statistics
import secrets

# Use relative imports instead of mixing absolute and relative imports
from .usage_manager import UsageSettings, UsageManager, init_supabase_tables
from .database import get_db, ensure_tables_exist
from .dashboard import router as dashboard_router
from .secure_data_api import router as secure_data_api_router
from .ranking_api import router as ranking_api_router

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Marduk AEO Monitoring Service")

# Add CORS middleware
frontend_domain = os.getenv("FRONTEND_DOMAIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_domain],  # Use the frontend domain from environment variable
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables")

try:
    # Try to use our helper function if available
    from .fix_supabase import create_supabase_client
    supabase = create_supabase_client()
except ImportError:
    # Fall back to standard initialization
    from supabase import create_client
    supabase: Client = create_client(supabase_url, supabase_key)

# Create usage_manager without initializing tables
usage_manager = UsageManager(supabase)

# Don't automatically initialize tables on startup
# Will use an endpoint to initialize tables instead

# Setup scheduler
scheduler = AsyncIOScheduler(
    jobstores={"default": MemoryJobStore()},
    executors={"default": ThreadPoolExecutor(20)},
    job_defaults={"coalesce": False, "max_instances": 3},
)

# Initialize Redis client
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
print(f"Using Redis URL: {redis_url}")
redis = aioredis.from_url(redis_url)

# Pydantic models
class MonitoringTask(BaseModel):
    brand_id: str
    query_text: str
    topic_id: Optional[str] = None
    frequency_minutes: int = 60
    llm_type: str = "openai"
    llm_version: str = "gpt-4"
    active: bool = True

class TaskResponse(BaseModel):
    task_id: str
    brand_id: str
    query_text: str
    next_run: str
    
class QueryResult(BaseModel):
    id: str
    brand_id: str
    query_text: str
    llm_response: str
    brand_mentioned: bool
    sentiment_score: float
    ranking_position: int
    created_at: str

class APILimits:
    """Track API usage to prevent exceeding rate limits"""
    def __init__(self):
        self.usage = {}
        self.limits = {
            "openai": {
                "requests_per_minute": 20,
                "tokens_per_minute": 10000,
                "max_retries": 5,
                "base_delay": 1  # Base delay in seconds
            },
            "anthropic": {
                "requests_per_minute": 15,
                "tokens_per_minute": 8000,
                "max_retries": 5,
                "base_delay": 1
            },
            "google": {
                "requests_per_minute": 30,
                "tokens_per_minute": 15000,
                "max_retries": 5,
                "base_delay": 1
            }
        }
    
    def can_make_request(self, provider: str) -> bool:
        """Check if we can make another request to this provider"""
        now = datetime.now()
        minute_key = now.strftime("%Y-%m-%d-%H-%M")
        
        if provider not in self.usage:
            self.usage[provider] = {}
        
        if minute_key not in self.usage[provider]:
            self.usage[provider][minute_key] = {
                "requests": 0,
                "tokens": 0
            }
        
        # Clean up old usage data
        for key in list(self.usage[provider].keys()):
            if key != minute_key:
                self.usage[provider].pop(key)
        
        return self.usage[provider][minute_key]["requests"] < self.limits[provider]["requests_per_minute"]
    
    def increment_usage(self, provider: str, tokens: int = 0):
        """Track usage after a request"""
        now = datetime.now()
        minute_key = now.strftime("%Y-%m-%d-%H-%M")
        
        if provider not in self.usage:
            self.usage[provider] = {}
        
        if minute_key not in self.usage[provider]:
            self.usage[provider][minute_key] = {
                "requests": 0,
                "tokens": 0
            }
        
        self.usage[provider][minute_key]["requests"] += 1
        self.usage[provider][minute_key]["tokens"] += tokens

    async def wait_for_capacity(self, provider: str, retry_count: int = 0) -> bool:
        """Wait with exponential backoff until capacity is available"""
        if retry_count >= self.limits[provider]["max_retries"]:
            return False
            
        if self.can_make_request(provider):
            return True
            
        delay = self.limits[provider]["base_delay"] * (2 ** retry_count)  # Exponential backoff
        jitter = random.uniform(0, 0.1 * delay)  # Add some randomness to prevent thundering herd
        await asyncio.sleep(delay + jitter)
        
        return await self.wait_for_capacity(provider, retry_count + 1)

# Initialize API limits tracker
api_limits = APILimits()

class BatchProcessor:
    def __init__(self, batch_size: int = 10, max_wait_time: float = 0.5):
        self.batch_size = batch_size
        self.max_wait_time = max_wait_time
        self.batches: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self.events: Dict[str, Set[asyncio.Event]] = defaultdict(set)
        self.results: Dict[str, Any] = {}
        self.processing = False
    
    async def add_to_batch(self, key: str, item: Dict[str, Any]) -> Any:
        """Add an item to a batch and wait for results"""
        event = asyncio.Event()
        self.batches[key].append(item)
        self.events[key].add(event)
        
        if len(self.batches[key]) >= self.batch_size and not self.processing:
            asyncio.create_task(self._process_batch(key))
        elif not self.processing:
            asyncio.create_task(self._schedule_processing(key))
        
        await event.wait()
        return self.results.get(f"{key}:{id(event)}")
    
    async def _schedule_processing(self, key: str):
        """Schedule batch processing after max_wait_time"""
        if not self.processing:
            self.processing = True
            await asyncio.sleep(self.max_wait_time)
            await self._process_batch(key)
    
    async def _process_batch(self, key: str):
        """Process a batch of items"""
        if not self.batches[key]:
            self.processing = False
            return
        
        batch = self.batches[key]
        events = self.events[key]
        self.batches[key] = []
        self.events[key] = set()
        
        try:
            # Process the batch (implement in child class)
            results = await self._process_items(key, batch)
            
            # Store results and notify waiters
            for event, result in zip(events, results):
                self.results[f"{key}:{id(event)}"] = result
                event.set()
        
        except Exception as e:
            # Handle errors
            for event in events:
                self.results[f"{key}:{id(event)}"] = {"error": str(e)}
                event.set()
        
        finally:
            self.processing = False

# Initialize batch processor
batch_processor = BatchProcessor()

class LLMCosts:
    """Track costs for different LLM platforms"""
    COSTS = {
        "openai": {
            "gpt-4": {
                "input": 0.03,  # per 1K tokens
                "output": 0.06
            },
            "gpt-3.5-turbo": {
                "input": 0.001,
                "output": 0.002
            },
            "text-ada-001": {  # Adding ada model
                "input": 0.0004,
                "output": 0.0004
            }
        },
        "anthropic": {
            "claude-2": {
                "input": 0.008,
                "output": 0.024
            },
            "claude-instant": {
                "input": 0.0008,
                "output": 0.0024
            }
        },
        "google": {
            "gemini-pro": {
                "input": 0.001,
                "output": 0.002
            }
        }
    }

    @staticmethod
    def estimate_cost(llm_type: str, llm_version: str, estimated_tokens: int = 500) -> float:
        """Estimate cost for a query based on platform and model"""
        if llm_type.lower() not in LLMCosts.COSTS:
            raise ValueError(f"Unknown LLM type: {llm_type}")
        
        platform_costs = LLMCosts.COSTS[llm_type.lower()]
        if llm_version not in platform_costs:
            raise ValueError(f"Unknown model version: {llm_version} for {llm_type}")
        
        model_costs = platform_costs[llm_version]
        # Assume 50/50 split between input and output tokens
        input_tokens = estimated_tokens // 2
        output_tokens = estimated_tokens // 2
        
        total_cost = (input_tokens * model_costs["input"] + output_tokens * model_costs["output"]) / 1000
        return total_cost

    @staticmethod
    def get_available_models() -> Dict[str, List[str]]:
        """Get all available models grouped by platform"""
        return {
            platform: list(models.keys())
            for platform, models in LLMCosts.COSTS.items()
        }

    @staticmethod
    def recommend_model(max_cost_per_query: float = 0.05) -> Tuple[str, str]:
        """Recommend the most capable model within the cost constraint"""
        best_model = None
        best_platform = None
        best_cost = float('inf')
        
        for platform, models in LLMCosts.COSTS.items():
            for model in models:
                cost = LLMCosts.estimate_cost(platform, model)
                if cost <= max_cost_per_query and (
                    best_model is None or 
                    (platform == "openai" and "gpt-4" in model) or
                    (platform == "anthropic" and "claude-2" in model and "instant" not in model)
                ):
                    best_model = model
                    best_platform = platform
                    best_cost = cost
        
        if best_model is None:
            # Default to most affordable option
            return "openai", "gpt-3.5-turbo"
        
        return best_platform, best_model

# LLM Service
class CostOptimizer:
    """Advanced cost optimization strategies for LLM usage"""
    def __init__(self):
        self.usage_history = defaultdict(list)
        self.model_performance = {}
        self.cache_hits = defaultdict(int)
        self.cache_misses = defaultdict(int)
        self.cost_savings = 0.0

    async def optimize_query(self, query_text: str, brand_name: str, llm_type: str, llm_version: str) -> Tuple[str, str]:
        """Optimize query parameters for best cost-performance ratio"""
        # Check if we can use a cheaper model based on query complexity
        complexity_score = self._calculate_query_complexity(query_text)
        
        if complexity_score < 0.3:  # Simple queries
            if llm_type == "openai" and "gpt-4" in llm_version:
                return "openai", "gpt-3.5-turbo"
            elif llm_type == "anthropic" and "claude-2" in llm_version:
                return "anthropic", "claude-instant"
        
        # Check historical performance
        if self._check_model_performance(llm_type, llm_version) < 0.7:
            recommended_platform, recommended_model = LLMCosts.recommend_model(max_cost_per_query=0.05)
            return recommended_platform, recommended_model
        
        return llm_type, llm_version

    def _calculate_query_complexity(self, query_text: str) -> float:
        """Calculate query complexity score (0-1)"""
        # Length-based complexity
        length_score = min(len(query_text.split()) / 100, 1.0) * 0.3
        
        # Keyword-based complexity
        complex_keywords = {'compare', 'analyze', 'evaluate', 'synthesize', 'recommend', 'optimize'}
        keyword_score = sum(word in query_text.lower() for word in complex_keywords) / len(complex_keywords) * 0.4
        
        # Structure-based complexity
        structure_score = 0.0
        if '?' in query_text:
            structure_score += 0.1
        if 'and' in query_text.lower() or 'or' in query_text.lower():
            structure_score += 0.1
        if any(char in query_text for char in ['(', ')', '[', ']', '{', '}']):
            structure_score += 0.1
        
        return length_score + keyword_score + structure_score

    def _check_model_performance(self, llm_type: str, llm_version: str) -> float:
        """Check historical performance score (0-1)"""
        key = f"{llm_type}:{llm_version}"
        return self.model_performance.get(key, 0.8)  # Default to 0.8 if no history

    async def track_request(self, llm_type: str, llm_version: str, tokens_used: int, is_cache_hit: bool):
        """Track request metrics for optimization"""
        key = f"{llm_type}:{llm_version}"
        
        if is_cache_hit:
            self.cache_hits[key] += 1
            # Calculate cost savings from cache hit
            cost_per_token = LLMCosts.COSTS[llm_type][llm_version]["input"] / 1000
            self.cost_savings += tokens_used * cost_per_token
        else:
            self.cache_misses[key] += 1

        # Track usage for dynamic optimization
        self.usage_history[key].append({
            'timestamp': datetime.now(),
            'tokens': tokens_used
        })
        
        # Clean up old history (keep last 24 hours)
        cutoff = datetime.now() - timedelta(hours=24)
        self.usage_history[key] = [
            entry for entry in self.usage_history[key] 
            if entry['timestamp'] > cutoff
        ]

    def get_optimization_stats(self) -> Dict[str, Any]:
        """Get optimization statistics"""
        stats = {
            'cost_savings': self.cost_savings,
            'cache_efficiency': {},
            'model_usage': {},
            'recommendations': []
        }
        
        # Calculate cache efficiency
        for key in self.cache_hits.keys() | self.cache_misses.keys():
            hits = self.cache_hits[key]
            total = hits + self.cache_misses[key]
            efficiency = hits / total if total > 0 else 0
            stats['cache_efficiency'][key] = {
                'hit_rate': efficiency,
                'hits': hits,
                'total_requests': total
            }
        
        # Calculate model usage patterns
        for key, history in self.usage_history.items():
            if history:
                avg_tokens = sum(entry['tokens'] for entry in history) / len(history)
                stats['model_usage'][key] = {
                    'average_tokens': avg_tokens,
                    'requests_24h': len(history)
                }
        
        # Generate cost optimization recommendations
        stats['recommendations'] = self._generate_recommendations()
        
        return stats

    def _generate_recommendations(self) -> List[Dict[str, Any]]:
        """Generate cost optimization recommendations"""
        recommendations = []
        
        # Check cache efficiency
        for key, stats in self.cache_efficiency.items():
            if stats['hit_rate'] < 0.3 and stats['total_requests'] > 100:
                recommendations.append({
                    'type': 'cache_optimization',
                    'model': key,
                    'message': f"Low cache hit rate ({stats['hit_rate']:.2%}) for {key}. Consider increasing cache TTL."
                })
        
        # Check for expensive model overuse
        for key, usage in self.model_usage.items():
            llm_type, llm_version = key.split(':')
            if any(x in llm_version.lower() for x in ['gpt-4', 'claude-2']) and usage['requests_24h'] > 1000:
                recommendations.append({
                    'type': 'model_selection',
                    'model': key,
                    'message': f"High usage of expensive model {key}. Consider using cheaper alternatives for some queries."
                })
        
        return recommendations

# Initialize cost optimizer
cost_optimizer = CostOptimizer()

async def query_llm(query_text: str, brand_name: str, llm_type: str, llm_version: str) -> Dict[str, Any]:
    """Query an LLM and analyze the response for the brand mention"""
    
    # Optimize model selection based on query characteristics
    optimized_type, optimized_version = await cost_optimizer.optimize_query(
        query_text, brand_name, llm_type, llm_version
    )
    
    if (optimized_type, optimized_version) != (llm_type, llm_version):
        logger.info(f"Cost optimization: Using {optimized_type}:{optimized_version} instead of {llm_type}:{llm_version}")
        llm_type = optimized_type
        llm_version = optimized_version
    
    # Generate cache key with minimal data
    cache_key = f"llm:{hashlib.md5(f'{query_text}:{brand_name}:{llm_type}:{llm_version}'.encode()).hexdigest()}"
    
    # Try to get from cache first
    cached_result = await redis.get(cache_key)
    if cached_result:
        cached_data = json.loads(cached_result)
        await cost_optimizer.track_request(llm_type, llm_version, cached_data.get('u', 0), True)
        return {
            "brand_mentioned": cached_data["m"],
            "sentiment_score": cached_data["s"],
            "ranking_position": cached_data["r"],
            "llm_response": cached_data["t"],
            "tokens_used": cached_data["u"]
        }
    
    # Check rate limits with exponential backoff
    if not await api_limits.wait_for_capacity(llm_type.lower()):
        raise HTTPException(
            status_code=429, 
            detail=f"Rate limit exceeded for {llm_type} after maximum retries"
        )
    
    # Add request to batch
    batch_key = f"{llm_type}:{llm_version}"
    result = await batch_processor.add_to_batch(batch_key, {
        "query_text": query_text,
        "brand_name": brand_name,
        "cache_key": cache_key
    })
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    await cost_optimizer.track_request(llm_type, llm_version, result["tokens_used"], False)
    return result

async def _process_items(key: str, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Process a batch of items"""
    llm_type, llm_version = key.split(":")
    results = []
    
    try:
        async with httpx.AsyncClient() as client:
            # Process items in parallel
            tasks = []
            for item in items:
                if llm_type.lower() == "openai":
                    task = client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={
                            "Content-Type": "application/json",
                            "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}"
                        },
                        json={
                            "model": llm_version,
                            "messages": [
                                {"role": "system", "content": "You are a helpful assistant."},
                                {"role": "user", "content": item["query_text"]}
                            ],
                            "temperature": 0.7,
                            "max_tokens": 500
                        },
                        timeout=30.0
                    )
                    tasks.append(task)
            
            # Wait for all requests to complete
            responses = await asyncio.gather(*tasks)
            
            # Process responses
            for response, item in zip(responses, items):
                response.raise_for_status()
                data = response.json()
                response_text = data["choices"][0]["message"]["content"]
                
                # Track usage
                tokens_used = data["usage"]["total_tokens"]
                api_limits.increment_usage(llm_type.lower(), tokens_used)
                
                # Process response (existing analysis code)
                brand_mentioned = item["brand_name"].lower() in response_text.lower()
                sentiment_score = 0.5  # Existing sentiment analysis code
                ranking_position = 0  # Existing ranking code
                
                result = {
                    "llm_response": response_text,
                    "brand_mentioned": brand_mentioned,
                    "sentiment_score": sentiment_score,
                    "ranking_position": ranking_position,
                    "tokens_used": tokens_used
                }
                
                # Store minimal data in cache
                minimal_data = {
                    "m": result["brand_mentioned"],
                    "s": result["sentiment_score"],
                    "r": result["ranking_position"],
                    "t": result["llm_response"],
                    "u": result["tokens_used"]
                }
                
                # Cache with TTL and compression
                await redis.set(
                    item["cache_key"],
                    json.dumps(minimal_data),
                    ex=3600,  # 1 hour TTL
                    nx=True   # Only set if not exists
                )
                
                results.append(result)
    
    except Exception as e:
        logger.error(f"Error processing batch: {e}")
        raise
    
    return results

BatchProcessor._process_items = _process_items

# Add after Redis client initialization
class ResultQueue:
    def __init__(self, redis_client, batch_size=10, flush_interval=60):
        self.redis = redis_client
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.queue_key = "result_queue"
        self.last_flush_key = "last_flush"
        self._flush_task = None
    
    async def add_result(self, result: Dict[str, Any]):
        """Add a result to the queue"""
        # Add to Redis list
        await self.redis.rpush(self.queue_key, json.dumps(result))
        
        # Start background flush if not running
        if self._flush_task is None or self._flush_task.done():
            self._flush_task = asyncio.create_task(self._background_flush())
    
    async def _background_flush(self):
        """Periodically flush results to database"""
        while True:
            # Check queue length
            queue_length = await self.redis.llen(self.queue_key)
            last_flush = float(await self.redis.get(self.last_flush_key) or 0)
            time_since_flush = time.time() - last_flush
            
            if queue_length >= self.batch_size or time_since_flush >= self.flush_interval:
                await self.flush_to_database()
            
            await asyncio.sleep(1)  # Check every second
    
    async def flush_to_database(self):
        """Flush queued results to database"""
        try:
            # Get all items from queue
            results = []
            while len(results) < self.batch_size:
                item = await self.redis.lpop(self.queue_key)
                if not item:
                    break
                results.append(json.loads(item))
            
            if not results:
                return
            
            # Batch insert into database
            queries = []
            rankings = []
            api_usage = []
            
            for result in results:
                queries.append({
                    "brand_id": result["brand_id"],
                    "topic_id": result.get("topic_id"),
                    "query_text": result["query_text"],
                    "llm_type": result["llm_type"],
                    "llm_version": result["llm_version"],
                    "llm_response": result["llm_response"],
                    "brand_mentioned": result["brand_mentioned"],
                    "sentiment_score": result["sentiment_score"],
                    "ranking_position": result["ranking_position"]
                })
                
                rankings.append({
                    "brand_id": result["brand_id"],
                    "topic_id": result.get("topic_id"),
                    "position": result["ranking_position"],
                    "sentiment_score": result["sentiment_score"]
                })
                
                api_usage.append({
                    "user_id": "system_monitor",
                    "organization_id": result["organization_id"],
                    "function_name": "monitor_brand_mention",
                    "tokens_used": result["tokens_used"],
                    "llm_provider": result["llm_type"],
                    "llm_model": result["llm_version"],
                    "cost_estimate": (result["tokens_used"] / 1000) * (0.03 if "gpt-4" in result["llm_version"].lower() else 0.002)
                })
            
            # Batch insert all data
            await asyncio.gather(
                supabase.table("keyword_queries").insert(queries).execute(),
                supabase.table("ranking_history").insert(rankings).execute(),
                supabase.table("api_usage").insert(api_usage).execute()
            )
            
            # Update last flush time
            await self.redis.set(self.last_flush_key, str(time.time()))
            
        except Exception as e:
            logger.error(f"Error flushing results to database: {e}")
            # Re-queue failed items
            for result in results:
                await self.redis.rpush(self.queue_key, json.dumps(result))

# Initialize result queue
result_queue = ResultQueue(redis)

# Update execute_monitoring_task to use queue
async def execute_monitoring_task(task_id: str, brand_id: str, query_text: str, topic_id: Optional[str], llm_type: str, llm_version: str):
    """Execute a monitoring task, querying an LLM and storing the results"""
    try:
        logger.info(f"Executing monitoring task {task_id} for brand {brand_id}")
        
        # Get brand name from the database
        brand_data = supabase.table("brands").select("name, organization_id").eq("id", brand_id).execute()
        if not brand_data.data:
            logger.error(f"Brand with ID {brand_id} not found")
            return
        
        brand_name = brand_data.data[0]["name"]
        organization_id = brand_data.data[0]["organization_id"]
        
        # Query the LLM
        result = await query_llm(query_text, brand_name, llm_type, llm_version)
        
        # Add metadata to result
        result_data = {
            "id": str(uuid.uuid4()),  # Generate UUID for the query
            "brand_id": brand_id,
            "topic_id": topic_id,
            "query_text": query_text,
            "llm_type": llm_type,
            "llm_version": llm_version,
            "llm_response": result["llm_response"],
            "brand_mentioned": result["brand_mentioned"],
            "sentiment_score": result["sentiment_score"],
            "ranking_position": result["ranking_position"],
            "tokens_used": result["tokens_used"],
            "created_at": datetime.now().isoformat()
        }
        
        # Store in Supabase keyword_queries table for backward compatibility
        try:
            supabase.table("keyword_queries").insert(result_data).execute()
            logger.info(f"Successfully stored query result in keyword_queries table for task {task_id}")
        except Exception as e:
            logger.error(f"Error storing query result in keyword_queries table: {e}")
        
        # Store in new search_results table
        try:
            # Use our new rankings API endpoint to store the result
            user_id = organization_id  # Use organization_id as user_id for now
            with get_db_cursor(commit=True) as cursor:
                query = """
                    INSERT INTO search_results 
                    (user_id, keyword, brand_name, found, response_text, rank, confidence)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """
                cursor.execute(query, (
                    user_id, 
                    query_text,
                    brand_name,
                    result["brand_mentioned"],
                    result["llm_response"],
                    result["ranking_position"],
                    result["sentiment_score"]
                ))
                
                logger.info(f"Successfully stored query result in search_results table for task {task_id}")
        except Exception as e:
            logger.error(f"Error storing query result in search_results table: {e}")
        
        # Also add to result queue for background processing if it exists
        if 'result_queue' in globals():
            await result_queue.add_result(result_data)
        
        # Update the task's last_run and next_run times
        try:
            next_run = datetime.now() + timedelta(minutes=int(supabase.table("monitoring_tasks").select("frequency_minutes").eq("id", task_id).execute().data[0]["frequency_minutes"]))
            supabase.table("monitoring_tasks").update({"last_run": datetime.now().isoformat(), "next_run": next_run.isoformat()}).eq("id", task_id).execute()
        except Exception as e:
            logger.error(f"Error updating task run times: {e}")
        
        logger.info(f"Successfully executed monitoring task {task_id}")
    
    except Exception as e:
        logger.error(f"Error executing monitoring task {task_id}: {e}")
        raise

# API Routes
@app.post("/tasks/", response_model=TaskResponse)
async def create_monitoring_task(task: MonitoringTask, background_tasks: BackgroundTasks):
    """Create a new monitoring task with cost estimation"""
    try:
        # If using OpenAI, automatically select optimal model based on query length
        if task.llm_type.lower() == "openai":
            recommended_type, recommended_version = select_optimal_model(task.query_text)
            if recommended_version != task.llm_version:
                logger.info(f"Optimizing model selection: Using {recommended_version} instead of {task.llm_version}")
                task.llm_version = recommended_version
        
        # Estimate monthly cost based on frequency
        queries_per_month = (30 * 24 * 60) / task.frequency_minutes
        cost_per_query = LLMCosts.estimate_cost(task.llm_type, task.llm_version)
        estimated_monthly_cost = queries_per_month * cost_per_query
        
        # Get organization's monthly budget
        monthly_budget = float(os.getenv("MONTHLY_BUDGET", "100.0"))  # Default $100/month
        
        # Check if this would exceed budget
        current_tasks = supabase.table("monitoring_tasks").select("*").eq("active", True).execute()
        current_monthly_cost = sum(
            (30 * 24 * 60) / task["frequency_minutes"] * LLMCosts.estimate_cost(task["llm_type"], task["llm_version"])
            for task in current_tasks.data
        )
        
        if current_monthly_cost + estimated_monthly_cost > monthly_budget:
            recommended_platform, recommended_model = LLMCosts.recommend_model()
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Monthly budget would be exceeded",
                    "current_cost": current_monthly_cost,
                    "additional_cost": estimated_monthly_cost,
                    "budget": monthly_budget,
                    "recommendation": f"Consider using {recommended_platform} {recommended_model} or reducing frequency"
                }
            )
        
        # Validate brand_id
        brand_check = supabase.table("brands").select("name").eq("id", task.brand_id).execute()
        if not brand_check.data:
            raise HTTPException(status_code=404, detail=f"Brand with ID {task.brand_id} not found")
        
        # Validate topic_id if provided
        if task.topic_id:
            topic_check = supabase.table("topics").select("name").eq("id", task.topic_id).execute()
            if not topic_check.data:
                raise HTTPException(status_code=404, detail=f"Topic with ID {task.topic_id} not found")
        
        # Generate a unique task ID
        task_id = str(uuid.uuid4())
        
        # Store task in Supabase
        supabase.table("monitoring_tasks").insert({
            "id": task_id,
            "brand_id": task.brand_id,
            "query_text": task.query_text,
            "topic_id": task.topic_id,
            "frequency_minutes": task.frequency_minutes,
            "llm_type": task.llm_type,
            "llm_version": task.llm_version,
            "active": task.active,
            "last_run": None,
            "next_run": datetime.now().isoformat()
        }).execute()
        
        # Schedule the task
        if task.active:
            next_run = datetime.now() + timedelta(seconds=10)  # First run in 10 seconds
            
            # Add job to scheduler
            scheduler.add_job(
                execute_monitoring_task,
                "interval",
                minutes=task.frequency_minutes,
                next_run_time=next_run,
                id=task_id,
                args=[task_id, task.brand_id, task.query_text, task.topic_id, task.llm_type, task.llm_version]
            )
            
            # Also run immediately in background
            background_tasks.add_task(
                execute_monitoring_task, 
                task_id, 
                task.brand_id, 
                task.query_text, 
                task.topic_id, 
                task.llm_type, 
                task.llm_version
            )
        
        return {
            "task_id": task_id,
            "brand_id": task.brand_id,
            "query_text": task.query_text,
            "next_run": next_run.isoformat() if task.active else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating monitoring task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tasks/")
async def list_monitoring_tasks(brand_id: Optional[str] = None, active_only: bool = False):
    """List all monitoring tasks, optionally filtered by brand_id and active status"""
    try:
        query = supabase.table("monitoring_tasks").select("*")
        
        if brand_id:
            query = query.eq("brand_id", brand_id)
        
        if active_only:
            query = query.eq("active", True)
        
        result = query.order("created_at", desc=True).execute()
        
        return result.data
    
    except Exception as e:
        logger.error(f"Error listing monitoring tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tasks/{task_id}")
async def get_monitoring_task(task_id: str):
    """Get a specific monitoring task by ID"""
    try:
        result = supabase.table("monitoring_tasks").select("*").eq("id", task_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail=f"Task with ID {task_id} not found")
        
        return result.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting monitoring task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/tasks/{task_id}")
async def delete_monitoring_task(task_id: str):
    """Delete a monitoring task"""
    try:
        # Check if task exists
        task_check = supabase.table("monitoring_tasks").select("id").eq("id", task_id).execute()
        if not task_check.data:
            raise HTTPException(status_code=404, detail=f"Task with ID {task_id} not found")
        
        # Remove from scheduler if active
        if scheduler.get_job(task_id):
            scheduler.remove_job(task_id)
        
        # Delete from database
        supabase.table("monitoring_tasks").delete().eq("id", task_id).execute()
        
        return {"message": f"Task {task_id} deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting monitoring task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/tasks/{task_id}")
async def update_monitoring_task(task_id: str, task_update: Dict[str, Any]):
    """Update a monitoring task"""
    try:
        # Check if task exists
        task_check = supabase.table("monitoring_tasks").select("*").eq("id", task_id).execute()
        if not task_check.data:
            raise HTTPException(status_code=404, detail=f"Task with ID {task_id} not found")
        
        current_task = task_check.data[0]
        
        # Update the task in database
        supabase.table("monitoring_tasks").update(task_update).eq("id", task_id).execute()
        
        # Update scheduler if needed
        schedule_update_needed = False
        
        for key in ["frequency_minutes", "active", "llm_type", "llm_version", "query_text"]:
            if key in task_update and task_update[key] != current_task.get(key):
                schedule_update_needed = True
                break
        
        if schedule_update_needed:
            # Remove existing job
            if scheduler.get_job(task_id):
                scheduler.remove_job(task_id)
            
            # Add updated job if active
            if task_update.get("active", current_task.get("active", True)):
                # Merge current task with updates
                updated_task = {**current_task, **task_update}
                
                next_run = datetime.now() + timedelta(minutes=1)
                
                scheduler.add_job(
                    execute_monitoring_task,
                    "interval",
                    minutes=updated_task["frequency_minutes"],
                    next_run_time=next_run,
                    id=task_id,
                    args=[
                        task_id, 
                        updated_task["brand_id"], 
                        updated_task["query_text"], 
                        updated_task.get("topic_id"), 
                        updated_task["llm_type"], 
                        updated_task["llm_version"]
                    ]
                )
        
        return {"message": f"Task {task_id} updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating monitoring task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/results/", response_model=List[QueryResult])
async def get_query_results(
    brand_id: Optional[str] = None, 
    topic_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """Get query results, optionally filtered by brand_id and topic_id"""
    try:
        query = supabase.table("keyword_queries").select("*")
        
        if brand_id:
            query = query.eq("brand_id", brand_id)
        
        if topic_id:
            query = query.eq("topic_id", topic_id)
        
        result = query.order("created_at", desc=True).limit(limit).offset(offset).execute()
        
        return result.data
    
    except Exception as e:
        logger.error(f"Error getting query results: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/{brand_id}")
async def get_brand_analytics(brand_id: str, timeframe: str = "30d"):
    """Get analytics for a brand over a specific timeframe"""
    try:
        # Validate brand_id
        brand_check = supabase.table("brands").select("name").eq("id", brand_id).execute()
        if not brand_check.data:
            raise HTTPException(status_code=404, detail=f"Brand with ID {brand_id} not found")
        
        # Calculate timeframe start date
        now = datetime.now()
        if timeframe == "7d":
            start_date = now - timedelta(days=7)
        elif timeframe == "30d":
            start_date = now - timedelta(days=30)
        elif timeframe == "90d":
            start_date = now - timedelta(days=90)
        else:
            raise HTTPException(status_code=400, detail=f"Invalid timeframe: {timeframe}. Must be 7d, 30d, or 90d")
        
        # Get queries for the brand in the timeframe
        queries = supabase.table("keyword_queries") \
            .select("*") \
            .eq("brand_id", brand_id) \
            .gte("created_at", start_date.isoformat()) \
            .order("created_at", desc=False) \
            .execute()
        
        if not queries.data:
            return {
                "total_queries": 0,
                "mention_rate": 0,
                "avg_position": 0,
                "avg_sentiment": 0,
                "position_trend": "stable",
                "queries_by_day": []
            }
        
        # Calculate analytics
        total_queries = len(queries.data)
        mentioned_queries = sum(1 for q in queries.data if q.get("brand_mentioned", False))
        mention_rate = mentioned_queries / total_queries if total_queries > 0 else 0
        
        positions = [q.get("ranking_position", 0) for q in queries.data if q.get("brand_mentioned", False)]
        sentiments = [q.get("sentiment_score", 0) for q in queries.data if q.get("brand_mentioned", False)]
        
        avg_position = sum(positions) / len(positions) if positions else 0
        avg_sentiment = sum(sentiments) / len(sentiments) if sentiments else 0
        
        # Group by day
        queries_by_day = {}
        for q in queries.data:
            date = q.get("created_at", "").split("T")[0]
            if date:
                if date not in queries_by_day:
                    queries_by_day[date] = {
                        "count": 0,
                        "mentions": 0,
                        "positions": [],
                        "sentiments": []
                    }
                
                queries_by_day[date]["count"] += 1
                
                if q.get("brand_mentioned", False):
                    queries_by_day[date]["mentions"] += 1
                    if q.get("ranking_position", 0) > 0:
                        queries_by_day[date]["positions"].append(q.get("ranking_position", 0))
                    queries_by_day[date]["sentiments"].append(q.get("sentiment_score", 0))
        
        # Calculate daily averages
        daily_data = []
        for date, data in sorted(queries_by_day.items()):
            daily_data.append({
                "date": date,
                "count": data["count"],
                "mentions": data["mentions"],
                "mention_rate": data["mentions"] / data["count"] if data["count"] > 0 else 0,
                "avg_position": sum(data["positions"]) / len(data["positions"]) if data["positions"] else 0,
                "avg_sentiment": sum(data["sentiments"]) / len(data["sentiments"]) if data["sentiments"] else 0
            })
        
        # Determine position trend
        position_trend = "stable"
        if len(daily_data) >= 2:
            first_half = daily_data[:len(daily_data)//2]
            second_half = daily_data[len(daily_data)//2:]
            
            first_half_avg = sum(d.get("avg_position", 0) for d in first_half) / len(first_half) if first_half else 0
            second_half_avg = sum(d.get("avg_position", 0) for d in second_half) / len(second_half) if second_half else 0
            
            if second_half_avg < first_half_avg - 0.5:  # Lower is better
                position_trend = "up"
            elif second_half_avg > first_half_avg + 0.5:
                position_trend = "down"
        
        return {
            "total_queries": total_queries,
            "mention_rate": mention_rate,
            "avg_position": avg_position,
            "avg_sentiment": avg_sentiment,
            "position_trend": position_trend,
            "daily_data": daily_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting brand analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    scheduler_jobs = len(scheduler.get_jobs())
    return {
        "status": "healthy",
        "active_jobs": scheduler_jobs,
        "api_usage": api_limits.usage
    }

# Add initialization endpoint
@app.get("/initialize-db")
async def initialize_database():
    """Initialize database tables manually"""
    try:
        from .usage_manager import init_supabase_tables
        init_supabase_tables(supabase)
        return {"status": "success", "message": "Database tables initialized successfully"}
    except Exception as e:
        logger.error(f"Error initializing database tables: {e}")
        return {"status": "error", "message": str(e)}

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize resources on startup"""
    # Skip automatic Supabase table initialization
    logger.info("Skipping automatic table initialization. Use the /initialize-db endpoint to initialize tables.")
        
    # Initialize Redis
    try:
        await redis.ping()
        logger.info("Redis connection successful")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}")
        
    # Start scheduled tasks
    try:
        # Recover active monitoring tasks and schedule them
        result = supabase.table("monitoring_tasks").select("*").eq("active", True).execute()
        active_tasks = result.data
        
        logger.info(f"Recovered {len(active_tasks)} active monitoring tasks")
        
        for task in active_tasks:
            # Calculate next run
            if task.get("next_run"):
                next_run = datetime.fromisoformat(task["next_run"].replace("Z", "+00:00"))
            else:
                next_run = datetime.now() + timedelta(minutes=1)  # Start soon after startup
            
            # Schedule the task
            scheduler.add_job(
                execute_monitoring_task,
                "date",
                run_date=next_run,
                args=[
                    task["id"],
                    task["brand_id"],
                    task["query_text"],
                    task.get("topic_id"),
                    task["llm_type"],
                    task["llm_version"]
                ],
                id=f"task_{task['id']}",
                replace_existing=True
            )
            
            logger.info(f"Scheduled task {task['id']} for {next_run}")
        
        # Schedule routine maintenance jobs
        scheduler.add_job(
            usage_manager.check_usage,
            "interval",
            hours=6,
            id="usage_check",
            replace_existing=True
        )
        
        # Start the scheduler
        scheduler.start()
        logger.info("Scheduler started")
    except Exception as e:
        logger.error(f"Error initializing scheduler: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown the scheduler and flush queue"""
    scheduler.shutdown()
    await result_queue.flush_to_database()
    logger.info("Scheduler shut down and queue flushed")

# Add new endpoint to get available models and costs
@app.get("/llm/models")
async def get_available_models():
    """Get available LLM models and their cost estimates"""
    models = LLMCosts.get_available_models()
    
    # Add cost estimates for standard query length
    model_costs = {}
    for platform, platform_models in models.items():
        model_costs[platform] = {
            model: {
                "cost_estimate": LLMCosts.estimate_cost(platform, model),
                "features": {
                    "context_length": "8K" if "3.5" in model else "32K",
                    "capabilities": "Basic" if any(x in model.lower() for x in ["3.5", "instant"]) else "Advanced"
                }
            }
            for model in platform_models
        }
    
    return {
        "models": model_costs,
        "cost_threshold": float(os.getenv("MAX_QUERY_COST", "0.10")),
        "recommendation": LLMCosts.recommend_model()
    }

# Add new endpoint for cost optimization insights
@app.get("/analytics/cost-optimization")
async def get_cost_optimization_insights():
    """Get insights and recommendations for cost optimization"""
    stats = cost_optimizer.get_optimization_stats()
    
    # Calculate potential savings
    total_spend = sum(
        len(history) * LLMCosts.estimate_cost(key.split(':')[0], key.split(':')[1])
        for key, history in cost_optimizer.usage_history.items()
    )
    
    return {
        "current_stats": stats,
        "total_spend_24h": total_spend,
        "total_savings_24h": stats['cost_savings'],
        "savings_percentage": (stats['cost_savings'] / total_spend * 100) if total_spend > 0 else 0,
        "optimization_score": sum(
            stats['cache_efficiency'].get(key, {}).get('hit_rate', 0)
            for key in cost_optimizer.usage_history.keys()
        ) / len(cost_optimizer.usage_history) if cost_optimizer.usage_history else 0
    }

def select_optimal_model(query_text: str) -> Tuple[str, str]:
    """
    Analyze query length and select the most cost-effective OpenAI model.
    Returns a tuple of (llm_type, llm_version)
    """
    # Count words in query
    word_count = len(query_text.split())
    
    # For very short queries (under 50 words), use ada
    if word_count < 50:
        return "openai", "text-ada-001"
    
    # For medium queries (under 200 words), use gpt-3.5-turbo
    elif word_count < 200:
        return "openai", "gpt-3.5-turbo"
    
    # For longer or more complex queries, use gpt-4
    else:
        return "openai", "gpt-4"

# Add new endpoint for cost forecast
@app.get("/analytics/cost-forecast")
async def get_cost_forecast(days: int = 30):
    """Get cost forecast for the specified number of days"""
    try:
        forecast = await cost_forecaster.forecast_costs(days)
        return forecast
    except Exception as e:
        logger.error(f"Error getting cost forecast: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/set-budget")
async def set_budget(settings: UsageSettings):
    """Set or update budget settings"""
    try:
        result = await usage_manager.set_usage_alert(settings)
        return result
    except Exception as e:
        logger.error(f"Error setting budget: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/budget")
async def get_budget():
    """Get current budget settings"""
    try:
        settings = await usage_manager.get_usage_settings()
        return settings
    except Exception as e:
        logger.error(f"Error getting budget settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Add new endpoints after your existing endpoints

@app.get("/analytics/usage-forecast")
async def get_usage_forecast(days: int = 30):
    """Get usage forecast for the specified number of days"""
    try:
        forecast = await usage_manager.forecast_usage(days)
        return forecast
    except Exception as e:
        logger.error(f"Error getting usage forecast: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/usage-trends")
async def get_usage_trends(days: int = 30):
    """Get daily usage trends"""
    try:
        stats = await usage_manager.get_usage_stats(days)
        return {
            "daily_usage": stats["daily_usage"],
            "total_usage_percent": stats["usage_percent"],
            "days_analyzed": stats["days_analyzed"]
        }
    except Exception as e:
        logger.error(f"Error getting usage trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/set-usage-alert")
async def set_usage_alert(settings: UsageSettings):
    """Set or update usage alert settings"""
    try:
        result = await usage_manager.set_usage_alert(settings)
        return result
    except Exception as e:
        logger.error(f"Error setting usage alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/cost")
async def get_admin_costs(days: int = 30):
    """Get internal cost tracking (admin only)"""
    try:
        costs = await usage_manager.get_internal_costs(days)
        return costs
    except Exception as e:
        logger.error(f"Error getting admin costs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Add test endpoint for simulating queries
@app.post("/simulate-queries")
async def simulate_queries():
    """Simulate 5,000 queries to test usage tracking and alerts"""
    try:
        # First, set up an alert threshold
        alert_settings = UsageSettings(
            alert_threshold=0.8,  # 80% threshold
            email_notifications=True,
            plan_queries=6000,  # Set plan limit to 6000 queries
            plan_cost=50.0
        )
        await usage_manager.set_usage_alert(alert_settings)
        
        # Generate test queries
        test_queries = []
        for i in range(5000):
            test_queries.append({
                "id": str(uuid.uuid4()),
                "brand_id": "test_brand_1",  # You'll need to use a real brand_id from your database
                "topic_id": None,
                "query_text": f"Test query {i}",
                "llm_type": "openai",
                "llm_version": "gpt-4",
                "llm_response": "Sample response",
                "brand_mentioned": True,
                "sentiment_score": 0.8,
                "ranking_position": 1,
                "tokens_used": 100,  # Fixed token usage per query
                "created_at": datetime.now().isoformat()
            })
        
        # Insert in batches of 100 to avoid timeouts
        for i in range(0, len(test_queries), 100):
            batch = test_queries[i:i + 100]
            try:
                supabase.table("keyword_queries").insert(batch).execute()
                logger.info(f"Inserted batch {i//100 + 1} of test queries")
            except Exception as e:
                logger.error(f"Error inserting batch {i//100 + 1}: {e}")
                raise
        
        # Trigger usage check
        await usage_manager.check_usage()
        
        # Get current usage stats
        stats = await usage_manager.get_usage_stats()
        
        return {
            "message": "Test queries simulated successfully",
            "queries_inserted": len(test_queries),
            "current_usage": stats
        }
    
    except Exception as e:
        logger.error(f"Error simulating queries: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Add test endpoint for Supabase connection
@app.get("/api-key-test")
async def test_supabase_connection():
    """Test Supabase connection and API key"""
    try:
        # Try to query the alerts table
        result = supabase.table("alerts").select("*").limit(1).execute()
        logger.info("Successfully connected to Supabase")
        return {
            "status": "success",
            "message": "Successfully connected to Supabase",
            "supabase_url": supabase_url,
            "tables_available": [
                "keyword_queries",
                "alerts",
                "sent_alerts"
            ]
        }
    except Exception as e:
        logger.error(f"Error connecting to Supabase: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": f"Failed to connect to Supabase: {str(e)}",
                "supabase_url": supabase_url
            }
        )

# Add security utilities
security = HTTPBasic()
USERNAME = "marketer"
PASSWORD = "password123"

def verify_auth(credentials: HTTPBasicCredentials = Depends(security)):
    """Verify HTTP basic auth credentials"""
    is_username = secrets.compare_digest(credentials.username, USERNAME)
    is_password = secrets.compare_digest(credentials.password, PASSWORD)
    if not (is_username and is_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except WebSocketDisconnect:
                self.disconnect(connection)

manager = ConnectionManager()

# Dashboard endpoints
@app.get("/dashboard/usage-trends", response_model=Dict[str, Any])
async def get_usage_trends(username: str = Depends(verify_auth)):
    """Get daily usage trends for the last 30 days"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        # Get plan queries limit from alerts
        alerts_result = supabase.table("alerts").select("plan_queries").limit(1).execute()
        plan_queries = alerts_result.data[0]["plan_queries"] if alerts_result.data else 10000
        
        # Get daily query counts
        result = supabase.table("keyword_queries") \
            .select("created_at") \
            .gte("created_at", start_date.isoformat()) \
            .lte("created_at", end_date.isoformat()) \
            .execute()
        
        # Group by day
        daily_counts = {}
        for item in result.data:
            date = item["created_at"].split("T")[0]
            daily_counts[date] = daily_counts.get(date, 0) + 1
        
        # Calculate percentages
        daily_percentages = {
            date: (count / plan_queries) * 100
            for date, count in daily_counts.items()
        }
        
        return {
            "daily_usage": dict(sorted(daily_percentages.items())),
            "total_queries": len(result.data),
            "plan_queries": plan_queries
        }
    except Exception as e:
        logger.error(f"Error getting usage trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dashboard/alert-history")
async def get_alert_history(username: str = Depends(verify_auth)):
    """Get the last 10 sent alerts"""
    try:
        result = supabase.table("sent_alerts") \
            .select("*") \
            .order("sent_at", desc=True) \
            .limit(10) \
            .execute()
        
        return result.data
    except Exception as e:
        logger.error(f"Error getting alert history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dashboard/cost-projection")
async def get_cost_projection(username: str = Depends(verify_auth)):
    """Get cost projection based on current usage"""
    try:
        # Get plan cost and queries from alerts
        alerts_result = supabase.table("alerts").select("*").limit(1).execute()
        if not alerts_result.data:
            return {"error": "No plan settings found"}
        
        plan_settings = alerts_result.data[0]
        plan_cost = plan_settings["plan_cost"]
        plan_queries = plan_settings["plan_queries"]
        
        # Get query count for last 30 days
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        result = supabase.table("keyword_queries") \
            .select("*") \
            .gte("created_at", start_date.isoformat()) \
            .execute()
        
        total_queries = len(result.data)
        usage_percent = (total_queries / plan_queries) * 100
        value_received = (usage_percent / 100) * plan_cost
        
        return {
            "plan_cost": plan_cost,
            "value_received": round(value_received, 2),
            "usage_percent": round(usage_percent, 2),
            "total_queries": total_queries,
            "plan_queries": plan_queries
        }
    except Exception as e:
        logger.error(f"Error getting cost projection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Check for updates every 5 seconds
            await asyncio.sleep(5)
            
            # Get latest data
            supabase = get_db()
            usage = supabase.table("usage_trends").select("*").execute()
            alerts = supabase.table("alert_history").select("*").order("timestamp.desc").limit(1).execute()
            costs = supabase.table("cost_projections").select("*").execute()
            
            # Send updates
            await websocket.send_json({
                "usage": usage.data[0] if usage.data else None,
                "latest_alert": alerts.data[0] if alerts.data else None,
                "costs": costs.data[0] if costs.data else None
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Update CORS settings for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the secure data API router
app.include_router(secure_data_api_router)
# Include the dashboard router
app.include_router(dashboard_router)
# Include the ranking API router
app.include_router(ranking_api_router)

# If this file is run directly, start the app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 