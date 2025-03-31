import os
import logging
from datetime import datetime, timedelta
import httpx
from supabase import create_client
from dotenv import load_dotenv
from celery import shared_task

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='logs/celery_tasks.log',
    filemode='a'
)
logger = logging.getLogger('celery.tasks')

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables")

supabase = create_client(supabase_url, supabase_key)

@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def execute_monitoring_task(self, task_id, brand_id, query_text, topic_id=None, llm_type="openai", llm_version="gpt-4"):
    """
    Execute a monitoring task asynchronously
    
    This task will:
    1. Query the LLM with the specified parameters
    2. Save the results to the database
    3. Update the monitoring task record with the latest execution time
    """
    try:
        logger.info(f"Executing monitoring task {task_id} for brand {brand_id}")
        
        # Get brand details from database
        brand_response = supabase.table('brands').select('*').eq('id', brand_id).execute()
        
        if not brand_response.data or len(brand_response.data) == 0:
            logger.error(f"Brand {brand_id} not found")
            return {"error": f"Brand {brand_id} not found"}
        
        brand = brand_response.data[0]
        brand_name = brand.get('name', '')
        
        # Perform LLM query
        result = query_llm(query_text, brand_name, llm_type, llm_version)
        
        if result.get('error'):
            logger.error(f"Error executing task {task_id}: {result['error']}")
            raise Exception(result['error'])
        
        # Save results to database
        result_data = {
            'task_id': task_id,
            'brand_id': brand_id,
            'query_text': query_text,
            'llm_response': result.get('content', ''),
            'brand_mentioned': result.get('brand_mentioned', False),
            'sentiment_score': result.get('sentiment_score', 0),
            'ranking_position': result.get('ranking_position', 0),
            'topic_id': topic_id,
            'llm_type': llm_type,
            'llm_version': llm_version,
            'execution_time_ms': result.get('execution_time_ms', 0),
            'token_count': result.get('token_count', 0),
            'created_at': datetime.now().isoformat()
        }
        
        supabase.table('query_results').insert(result_data).execute()
        
        # Update last execution time for task
        supabase.table('monitoring_tasks').update({
            'last_executed_at': datetime.now().isoformat()
        }).eq('id', task_id).execute()
        
        # Log task execution
        log_data = {
            'task_id': task_id,
            'brand_id': brand_id,
            'query_text': query_text,
            'status': 'success',
            'created_at': datetime.now().isoformat()
        }
        supabase.table('logs').insert(log_data).execute()
        
        return result
        
    except Exception as e:
        logger.error(f"Error executing task {task_id}: {str(e)}")
        # Log error
        log_data = {
            'task_id': task_id,
            'brand_id': brand_id,
            'query_text': query_text,
            'status': 'error',
            'error_message': str(e),
            'created_at': datetime.now().isoformat()
        }
        supabase.table('logs').insert(log_data).execute()
        
        # Retry with exponential backoff
        self.retry(exc=e)

@shared_task
def generate_daily_reports():
    """
    Generate and send daily reports for all active brands
    """
    try:
        logger.info("Generating daily reports")
        
        # Get all active brands
        brands_response = supabase.table('brands').select('*').eq('active', True).execute()
        
        if not brands_response.data:
            logger.info("No active brands found")
            return
        
        for brand in brands_response.data:
            brand_id = brand['id']
            brand_name = brand['name']
            
            # Get query results for last 24 hours
            yesterday = (datetime.now() - timedelta(days=1)).isoformat()
            results = supabase.table('query_results')\
                .select('*')\
                .eq('brand_id', brand_id)\
                .gte('created_at', yesterday)\
                .order('created_at', desc=True)\
                .execute()
            
            if not results.data:
                logger.info(f"No results found for brand {brand_name} in the last 24 hours")
                continue
                
            # Generate report
            generate_and_send_report.delay(brand_id, results.data)
    
    except Exception as e:
        logger.error(f"Error generating daily reports: {str(e)}")

@shared_task
def generate_and_send_report(brand_id, results_data):
    """
    Generate a report for a brand and send it via email
    """
    try:
        # Get brand details
        brand_response = supabase.table('brands').select('*').eq('id', brand_id).execute()
        
        if not brand_response.data:
            logger.error(f"Brand {brand_id} not found")
            return
            
        brand = brand_response.data[0]
        brand_name = brand['name']
        brand_email = brand.get('email')
        
        if not brand_email:
            logger.error(f"No email found for brand {brand_name}")
            return
            
        # Generate report content
        report_content = generate_report_content(brand_name, results_data)
        
        # Save report to database
        report_data = {
            'brand_id': brand_id,
            'content': report_content,
            'created_at': datetime.now().isoformat()
        }
        report_response = supabase.table('reports').insert(report_data).execute()
        
        if report_response.data:
            report_id = report_response.data[0]['id']
            
            # Send email with report
            if os.getenv('SENDGRID_API_KEY'):
                send_report_email(brand_email, brand_name, report_content, report_id)
            else:
                logger.warning("SENDGRID_API_KEY not set. Email not sent.")
    
    except Exception as e:
        logger.error(f"Error generating report for brand {brand_id}: {str(e)}")

@shared_task
def cleanup_old_results():
    """
    Clean up old query results and logs to prevent database bloat
    """
    try:
        logger.info("Cleaning up old results and logs")
        
        # Delete query results older than 90 days
        ninety_days_ago = (datetime.now() - timedelta(days=90)).isoformat()
        supabase.table('query_results').delete().lt('created_at', ninety_days_ago).execute()
        
        # Delete logs older than 30 days
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
        supabase.table('logs').delete().lt('created_at', thirty_days_ago).execute()
        
    except Exception as e:
        logger.error(f"Error cleaning up old results: {str(e)}")

def query_llm(query_text, brand_name, llm_type="openai", llm_version="gpt-4"):
    """
    Query the LLM service
    """
    # Implementation depends on the LLM service being used
    # This is a placeholder for the actual implementation
    
    openai_api_key = os.getenv("OPENAI_API_KEY")
    google_ai_api_key = os.getenv("GOOGLE_AI_API_KEY")
    perplexity_api_key = os.getenv("PERPLEXITY_API_KEY")
    
    try:
        # Choose API based on llm_type
        if llm_type == "openai" and openai_api_key:
            return query_openai(query_text, brand_name, llm_version, openai_api_key)
        elif llm_type == "google" and google_ai_api_key:
            return query_google_ai(query_text, brand_name, llm_version, google_ai_api_key)
        elif llm_type == "perplexity" and perplexity_api_key:
            return query_perplexity(query_text, brand_name, perplexity_api_key)
        else:
            return {"error": f"Invalid LLM type or missing API key: {llm_type}"}
    
    except Exception as e:
        logger.error(f"Error querying LLM: {str(e)}")
        return {"error": str(e)}

def query_openai(query_text, brand_name, model_version, api_key):
    """
    Query OpenAI API
    """
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model_version,
                    "messages": [
                        {"role": "system", "content": f"You are analyzing search results for the brand '{brand_name}'. Determine if the brand is mentioned, the sentiment, and approximate ranking position."},
                        {"role": "user", "content": query_text}
                    ],
                    "temperature": 0.7
                }
            )
            
            result = response.json()
            
            # Extract content from response
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            # Simple analysis (would be more sophisticated in production)
            brand_mentioned = brand_name.lower() in content.lower()
            sentiment_score = 0  # Neutral default
            ranking_position = 0
            
            if brand_mentioned:
                # Simple sentiment analysis
                positive_words = ["good", "great", "excellent", "best", "top", "leading", "recommended"]
                negative_words = ["bad", "poor", "worst", "avoid", "terrible", "disappointing"]
                
                positive_count = sum(1 for word in positive_words if word in content.lower())
                negative_count = sum(1 for word in negative_words if word in content.lower())
                
                sentiment_score = (positive_count - negative_count) / max(1, positive_count + negative_count)
                
                # Simple ranking extraction (would be more sophisticated in production)
                if "#1" in content or "number one" in content.lower() or "first place" in content.lower():
                    ranking_position = 1
                elif "#2" in content or "number two" in content.lower() or "second place" in content.lower():
                    ranking_position = 2
                elif "#3" in content or "number three" in content.lower() or "third place" in content.lower():
                    ranking_position = 3
            
            # Get token usage
            token_count = result.get("usage", {}).get("total_tokens", 0)
            
            return {
                "content": content,
                "brand_mentioned": brand_mentioned,
                "sentiment_score": sentiment_score,
                "ranking_position": ranking_position,
                "token_count": token_count,
                "execution_time_ms": 0  # Would track actual execution time in production
            }
    
    except Exception as e:
        logger.error(f"Error querying OpenAI: {str(e)}")
        return {"error": str(e)}

def query_google_ai(query_text, brand_name, model_version, api_key):
    """
    Query Google AI API
    """
    # Implementation for Google AI
    # Placeholder for actual implementation
    return {"error": "Google AI implementation not yet available"}

def query_perplexity(query_text, brand_name, api_key):
    """
    Query Perplexity API
    """
    # Implementation for Perplexity
    # Placeholder for actual implementation
    return {"error": "Perplexity implementation not yet available"}

def generate_report_content(brand_name, results_data):
    """
    Generate report content from query results
    """
    # Simple report generation (would be more sophisticated in production)
    total_queries = len(results_data)
    mentioned_count = sum(1 for result in results_data if result.get('brand_mentioned', False))
    avg_sentiment = sum(result.get('sentiment_score', 0) for result in results_data) / max(1, total_queries)
    
    report = f"""
    # Daily Report for {brand_name}
    
    ## Summary
    - Total queries analyzed: {total_queries}
    - Brand mentioned: {mentioned_count} times ({(mentioned_count/total_queries)*100:.1f}%)
    - Average sentiment: {avg_sentiment:.2f} (-1 to 1 scale)
    
    ## Details
    """
    
    for result in results_data[:10]:  # First 10 results
        report += f"""
    ### Query: "{result.get('query_text', '')}"
    - Brand mentioned: {"Yes" if result.get('brand_mentioned', False) else "No"}
    - Sentiment: {result.get('sentiment_score', 0):.2f}
    - Ranking position: {result.get('ranking_position', 0)}
    - Date: {result.get('created_at', '')}
    """
    
    return report

def send_report_email(email, brand_name, report_content, report_id):
    """
    Send email with report using SendGrid
    """
    # Implementation would use SendGrid API
    # Placeholder for actual implementation
    logger.info(f"Email would be sent to {email} for brand {brand_name} with report ID {report_id}")
    return True 