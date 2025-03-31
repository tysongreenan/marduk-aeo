from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, WebSocket, WebSocketDisconnect, Security, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from typing import Dict, Any, List, Optional
import random
import sqlite3
import os
import json
import hashlib
from datetime import datetime, timedelta
import statistics
from contextlib import contextmanager
import logging
import jwt
import bcrypt
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.executors.pool import ThreadPoolExecutor
from dotenv import load_dotenv
import asyncio

# Load environment variables
load_dotenv("monitoring/.env")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# JWT settings
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key") # In production, use a secure secret
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = 60 * 24  # 24 hours

# Security
security = HTTPBearer()

# Initialize FastAPI app
app = FastAPI(title="AEO Monitoring Service - Test Version")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", 
                  "http://localhost:5176", "http://localhost:5177", "http://localhost:5178", 
                  "http://localhost:5179", "http://localhost:5180"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup in-memory SQLite database
@contextmanager
def get_db_connection():
    conn = sqlite3.connect('test_forecast.db')  # Use file-based database
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# Initialize database (file-based)
db_file = 'test_forecast.db'  # Use file-based database

# Setup database tables
def init_db():
    """Initialize the database with required tables"""
    logger.info("Initializing database...")
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # API usage table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS api_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                brand_name TEXT,
                keyword TEXT,
                tokens_used INTEGER NOT NULL,
                found INTEGER NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)
        
        # User data table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                hashed_password TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            )
        """)
        
        # Brands and keywords table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS brands_keywords (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                brand_name TEXT NOT NULL,
                keywords TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # Alerts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                alert_type TEXT NOT NULL,
                message TEXT NOT NULL,
                usage_percentage REAL,
                date TEXT NOT NULL,
                dismissed INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # Search results table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS search_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                keyword TEXT NOT NULL,
                brand_name TEXT NOT NULL,
                found INTEGER NOT NULL DEFAULT 0,
                response_text TEXT,
                rank INTEGER,
                confidence REAL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        conn.commit()
        
    logger.info("Database initialized")

# Initialize database before app startup
init_db()

# Setup scheduler
scheduler = AsyncIOScheduler(
    jobstores={"default": MemoryJobStore()},
    executors={"default": ThreadPoolExecutor(20)},
    job_defaults={"coalesce": False, "max_instances": 3},
)

# Pydantic models
class UsageForecast(BaseModel):
    usage_percent: float
    days_analyzed: int
    confidence: float

class UsageSettings(BaseModel):
    """Usage alert settings model"""
    alert_threshold: float = Field(default=0.8, gt=0, le=1)
    email_notifications: bool = Field(default=True)
    plan_queries: int = Field(default=10000)
    plan_cost: float = Field(default=50.0)

class SimulateQueries(BaseModel):
    """Model for simulating queries"""
    user_id: int = 1
    brand_id: str = "brand_123"
    count: int
    llm_type: str = "openai"
    llm_version: str = "gpt-3.5-turbo"
    tokens_per_query: int = 500
    brand_mentioned_rate: float = 0.7

# Mock Supabase service
class MockSupabase:
    """Mock Supabase client for testing without real Supabase"""
    
    def table(self, table_name):
        """Start a query on a table"""
        return MockSupabaseQuery(table_name)
    
    def from_(self, table_name):
        """Alternative syntax for table"""
        return self.table(table_name)

class MockSupabaseQuery:
    """Mock Supabase query builder"""
    
    def __init__(self, table_name):
        self.table_name = table_name
        self.conditions = []
        self.selected_columns = "*"
        self.order_column = None
        self.order_desc = False
        self.limit_val = None
        self.offset_val = 0
    
    def select(self, columns="*"):
        """Select columns"""
        self.selected_columns = columns
        return self
    
    def eq(self, column, value):
        """Add equality condition"""
        self.conditions.append((column, "=", value))
        return self
    
    def gt(self, column, value):
        """Add greater than condition"""
        self.conditions.append((column, ">", value))
        return self
    
    def lt(self, column, value):
        """Add less than condition"""
        self.conditions.append((column, "<", value))
        return self
    
    def gte(self, column, value):
        """Add greater than or equal condition"""
        self.conditions.append((column, ">=", value))
        return self
    
    def lte(self, column, value):
        """Add less than or equal condition"""
        self.conditions.append((column, "<=", value))
        return self
    
    def order(self, column, desc=False):
        """Order results"""
        self.order_column = column
        self.order_desc = desc
        return self
    
    def limit(self, limit_val):
        """Limit results"""
        self.limit_val = limit_val
        return self
    
    def offset(self, offset_val):
        """Offset results"""
        self.offset_val = offset_val
        return self
    
    def insert(self, data):
        """Insert data"""
        self.data_to_insert = data if isinstance(data, list) else [data]
        return self
    
    def update(self, data):
        """Update data"""
        self.data_to_update = data
        return self
    
    def upsert(self, data):
        """Upsert data"""
        return self.insert(data)
    
    def delete(self):
        """Delete data"""
        self.is_delete = True
        return self
    
    def execute(self):
        """Execute the query"""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            if hasattr(self, 'data_to_insert'):
                # Handle insert
                for item in self.data_to_insert:
                    # Generate id if not provided
                    if 'id' not in item and self.table_name != 'users':
                        item['id'] = hashlib.md5(str(random.random()).encode()).hexdigest()
                    
                    # Add timestamps
                    if 'created_at' not in item:
                        item['created_at'] = datetime.now().isoformat()
                    
                    columns = ', '.join(item.keys())
                    placeholders = ', '.join(['?'] * len(item))
                    
                    query = f"INSERT INTO {self.table_name} ({columns}) VALUES ({placeholders})"
                    cursor.execute(query, list(item.values()))
                
                conn.commit()
                return MockSupabaseResult([dict(item) for item in self.data_to_insert])
            
            elif hasattr(self, 'data_to_update'):
                # Handle update
                set_clause = ', '.join([f"{k} = ?" for k in self.data_to_update.keys()])
                where_clause = self._build_where_clause()
                
                query = f"UPDATE {self.table_name} SET {set_clause}{where_clause}"
                params = list(self.data_to_update.values()) + self._get_where_params()
                
                cursor.execute(query, params)
                conn.commit()
                
                # Return updated rows
                return self._select_after_update(conn)
            
            elif hasattr(self, 'is_delete') and self.is_delete:
                # Handle delete
                where_clause = self._build_where_clause()
                query = f"DELETE FROM {self.table_name}{where_clause}"
                
                cursor.execute(query, self._get_where_params())
                conn.commit()
                
                return MockSupabaseResult([{"success": True}])
            
            else:
                # Handle select
                where_clause = self._build_where_clause()
                order_clause = ""
                if self.order_column:
                    direction = "DESC" if self.order_desc else "ASC"
                    order_clause = f" ORDER BY {self.order_column} {direction}"
                
                limit_clause = f" LIMIT {self.limit_val}" if self.limit_val else ""
                offset_clause = f" OFFSET {self.offset_val}" if self.offset_val else ""
                
                if self.selected_columns == "*":
                    select_clause = "*"
                else:
                    select_clause = self.selected_columns
                
                query = f"SELECT {select_clause} FROM {self.table_name}{where_clause}{order_clause}{limit_clause}{offset_clause}"
                
                cursor.execute(query, self._get_where_params())
                rows = cursor.fetchall()
                
                return MockSupabaseResult([dict(row) for row in rows])
    
    def _build_where_clause(self):
        """Build WHERE clause from conditions"""
        if not self.conditions:
            return ""
        
        clauses = []
        for column, op, _ in self.conditions:
            clauses.append(f"{column} {op} ?")
        
        return " WHERE " + " AND ".join(clauses)
    
    def _get_where_params(self):
        """Get parameters for WHERE clause"""
        return [value for _, _, value in self.conditions]
    
    def _select_after_update(self, conn):
        """Select rows after update"""
        cursor = conn.cursor()
        where_clause = self._build_where_clause()
        query = f"SELECT * FROM {self.table_name}{where_clause}"
        
        cursor.execute(query, self._get_where_params())
        rows = cursor.fetchall()
        
        return MockSupabaseResult([dict(row) for row in rows])

class MockSupabaseResult:
    """Mock Supabase result"""
    
    def __init__(self, data):
        self.data = data

# Initialize mock Supabase
supabase = MockSupabase()

# Usage manager for tracking and forecasting
class UsageManager:
    """Manage usage tracking and alerts for flat-fee model"""
    def __init__(self):
        self.sendgrid_key = os.getenv("SENDGRID_API_KEY")
        self.query_cost = 0.002  # $0.002 per query
    
    async def get_usage_stats(self, days: int = 30) -> Dict[str, Any]:
        """Get usage statistics for the specified number of days"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Get usage settings
            settings = await self.get_usage_settings()
            plan_queries = settings.plan_queries
            
            # Query usage from SQLite
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT created_at FROM results WHERE created_at >= ? AND created_at <= ?",
                    (start_date.isoformat(), end_date.isoformat())
                )
                
                results = cursor.fetchall()
            
            if not results:
                return {
                    "total_queries": 0,
                    "usage_percent": 0,
                    "days_analyzed": days,
                    "daily_usage": {}
                }
            
            total_queries = len(results)
            usage_percent = (total_queries / plan_queries) * 100
            
            # Group by day for trend analysis
            daily_usage = {}
            for result in results:
                date = result['created_at'].split('T')[0]
                if date not in daily_usage:
                    daily_usage[date] = 0
                daily_usage[date] += 1
            
            # Calculate daily percentages
            daily_percentages = {
                date: (count / plan_queries) * 100
                for date, count in daily_usage.items()
            }
            
            return {
                "total_queries": total_queries,
                "usage_percent": round(usage_percent, 2),
                "days_analyzed": days,
                "daily_usage": dict(sorted(daily_percentages.items()))
            }
        except Exception as e:
            logger.error(f"Error getting usage stats: {e}")
            raise
    
    async def forecast_usage(self, days: int = 30) -> Dict[str, Any]:
        """Forecast usage for the next N days"""
        try:
            current_stats = await self.get_usage_stats(days)
            
            if current_stats["days_analyzed"] == 0:
                return {
                    "usage_percent": 0,
                    "days_analyzed": 0,
                    "confidence": 0
                }
            
            # Calculate daily average with weighted recent data
            daily_usage = current_stats["daily_usage"]
            if not daily_usage:
                return {
                    "usage_percent": 0,
                    "days_analyzed": days,
                    "confidence": 0
                }
            
            # Weight recent days more heavily
            sorted_dates = sorted(daily_usage.keys())
            total_weight = 0
            weighted_sum = 0
            
            for i, date in enumerate(sorted_dates):
                weight = 1 + (i / len(sorted_dates))  # More recent days have higher weight
                weighted_sum += daily_usage[date] * weight
                total_weight += weight
            
            daily_avg_percent = weighted_sum / total_weight
            projected_percent = daily_avg_percent * (days / 30)  # Scale to forecast period
            
            # Calculate confidence based on data consistency
            values = list(daily_usage.values())
            std_dev = statistics.stdev(values) if len(values) > 1 else 0
            mean = statistics.mean(values)
            confidence = 1 - (std_dev / mean if mean > 0 else 0)
            confidence = max(min(confidence, 1), 0)  # Clamp between 0 and 1
            
            return {
                "usage_percent": round(projected_percent, 2),
                "days_analyzed": days,
                "confidence": round(confidence, 2)
            }
        except Exception as e:
            logger.error(f"Error forecasting usage: {e}")
            raise
    
    async def set_usage_alert(self, settings: UsageSettings) -> Dict[str, Any]:
        """Set or update usage alert settings"""
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    UPDATE alerts SET 
                    alert_threshold = ?,
                    email_notifications = ?,
                    plan_queries = ?,
                    plan_cost = ?,
                    updated_at = ?
                    WHERE id = 1
                    """,
                    (
                        settings.alert_threshold,
                        1 if settings.email_notifications else 0,
                        settings.plan_queries,
                        settings.plan_cost,
                        datetime.now().isoformat()
                    )
                )
                conn.commit()
            
            return await self.get_usage_settings()
        except Exception as e:
            logger.error(f"Error setting usage alert: {e}")
            raise
    
    async def get_usage_settings(self) -> UsageSettings:
        """Get current usage alert settings"""
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM alerts WHERE id = 1")
                result = cursor.fetchone()
            
            if not result:
                return UsageSettings()
            
            return UsageSettings(
                alert_threshold=result['alert_threshold'],
                email_notifications=bool(result['email_notifications']),
                plan_queries=result['plan_queries'],
                plan_cost=result['plan_cost']
            )
        except Exception as e:
            logger.error(f"Error getting usage settings: {e}")
            raise
    
    async def check_usage(self):
        """Check if current usage exceeds alert threshold"""
        try:
            settings = await self.get_usage_settings()
            stats = await self.get_usage_stats(30)
            
            if stats["usage_percent"] >= (settings.alert_threshold * 100):
                if settings.email_notifications and self.sendgrid_key:
                    await self._send_usage_alert(
                        usage_percent=stats["usage_percent"],
                        threshold_percent=settings.alert_threshold * 100
                    )
                
                logger.warning(f"Usage alert: Current usage ({stats['usage_percent']}%) exceeds {settings.alert_threshold*100}% threshold")
                
                # Save alert in the database for testing
                with get_db_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "CREATE TABLE IF NOT EXISTS sent_alerts (id INTEGER PRIMARY KEY, usage_percent REAL, threshold_percent REAL, sent_at TEXT)"
                    )
                    cursor.execute(
                        "INSERT INTO sent_alerts (usage_percent, threshold_percent, sent_at) VALUES (?, ?, ?)",
                        (stats["usage_percent"], settings.alert_threshold * 100, datetime.now().isoformat())
                    )
                    conn.commit()
        except Exception as e:
            logger.error(f"Error checking usage: {e}")
            raise
    
    async def _send_usage_alert(self, usage_percent: float, threshold_percent: float):
        """Send usage alert email via SendGrid"""
        logger.info(f"Would send email: Usage alert! {usage_percent:.1f}% usage exceeds {threshold_percent:.1f}% threshold")
        
        if not self.sendgrid_key:
            logger.warning("SendGrid API key not configured - email would not be sent")
            return
        
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail
            
            # Get user email
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT email FROM users WHERE id = 1")
                user = cursor.fetchone()
            
            if not user:
                logger.warning("No user found to send alert to")
                return
            
            message = Mail(
                from_email=os.getenv("ALERT_FROM_EMAIL", "alerts@airankbooster.com"),
                to_emails=user['email'],
                subject="Plan Usage Alert",
                html_content=f"""
                    <h2>Plan Usage Alert</h2>
                    <p>You've used {usage_percent:.1f}% of your plan this month!</p>
                    <p>Alert threshold: {threshold_percent:.1f}%</p>
                    <p>Maximize your value by reviewing your monitoring tasks.</p>
                """
            )
            
            sg = SendGridAPIClient(self.sendgrid_key)
            response = sg.send(message)
            logger.info(f"Usage alert email sent successfully: {response.status_code}")
        except Exception as e:
            logger.error(f"Error sending usage alert email: {e}")
    
    async def get_internal_costs(self, days: int = 30) -> Dict[str, Any]:
        """Get internal cost tracking (admin only)"""
        try:
            stats = await self.get_usage_stats(days)
            total_queries = stats["total_queries"]
            
            # Also get token usage for more accurate cost calculation
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT SUM(tokens_used) AS total_tokens FROM results WHERE created_at >= ?",
                    ((datetime.now() - timedelta(days=days)).isoformat(),)
                )
                result = cursor.fetchone()
            
            total_tokens = result['total_tokens'] if result and result['total_tokens'] else 0
            
            return {
                "total_queries": total_queries,
                "total_cost": round(total_queries * self.query_cost, 2),
                "total_tokens": total_tokens,
                "estimated_token_cost": round((total_tokens / 1000) * 0.002, 2),  # Assume $0.002 per 1K tokens
                "days_analyzed": days,
                "cost_per_query": self.query_cost
            }
        except Exception as e:
            logger.error(f"Error getting internal costs: {e}")
            raise

# Initialize usage manager
usage_manager = UsageManager()

# User models for auth
class UserCredentials(BaseModel):
    """Model for login credentials"""
    email: EmailStr
    password: str

class UserSignup(BaseModel):
    """Model for signup data"""
    email: EmailStr
    password: str
    organization_name: str = "Default Org"

class UserResponse(BaseModel):
    """User data for response"""
    id: int
    email: str
    organization_id: str
    role: str

class Token(BaseModel):
    """Authentication token response"""
    access_token: str
    token_type: str = "bearer"
    expires_at: float

# JWT Authentication helpers
def create_jwt_token(user_data: Dict[str, Any]) -> Token:
    """Create a new JWT token for a user"""
    expires_delta = timedelta(minutes=JWT_EXPIRATION_MINUTES)
    expire = datetime.now() + expires_delta
    
    to_encode = {
        "sub": str(user_data["id"]),
        "email": user_data["email"],
        "organization_id": user_data["organization_id"],
        "exp": expire.timestamp()
    }
    
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return Token(
        access_token=encoded_jwt,
        expires_at=expire.timestamp()
    )

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict[str, Any]:
    """Get the current authenticated user from token"""
    try:
        logger.info(f"Authenticating user with token: {credentials.credentials[:10]}...")
        
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        email = payload.get("email")
        organization_id = payload.get("organization_id")
        exp = payload.get("exp")
        
        logger.info(f"Token payload: user_id={user_id}, email={email}, org={organization_id}")
        
        if user_id is None or email is None or organization_id is None:
            logger.error(f"Invalid token: missing required fields")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Check token expiration
        if datetime.fromtimestamp(exp) < datetime.now():
            logger.error(f"Token expired: exp={exp}, now={datetime.now().timestamp()}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return {"id": int(user_id), "email": email, "organization_id": organization_id}
    except jwt.PyJWTError as jwt_error:
        logger.error(f"JWT error: {jwt_error}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(jwt_error)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        import traceback
        logger.error(f"Authentication traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

# API endpoints
@app.get("/analytics/usage-forecast", response_model=UsageForecast)
async def get_usage_forecast(days: int = 30):
    """Get usage forecast for the specified number of days"""
    try:
        forecast = await usage_manager.forecast_usage(days)
        return forecast
    except Exception as e:
        logger.error(f"Error getting usage forecast: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/usage-trends")
async def get_usage_trends(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get usage trends data for dashboard"""
    try:
        # Get usage settings
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM alerts WHERE id = 1")
            settings = cursor.fetchone()
            
            if not settings:
                raise HTTPException(status_code=404, detail="Settings not found")
            
            plan_queries = settings['plan_queries']
            
            # Get last 30 days of data
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            # First check if user has any data in api_usage
            cursor.execute("""
                SELECT COUNT(*) as count FROM api_usage 
                WHERE user_id = ? AND timestamp >= ?
            """, (current_user["id"], start_date.isoformat()))
            
            has_real_data = cursor.fetchone()["count"] > 0
            
            if has_real_data:
                # Use real data from api_usage table
                logger.info(f"Using real api_usage data for user {current_user['id']}")
                
                # Query queries grouped by day where found=1
                cursor.execute("""
                    SELECT 
                        date(timestamp) as day, 
                        COUNT(*) as query_count
                    FROM 
                        api_usage 
                    WHERE 
                        user_id = ? AND
                        found = 1 AND
                        timestamp >= ? AND
                        timestamp <= ?
                    GROUP BY 
                        date(timestamp)
                    ORDER BY 
                        day ASC
                """, (current_user["id"], start_date.isoformat(), end_date.isoformat()))
                
                daily_results = cursor.fetchall()
                
                # Calculate percentages
                daily_usage = {}
                for day in daily_results:
                    daily_count = day['query_count']
                    usage_percent = (daily_count / plan_queries) * 100
                    daily_usage[day['day']] = usage_percent
                
                # Calculate total queries and usage percentage
                cursor.execute("""
                    SELECT COUNT(*) as total_count
                    FROM api_usage
                    WHERE user_id = ? AND found = 1 AND timestamp >= ? AND timestamp <= ?
                """, (current_user["id"], start_date.isoformat(), end_date.isoformat()))
                
                total_count = cursor.fetchone()['total_count']
                total_usage_percent = (total_count / plan_queries) * 100
                
                response = {
                    "daily_usage": daily_usage,
                    "total_usage_percent": total_usage_percent,
                    "days_analyzed": 30
                }
                
                return response
            else:
                # Fall back to test data from results table
                logger.info(f"Using test data for user {current_user['id']} (no real data yet)")
                
                # Query queries grouped by day
                cursor.execute("""
                    SELECT 
                        date(created_at) as day, 
                        COUNT(*) as query_count
                    FROM 
                        results 
                    WHERE 
                        created_at >= ? 
                        AND created_at <= ?
                    GROUP BY 
                        date(created_at)
                    ORDER BY 
                        day ASC
                """, (start_date.isoformat(), end_date.isoformat()))
                
                daily_results = cursor.fetchall()
                
                # Calculate percentages
                daily_usage = {}
                for day in daily_results:
                    daily_count = day['query_count']
                    usage_percent = (daily_count / plan_queries) * 100
                    daily_usage[day['day']] = usage_percent
                
                # Calculate total queries and usage percentage
                cursor.execute("""
                    SELECT COUNT(*) as total_count
                    FROM results
                    WHERE created_at >= ? AND created_at <= ?
                """, (start_date.isoformat(), end_date.isoformat()))
                
                total_count = cursor.fetchone()['total_count']
                total_usage_percent = (total_count / plan_queries) * 100
                
                response = {
                    "daily_usage": daily_usage,
                    "total_usage_percent": total_usage_percent,
                    "days_analyzed": 30
                }
                
                return response
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
async def get_internal_costs(days: int = 30, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get internal cost tracking (admin only)"""
    try:
        # Check if user has admin role
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT role FROM users WHERE id = ?", (current_user["id"],))
            user_role = cursor.fetchone()["role"]
            
            if user_role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin access required"
                )
        
        # Get usage stats
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Get queries for the last N days
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            cursor.execute(
                "SELECT COUNT(*) as total_queries FROM results WHERE created_at >= ?",
                (start_date.isoformat(),)
            )
            result = cursor.fetchone()
            total_queries = result["total_queries"] if result else 0
            
            # Get token usage
            cursor.execute(
                "SELECT SUM(tokens_used) as total_tokens FROM results WHERE created_at >= ?",
                (start_date.isoformat(),)
            )
            result = cursor.fetchone()
            total_tokens = result["total_tokens"] if result and result["total_tokens"] else 0
            
            # Calculate costs based on token usage
            token_cost = (total_tokens / 1000) * 0.002  # $0.002 per 1000 tokens (simplified)
            
            # Get alerts settings for query costs
            cursor.execute("SELECT plan_cost, plan_queries FROM alerts WHERE id = 1")
            settings = cursor.fetchone()
            
            query_cost = settings["plan_cost"] / settings["plan_queries"] * total_queries if settings else 0
            
            return {
                "total_queries": total_queries,
                "total_tokens": total_tokens,
                "token_cost_usd": round(token_cost, 2),
                "query_cost_usd": round(query_cost, 2),
                "estimated_total_cost_usd": round(token_cost + query_cost, 2),
                "days_analyzed": days,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting internal costs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/simulate-queries")
async def simulate_queries(sim: SimulateQueries, background_tasks: BackgroundTasks):
    """Simulate queries for testing"""
    try:
        # Validate user
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (sim.user_id,))
            user = cursor.fetchone()
            
            if not user:
                raise HTTPException(status_code=404, detail=f"User with ID {sim.user_id} not found")
            
            # Validate brand
            cursor.execute("SELECT * FROM brands WHERE id = ?", (sim.brand_id,))
            brand = cursor.fetchone()
            
            if not brand:
                raise HTTPException(status_code=404, detail=f"Brand with ID {sim.brand_id} not found")
        
        # Generate fake queries
        query_count = 0
        for i in range(sim.count):
            # Generate a random query
            query_id = hashlib.md5(f"{random.random()}".encode()).hexdigest()
            query_text = f"Test query {i+1} for {brand['name']}"
            
            # Randomize brand mention based on rate
            brand_mentioned = random.random() < sim.brand_mentioned_rate
            
            # Random sentiment and position
            sentiment_score = random.uniform(-1, 1) if brand_mentioned else 0
            ranking_position = random.randint(1, 5) if brand_mentioned else 0
            
            # Generate a fake response
            if brand_mentioned:
                llm_response = f"Here is information about {brand['name']}. They offer AEO services."
            else:
                llm_response = "There are several companies offering AEO services in the market."
            
            # Random token usage
            tokens_used = random.randint(
                int(sim.tokens_per_query * 0.8),
                int(sim.tokens_per_query * 1.2)
            )
            
            # Create timestamp with slight variation
            created_at = (datetime.now() - timedelta(
                days=random.randint(0, 29),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )).isoformat()
            
            # Store in database
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO results (
                        id, brand_id, topic_id, query_text, llm_type, llm_version,
                        llm_response, brand_mentioned, sentiment_score, ranking_position, 
                        tokens_used, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        query_id, sim.brand_id, None, query_text, sim.llm_type, sim.llm_version,
                        llm_response, 1 if brand_mentioned else 0, sentiment_score, ranking_position,
                        tokens_used, created_at
                    )
                )
                conn.commit()
                query_count += 1
        
        # Check usage threshold in background
        background_tasks.add_task(usage_manager.check_usage)
        
        return {
            "success": True,
            "queries_added": query_count,
            "message": f"Successfully added {query_count} simulated queries"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error simulating queries: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api-key-test")
async def test_api_key():
    """Test if the OpenAI API key is working"""
    api_key = os.getenv("OPENAI_API_KEY", "Not found")
    
    if api_key and len(api_key) > 10:
        return {"status": "API key loaded", "key_prefix": api_key[:10] + "..."}
    else:
        return {"status": "API key not found or invalid"}

@app.get("/")
async def root():
    """Root endpoint with app information"""
    return {
        "message": "AEO Monitoring Service - Test Version",
        "endpoints": [
            "/analytics/usage-forecast",
            "/analytics/usage-trends",
            "/set-usage-alert",
            "/admin/cost",
            "/simulate-queries",
            "/api-key-test"
        ]
    }

# Process to query OpenAI for each keyword
async def query_llm_for_keywords():
    """Background task to query OpenAI for all users' brand keywords"""
    try:
        logger.info("Starting LLM keyword query process")
        
        # Get OpenAI API key from environment
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            logger.error("OpenAI API key not found in environment")
            return
            
        # Get all brands and keywords
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT bk.id, bk.user_id, bk.brand_name, bk.keywords 
                FROM brands_keywords bk
                JOIN users u ON bk.user_id = u.id
            """)
            brand_data = cursor.fetchall()
        
        if not brand_data:
            logger.info("No brands/keywords found to query")
            return
            
        # Import here to avoid dependency issues
        import openai
        openai.api_key = openai_api_key
        
        for brand in brand_data:
            user_id = brand["user_id"]
            brand_name = brand["brand_name"]
            keywords_list = [k.strip() for k in brand["keywords"].split(",") if k.strip()]
            
            logger.info(f"Processing {len(keywords_list)} keywords for brand '{brand_name}' (user {user_id})")
            
            for keyword in keywords_list:
                try:
                    # Query OpenAI with the keyword
                    completion = await openai.ChatCompletion.acreate(
                        model="gpt-3.5-turbo",
                        messages=[
                            {"role": "system", "content": "You are a helpful assistant providing information about businesses and services."},
                            {"role": "user", "content": keyword}
                        ],
                        max_tokens=300
                    )
                    
                    # Extract response text and check if brand is mentioned
                    response_text = completion.choices[0].message.content
                    tokens_used = completion.usage.total_tokens
                    
                    # Check if brand name appears in response (case-insensitive)
                    found = 1 if brand_name.lower() in response_text.lower() else 0
                    
                    # Log the query in api_usage
                    with get_db_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            INSERT INTO api_usage (user_id, brand_name, keyword, tokens_used, found, timestamp)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (user_id, brand_name, keyword, tokens_used, found, datetime.now().isoformat()))
                        conn.commit()
                    
                    logger.info(f"Processed keyword '{keyword}' for brand '{brand_name}', found: {found}")
                    
                    # Add a small delay to avoid rate limits
                    await asyncio.sleep(1)
                    
                except Exception as keyword_error:
                    logger.error(f"Error processing keyword '{keyword}' for brand '{brand_name}': {keyword_error}")
        
        logger.info("Completed LLM keyword query process")
    except Exception as e:
        logger.error(f"Error in LLM query process: {e}")

# Startup event to initialize scheduler
@app.on_event("startup")
async def startup_event():
    """Start the scheduler and setup initial tasks"""
    try:
        # Start the scheduler
        if not scheduler.running:
            scheduler.start()
            logger.info("Scheduler started")
        
        # Add usage check job
        scheduler.add_job(
            usage_manager.check_usage,
            "interval",
            hours=1,
            id="usage_check",
            next_run_time=datetime.now() + timedelta(minutes=1)
        )
        
        # Add LLM query job
        scheduler.add_job(
            query_llm_for_keywords,
            "interval",
            hours=1,
            id="llm_query",
            next_run_time=datetime.now() + timedelta(minutes=2)
        )
        
        logger.info("Schedulers started")
    except Exception as e:
        logger.error(f"Error during startup: {e}")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown the scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shut down")

# Make sure the database is initialized for every request
@app.middleware("http")
async def ensure_db_initialized(request, call_next):
    """Ensure database is initialized before each request"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM alerts LIMIT 1")
            if not cursor.fetchone():
                # Re-initialize if tables don't exist
                init_db()
    except sqlite3.OperationalError:
        # Tables don't exist, initialize
        init_db()
    
    response = await call_next(request)
    return response

@app.get("/dashboard/alert-history")
async def get_alert_history():
    """Get historical alerts"""
    try:
        # Create the table if it doesn't exist
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "CREATE TABLE IF NOT EXISTS sent_alerts (id INTEGER PRIMARY KEY, usage_percent REAL, threshold_percent REAL, sent_at TEXT)"
            )
            
            # Query alerts from database
            cursor.execute(
                "SELECT usage_percent, threshold_percent, sent_at FROM sent_alerts ORDER BY sent_at DESC LIMIT 10"
            )
            results = cursor.fetchall()
        
        # If no alerts, return empty list
        if not results:
            return []
        
        # Format the response
        return [
            {
                "date": row['sent_at'],
                "usage_percentage": row['usage_percent'],
                "message": f"You've used {row['usage_percent']:.1f}% of your plan—maximize your value!"
            }
            for row in results
        ]
    except Exception as e:
        logger.error(f"Error getting alert history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dashboard/cost-projection")
async def get_cost_projection(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get cost projection data for dashboard"""
    try:
        # Get usage settings
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM alerts WHERE id = 1")
            settings = cursor.fetchone()
            
            if not settings:
                raise HTTPException(status_code=404, detail="Settings not found")
            
            plan_cost = settings['plan_cost']
            plan_queries = settings['plan_queries']
            
            # First check if user has any data in api_usage
            cursor.execute("""
                SELECT COUNT(*) as count FROM api_usage 
                WHERE user_id = ?
            """, (current_user["id"],))
            
            has_real_data = cursor.fetchone()["count"] > 0
            
            if has_real_data:
                # Get query count where found=1 for the calculation
                cursor.execute("""
                    SELECT COUNT(*) as query_count 
                    FROM api_usage 
                    WHERE user_id = ? AND found = 1
                """, (current_user["id"],))
                total_queries = cursor.fetchone()['query_count']
                
                # Calculate current value based on usage percentage
                usage_ratio = total_queries / plan_queries
                current_value = plan_cost * usage_ratio
                
                # Calculate projection
                projected_usage = min(usage_ratio * 1.1, 1.0)  # Project slight increase, cap at 100%
                
                return {
                    "plan_cost": plan_cost,
                    "current_value": current_value,
                    "projected_cost": plan_cost,
                    "projected_date": (datetime.now() + timedelta(days=30)).isoformat(),
                    "projected_percentage": projected_usage * 100
                }
            else:
                # Fall back to test data
                # Get query count for the calculation
                cursor.execute("SELECT COUNT(*) as query_count FROM results")
                total_queries = cursor.fetchone()['query_count']
                
                # Calculate current value based on usage percentage
                usage_ratio = total_queries / plan_queries
                current_value = plan_cost * usage_ratio
                
                # Calculate projection
                projected_usage = min(usage_ratio * 1.1, 1.0)  # Project slight increase, cap at 100%
                
                return {
                    "plan_cost": plan_cost,
                    "current_value": current_value,
                    "projected_cost": plan_cost,
                    "projected_date": (datetime.now() + timedelta(days=30)).isoformat(),
                    "projected_percentage": projected_usage * 100
                }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting cost projection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        # Get authentication token
        data = await websocket.receive_text()
        try:
            json_data = json.loads(data)
            token = json_data.get("token")
            
            if not token:
                await websocket.send_json({"error": "Authentication required"})
                return
                
            # Verify token and get user
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                user_id = payload.get("sub")
                
                if not user_id:
                    await websocket.send_json({"error": "Invalid token"})
                    return
                    
                current_user = {"id": int(user_id)}
            except jwt.PyJWTError:
                await websocket.send_json({"error": "Invalid token"})
                return
        except json.JSONDecodeError:
            # For backward compatibility, continue without auth
            current_user = {"id": 1}  # Default to first user
        
        # Get usage settings
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM alerts WHERE id = 1")
            settings = cursor.fetchone()
            plan_queries = settings['plan_queries'] if settings else 10000
            
            # Check if user has any data in api_usage
            cursor.execute("""
                SELECT COUNT(*) as count FROM api_usage 
                WHERE user_id = ?
            """, (current_user["id"],))
            
            has_real_data = cursor.fetchone()["count"] > 0
            
            if has_real_data:
                # Get count of entries where found=1
                cursor.execute("""
                    SELECT COUNT(*) as total_count
                    FROM api_usage
                    WHERE user_id = ? AND found = 1
                """, (current_user["id"],))
                
                total_queries = cursor.fetchone()['total_count']
                usage_percent = (total_queries / plan_queries) * 100
            else:
                # Fall back to test data
                cursor.execute("SELECT COUNT(*) as total_count FROM results")
                total_queries = cursor.fetchone()['total_count']
                usage_percent = (total_queries / plan_queries) * 100
        
        # Send usage percentage
        await websocket.send_json({"usage_percentage": usage_percent})
        
        # Keep the connection open
        while True:
            # Wait for messages (keep-alive, etc.)
            data = await websocket.receive_text()
            
            # If client sends "update", send fresh stats
            if data == "update":
                with get_db_connection() as conn:
                    cursor = conn.cursor()
                    
                    # Check if user has any data in api_usage
                    cursor.execute("""
                        SELECT COUNT(*) as count FROM api_usage 
                        WHERE user_id = ?
                    """, (current_user["id"],))
                    
                    has_real_data = cursor.fetchone()["count"] > 0
                    
                    if has_real_data:
                        # Get count of entries where found=1
                        cursor.execute("""
                            SELECT COUNT(*) as total_count
                            FROM api_usage
                            WHERE user_id = ? AND found = 1
                        """, (current_user["id"],))
                        
                        total_queries = cursor.fetchone()['total_count']
                        usage_percent = (total_queries / plan_queries) * 100
                    else:
                        # Fall back to test data
                        cursor.execute("SELECT COUNT(*) as total_count FROM results")
                        total_queries = cursor.fetchone()['total_count']
                        usage_percent = (total_queries / plan_queries) * 100
                
                await websocket.send_json({"usage_percentage": usage_percent})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"error": "An error occurred"})
        except:
            pass  # Client might be disconnected already

@app.post("/dashboard/update-alerts")
async def update_alert_settings(settings: UsageSettings):
    """Update alert settings from dashboard"""
    try:
        # Get usage settings
        updated_settings = await usage_manager.set_usage_alert(settings)
        
        # Return the updated settings
        return {
            "success": True,
            "message": "Alert settings updated successfully",
            "settings": updated_settings
        }
    except Exception as e:
        logger.error(f"Error updating alert settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Authentication endpoints
@app.post("/auth/signup", response_model=Token)
async def signup(user_data: UserSignup):
    """Signup with email and password"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Check if user exists
            cursor.execute("SELECT id FROM users WHERE email = ?", (user_data.email,))
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            
            # Create organization
            organization_id = f"org_{random.randint(1000, 9999)}"
            
            # Hash password
            password_hash = bcrypt.hashpw(user_data.password.encode(), bcrypt.gensalt()).decode()
            
            # Insert user
            cursor.execute('''
            INSERT INTO users (email, password_hash, organization_id, role, created_at) 
            VALUES (?, ?, ?, ?, ?)
            ''', (user_data.email, password_hash, organization_id, 'user', datetime.now().isoformat()))
            
            user_id = cursor.lastrowid
            
            # Get the created user
            user = {
                "id": user_id,
                "email": user_data.email,
                "organization_id": organization_id
            }
            
            conn.commit()
        
        return create_jwt_token(user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during signup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating user account"
        )

@app.post("/auth/login", response_model=Token)
async def login(credentials: UserCredentials):
    """Login with email and password"""
    try:
        logger.info(f"Login attempt for email: {credentials.email}")
        
        # Find user
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, email, password_hash, organization_id, role FROM users WHERE email = ?", (credentials.email,))
            user = cursor.fetchone()
            
            if not user:
                logger.info(f"Login failed: user not found for {credentials.email}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
            
            # Verify password
            try:
                is_password_valid = bcrypt.checkpw(
                    credentials.password.encode(),
                    user["password_hash"].encode()
                )
            except Exception as pw_error:
                logger.error(f"Password verification error: {pw_error}")
                is_password_valid = False
            
            if not is_password_valid:
                logger.info(f"Login failed: invalid password for {credentials.email}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
        
        # Create JWT token
        user_data = {
            "id": user["id"],
            "email": user["email"],
            "organization_id": user["organization_id"]
        }
        
        token = create_jwt_token(user_data)
        logger.info(f"Login successful for {credentials.email}")
        return token
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error during login"
        )

@app.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current authenticated user"""
    # Get full user data including role from database
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, organization_id, role FROM users WHERE id = ?", 
            (current_user["id"],)
        )
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        organization_id=user["organization_id"],
        role=user["role"]
    )

# Pydantic model for brand and keywords
class BrandKeywords(BaseModel):
    """Brand and keywords data"""
    brand_name: str
    keywords: str  # Comma-separated list of keywords

@app.post("/dashboard/add-brand")
async def add_brand(brand_data: BrandKeywords, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Add a brand and keywords for a user"""
    try:
        logger.info(f"Adding brand '{brand_data.brand_name}' for user {current_user['id']}")
        logger.info(f"User data: {current_user}")
        logger.info(f"Brand data: {brand_data}")
        
        brand_id = hashlib.md5(f"{random.random()}".encode()).hexdigest()
        created_at = datetime.now().isoformat()
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Check if user already has a brand
            cursor.execute(
                "SELECT id FROM brands_keywords WHERE user_id = ?", 
                (current_user["id"],)
            )
            existing_brand = cursor.fetchone()
            
            if existing_brand:
                # Update existing brand
                logger.info(f"Updating existing brand {existing_brand['id']} for user {current_user['id']}")
                cursor.execute(
                    """
                    UPDATE brands_keywords 
                    SET brand_name = ?, keywords = ?, created_at = ? 
                    WHERE user_id = ?
                    """,
                    (brand_data.brand_name, brand_data.keywords, created_at, current_user["id"])
                )
                conn.commit()
                
                logger.info(f"Updated brand for user {current_user['id']}")
                return {
                    "success": True,
                    "message": "Brand updated successfully",
                    "brand_id": existing_brand["id"]
                }
            else:
                # Create new brand entry
                logger.info(f"Creating new brand for user {current_user['id']}")
                cursor.execute(
                    """
                    INSERT INTO brands_keywords (id, user_id, brand_name, keywords, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (brand_id, current_user["id"], brand_data.brand_name, brand_data.keywords, created_at)
                )
                conn.commit()
                
                logger.info(f"Added new brand for user {current_user['id']}")
                return {
                    "success": True,
                    "message": "Brand added successfully",
                    "brand_id": brand_id
                }
    except Exception as e:
        logger.error(f"Error adding brand: {e}")
        logger.error(f"Error details: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding brand: {str(e)}"
        )

@app.get("/dashboard/check-user-brands")
async def check_user_brands(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Check if the user has any brands set up"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) as count FROM brands_keywords WHERE user_id = ?", 
                (current_user["id"],)
            )
            brand_count = cursor.fetchone()['count']
            
            return {"has_brands": brand_count > 0}
    except Exception as e:
        logger.error(f"Error checking user brands: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/dashboard/run-queries")
async def run_queries_manually(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Manually trigger LLM queries for the user's keywords"""
    try:
        # Check if user has any brands/keywords
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM brands_keywords WHERE user_id = ?", 
                (current_user["id"],)
            )
            brand_data = cursor.fetchall()
            
        if not brand_data:
            return {
                "success": False,
                "message": "No brands or keywords found to query"
            }
        
        # Run queries in background
        background_tasks.add_task(query_llm_for_keywords_specific_user, current_user["id"])
        
        return {
            "success": True,
            "message": f"Queries started for {len(brand_data)} brands"
        }
    except Exception as e:
        logger.error(f"Error running queries manually: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def query_llm_for_keywords_specific_user(user_id: str):
    """Background task to query OpenAI for a specific user's brand keywords"""
    try:
        logger.info(f"Starting LLM keyword query process for user {user_id}")
        
        # Get OpenAI API key from environment
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            logger.error("OpenAI API key not found in environment")
            return
            
        # Get user's brands and keywords
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM brands_keywords WHERE user_id = ?", 
                (user_id,)
            )
            brand_data = cursor.fetchall()
        
        if not brand_data:
            logger.info(f"No brands/keywords found for user {user_id}")
            return
            
        # Import here to avoid dependency issues
        import openai
        openai.api_key = openai_api_key
        
        for brand in brand_data:
            brand_name = brand["brand_name"]
            keywords_list = [k.strip() for k in brand["keywords"].split(",") if k.strip()]
            
            logger.info(f"Processing {len(keywords_list)} keywords for brand '{brand_name}' (user {user_id})")
            
            for keyword in keywords_list:
                try:
                    # Query OpenAI with the keyword
                    completion = await openai.ChatCompletion.acreate(
                        model="gpt-3.5-turbo",
                        messages=[
                            {"role": "system", "content": "You are a helpful assistant providing information about businesses and services."},
                            {"role": "user", "content": keyword}
                        ],
                        max_tokens=300
                    )
                    
                    # Extract response text and check if brand is mentioned
                    response_text = completion.choices[0].message.content
                    tokens_used = completion.usage.total_tokens
                    
                    # Check if brand name appears in response (case-insensitive)
                    found = 1 if brand_name.lower() in response_text.lower() else 0
                    
                    # Log the query in search_results
                    with get_db_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            INSERT INTO search_results 
                            (user_id, keyword, brand_name, found, response_text, timestamp)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (user_id, keyword, brand_name, found, response_text, datetime.now().isoformat()))
                        conn.commit()
                    
                    # Also log in api_usage for compatibility
                    with get_db_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            INSERT INTO api_usage 
                            (user_id, brand_name, keyword, tokens_used, found, timestamp)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (user_id, brand_name, keyword, tokens_used, found, datetime.now().isoformat()))
                        conn.commit()
                    
                    logger.info(f"Processed keyword '{keyword}' for brand '{brand_name}', found: {found}")
                    
                    # Add a small delay to avoid rate limits
                    await asyncio.sleep(1)
                    
                except Exception as keyword_error:
                    logger.error(f"Error processing keyword '{keyword}' for brand '{brand_name}': {keyword_error}")
        
        logger.info(f"Completed LLM keyword query process for user {user_id}")
    except Exception as e:
        logger.error(f"Error in LLM query process for user {user_id}: {e}")

@app.get("/dashboard/ranking-performance")
async def get_ranking_performance(
    user_id: str = Query(None, description="User ID to get performance for"),
    days: int = Query(7, description="Number of days to analyze"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get ranking performance metrics for a user's keywords
    
    This endpoint calculates:
    - How many times each keyword was searched
    - How many times the brand appeared in results
    - The appearance percentage
    """
    try:
        # Use current_user.id if user_id not provided
        if not user_id:
            user_id = current_user["id"]
            
        start_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # First get all keywords for the user's brands
            cursor.execute("""
                SELECT brand_name, keywords
                FROM brands_keywords
                WHERE user_id = ?
            """, (user_id,))
            
            brand_results = cursor.fetchall()
            
            if not brand_results:
                return {"keywords": [], "message": "No brands found for this user"}
            
            # Extract all keywords from all brands
            all_keywords = []
            for brand in brand_results:
                brand_name = brand["brand_name"]
                keywords = [k.strip() for k in brand["keywords"].split(",") if k.strip()]
                for keyword in keywords:
                    all_keywords.append((keyword, brand_name))
            
            if not all_keywords:
                return {"keywords": [], "message": "No keywords found for this user's brands"}
            
            # Get performance data for each keyword
            performance_data = []
            
            for keyword, brand_name in all_keywords:
                # Get total searches for this keyword
                cursor.execute("""
                    SELECT COUNT(*) as total
                    FROM search_results
                    WHERE user_id = ? AND keyword = ? AND brand_name = ? AND timestamp > ?
                """, (user_id, keyword, brand_name, start_date))
                
                result = cursor.fetchone()
                total_searches = result["total"] if result else 0
                
                # Skip keywords with no searches
                if total_searches == 0:
                    continue
                
                # Get appearances (where found=TRUE)
                cursor.execute("""
                    SELECT COUNT(*) as total
                    FROM search_results
                    WHERE user_id = ? AND keyword = ? AND brand_name = ? AND found = ? AND timestamp > ?
                """, (user_id, keyword, brand_name, 1, start_date))
                
                result = cursor.fetchone()
                appearances = result["total"] if result else 0
                
                # Calculate percentage
                percentage = (appearances / total_searches * 100) if total_searches > 0 else 0
                
                performance_data.append({
                    "keyword": keyword,
                    "brand_name": brand_name,
                    "searches": total_searches,
                    "appearances": appearances,
                    "percentage": round(percentage, 1)
                })
            
            return {"keywords": performance_data}
            
    except Exception as e:
        logger.error(f"Error getting ranking performance: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting ranking performance: {str(e)}")

@app.get("/dashboard/ranking-insights")
async def get_ranking_insights(
    user_id: str = Query(None, description="User ID to get insights for"),
    days: int = Query(7, description="Number of days to analyze"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get insights and recommended actions for improving rankings
    
    This endpoint:
    - Analyzes responses where the brand didn't appear
    - Identifies patterns in successful rankings
    - Provides actionable recommendations
    """
    try:
        # Use current_user.id if user_id not provided
        if not user_id:
            user_id = current_user["id"]
            
        start_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Get all keywords for the user's brands
            cursor.execute("""
                SELECT brand_name, keywords
                FROM brands_keywords
                WHERE user_id = ?
            """, (user_id,))
            
            brand_results = cursor.fetchall()
            
            if not brand_results:
                return {"insights": [], "message": "No brands found for this user"}
            
            insights = []
            
            for brand in brand_results:
                brand_name = brand["brand_name"]
                keywords = [k.strip() for k in brand["keywords"].split(",") if k.strip()]
                
                for keyword in keywords:
                    # Check if we have any failed searches (found=0)
                    cursor.execute("""
                        SELECT COUNT(*) as total, response_text
                        FROM search_results
                        WHERE user_id = ? AND keyword = ? AND brand_name = ? AND found = 0 AND timestamp > ?
                        LIMIT 5
                    """, (user_id, keyword, brand_name, start_date))
                    
                    failed_searches = cursor.fetchall()
                    
                    # Skip keywords with no failed searches
                    if not failed_searches or failed_searches[0]["total"] == 0:
                        continue
                    
                    # Get sample responses for analysis
                    cursor.execute("""
                        SELECT response_text
                        FROM search_results
                        WHERE user_id = ? AND keyword = ? AND brand_name = ? AND found = 0 AND timestamp > ?
                        ORDER BY timestamp DESC
                        LIMIT 3
                    """, (user_id, keyword, brand_name, start_date))
                    
                    sample_responses = cursor.fetchall()
                    
                    if not sample_responses:
                        continue
                    
                    # Extract competing brands mentioned in responses
                    competing_brands = []
                    keywords_mentioned = set()
                    
                    for response in sample_responses:
                        if not response["response_text"]:
                            continue
                            
                        text = response["response_text"].lower()
                        
                        # Extract potential competing brands (simplified approach)
                        lines = text.split('\n')
                        for line in lines:
                            if 'best' in line or 'top' in line or 'recommend' in line:
                                words = line.split()
                                for i, word in enumerate(words):
                                    if word in ['bakery', 'restaurant', 'shop', 'store']:
                                        # Check previous words for potential brand names
                                        start = max(0, i-2)
                                        potential_brand = ' '.join(words[start:i]).strip()
                                        if potential_brand and potential_brand != brand_name.lower():
                                            competing_brands.append(potential_brand)
                            
                            # Extract key terms
                            for term in ['fresh', 'artisan', 'organic', 'quality', 'local', 'popular', 'famous', 'best']:
                                if term in line:
                                    keywords_mentioned.add(term)
                    
                    # Generate insight based on analysis
                    insight = f"Your brand '{brand_name}' isn't appearing in AI search results for '{keyword}'."
                    
                    # Add competitor info if found
                    if competing_brands:
                        competitors_text = ', '.join(competing_brands[:3])
                        insight += f" Competitors like {competitors_text} are being mentioned instead."
                    
                    # Add keyword info if found
                    if keywords_mentioned:
                        keywords_text = ', '.join(keywords_mentioned)
                        insight += f" Popular topics in responses include: {keywords_text}."
                    
                    # Generate action recommendation
                    action = ""
                    if 'best' in keyword.lower() or 'top' in keyword.lower():
                        action = f"Create content highlighting why {brand_name} is among the best choices for '{keyword}'."
                    elif keywords_mentioned:
                        top_keywords = list(keywords_mentioned)[:2]
                        action = f"Add content about {' and '.join(top_keywords)} to your website and marketing materials."
                    else:
                        action = f"Create SEO-optimized content about '{keyword}' for your website and social media channels."
                    
                    # Add the insight
                    insights.append({
                        "keyword": keyword,
                        "brand_name": brand_name,
                        "insight_type": "opportunity",
                        "insight": insight,
                        "action": action,
                        "created_at": datetime.now().isoformat()
                    })
            
            return {"insights": insights}
            
    except Exception as e:
        logger.error(f"Error getting ranking insights: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting ranking insights: {str(e)}")

# Run the app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("test_forecast:app", host="0.0.0.0", port=8080, reload=True) 