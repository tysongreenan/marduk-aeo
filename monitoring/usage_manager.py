from typing import Dict, Any, Optional
import os
import logging
import statistics
from datetime import datetime, timedelta
from pydantic import BaseModel, Field

# Configure logging
logger = logging.getLogger(__name__)

class UsageSettings(BaseModel):
    """Usage alert settings model"""
    alert_threshold: float = Field(default=0.8, gt=0, le=1)
    email_notifications: bool = Field(default=True)
    plan_queries: int = Field(default=10000)
    plan_cost: float = Field(default=50.0)

# Initialize tables in Supabase
def init_supabase_tables(supabase):
    """Create necessary tables in Supabase if they don't exist"""
    try:
        # Check if tables exist by running test queries
        supabase.table("results").select("id").limit(1).execute()
        logger.info("Results table exists")
    except Exception:
        logger.info("Creating results table")
        # For PostgreSQL via Supabase, you'd typically use migrations
        # This is a simplified approach assuming we have permission to create tables
        supabase.postgrest.rpc(
            "exec",
            {
                "command": """
                CREATE TABLE IF NOT EXISTS results (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id TEXT NOT NULL,
                    brand_id TEXT NOT NULL,
                    topic_id TEXT,
                    query_text TEXT NOT NULL,
                    llm_type TEXT NOT NULL,
                    llm_version TEXT NOT NULL, 
                    llm_response TEXT NOT NULL,
                    brand_mentioned BOOLEAN NOT NULL,
                    sentiment_score REAL NOT NULL,
                    ranking_position INTEGER NOT NULL,
                    tokens_used INTEGER NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
                """
            }
        ).execute()
    
    try:
        supabase.table("alerts").select("id").limit(1).execute()
        logger.info("Alerts table exists")
    except Exception:
        logger.info("Creating alerts table")
        supabase.postgrest.rpc(
            "exec",
            {
                "command": """
                CREATE TABLE IF NOT EXISTS alerts (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    alert_threshold REAL NOT NULL DEFAULT 0.8,
                    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
                    plan_queries INTEGER NOT NULL DEFAULT 10000,
                    plan_cost REAL NOT NULL DEFAULT 50.0,
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
                """
            }
        ).execute()
        
        # Insert default alert settings if table is empty
        result = supabase.table("alerts").select("*").execute()
        if not result.data:
            supabase.table("alerts").insert({
                "alert_threshold": 0.8,
                "email_notifications": True,
                "plan_queries": 10000,
                "plan_cost": 50.0,
                "updated_at": datetime.now().isoformat()
            }).execute()
    
    try:
        supabase.table("sent_alerts").select("id").limit(1).execute()
        logger.info("Sent alerts table exists")
    except Exception:
        logger.info("Creating sent_alerts table")
        supabase.postgrest.rpc(
            "exec",
            {
                "command": """
                CREATE TABLE IF NOT EXISTS sent_alerts (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id TEXT NOT NULL,
                    usage_percent REAL NOT NULL,
                    threshold_percent REAL NOT NULL,
                    message TEXT NOT NULL,
                    sent_at TIMESTAMPTZ DEFAULT NOW()
                )
                """
            }
        ).execute()

class UsageManager:
    """Manage usage tracking and alerts for flat-fee model"""
    def __init__(self, supabase_client):
        self.supabase = supabase_client
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
            
            # Query usage from Supabase using keyword_queries table
            result = self.supabase.table("keyword_queries") \
                .select("created_at, tokens_used") \
                .gte("created_at", start_date.isoformat()) \
                .lte("created_at", end_date.isoformat()) \
                .execute()
            
            if not result.data:
                return {
                    "total_queries": 0,
                    "usage_percent": 0,
                    "days_analyzed": days,
                    "daily_usage": {}
                }
            
            total_queries = len(result.data)
            usage_percent = (total_queries / plan_queries) * 100
            
            # Group by day for trend analysis
            daily_usage = {}
            for item in result.data:
                date = item["created_at"].split('T')[0]
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
            # Get the first alert record (there should only be one)
            result = self.supabase.table("alerts").select("*").limit(1).execute()
            
            if result.data:
                # Update existing record
                alert_id = result.data[0]["id"]
                self.supabase.table("alerts").update({
                    "alert_threshold": settings.alert_threshold,
                    "email_notifications": settings.email_notifications,
                    "plan_queries": settings.plan_queries,
                    "plan_cost": settings.plan_cost,
                    "updated_at": datetime.now().isoformat()
                }).eq("id", alert_id).execute()
            else:
                # Insert new record
                self.supabase.table("alerts").insert({
                    "alert_threshold": settings.alert_threshold,
                    "email_notifications": settings.email_notifications,
                    "plan_queries": settings.plan_queries,
                    "plan_cost": settings.plan_cost,
                    "updated_at": datetime.now().isoformat()
                }).execute()
            
            return await self.get_usage_settings()
        except Exception as e:
            logger.error(f"Error setting usage alert: {e}")
            raise
    
    async def get_usage_settings(self) -> UsageSettings:
        """Get current usage alert settings"""
        try:
            result = self.supabase.table("alerts").select("*").limit(1).execute()
            
            if not result.data:
                return UsageSettings()
            
            alert = result.data[0]
            return UsageSettings(
                alert_threshold=alert["alert_threshold"],
                email_notifications=alert["email_notifications"],
                plan_queries=alert["plan_queries"],
                plan_cost=alert["plan_cost"]
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
                
                # Save alert in sent_alerts table
                self.supabase.table("sent_alerts").insert({
                    "user_id": "system",  # Default user ID
                    "usage_percent": stats["usage_percent"],
                    "threshold_percent": settings.alert_threshold * 100,
                    "message": f"Usage alert: {stats['usage_percent']}% of plan used.",
                    "sent_at": datetime.now().isoformat()
                }).execute()
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
            
            # In a real implementation, you'd query the user's email from Supabase
            # For now, use the default email from environment or a default
            to_email = os.getenv("ALERT_TO_EMAIL", "admin@yourdomain.com")
            
            message = Mail(
                from_email=os.getenv("ALERT_FROM_EMAIL", "alerts@yourdomain.com"),
                to_emails=to_email,
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
            
            # Get token usage from keyword_queries table
            result = self.supabase.table("keyword_queries") \
                .select("tokens_used") \
                .gte("created_at", (datetime.now() - timedelta(days=days)).isoformat()) \
                .execute()
            
            total_tokens = sum(item.get("tokens_used", 0) for item in result.data) if result.data else 0
            
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