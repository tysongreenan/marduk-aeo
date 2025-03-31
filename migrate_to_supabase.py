"""
Script to migrate data from SQLite to Supabase.
This is a preparatory script for migrating to production.
"""

import os
import sqlite3
import json
import psycopg2
import psycopg2.extras
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
import sys
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Database connection options
DIRECT_DB_URL = os.getenv("DATABASE_URL")  # Direct connection
DB_TRANSACTION_URL = os.getenv("DB_TRANSACTION_POOLER_URL")  # Transaction pooler

# SQLite database
SQLITE_DB = "test_forecast.db"

def connect_to_sqlite():
    """Connect to SQLite database and return connection"""
    try:
        conn = sqlite3.connect(SQLITE_DB)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to SQLite database: {e}")
        sys.exit(1)

def connect_to_supabase():
    """Connect to Supabase and return client"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Missing Supabase URL or Key. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.")
    
    try:
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        logger.error(f"Failed to connect to Supabase: {e}")
        sys.exit(1)

def connect_to_postgres_direct():
    """Connect directly to Postgres for admin operations"""
    if not DIRECT_DB_URL:
        logger.warning("No DATABASE_URL found. Will try transaction pooler.")
        return None
    
    try:
        conn = psycopg2.connect(DIRECT_DB_URL)
        logger.info("Connected to Postgres using direct connection")
        return conn
    except Exception as e:
        logger.error(f"Failed to connect directly to Postgres: {e}")
        logger.info("Will try transaction pooler instead")
        return None

def connect_to_postgres_pool():
    """Connect to Postgres via transaction pooler for bulk operations"""
    if not DB_TRANSACTION_URL:
        logger.warning("No DB_TRANSACTION_POOLER_URL found. Will use Supabase API for all operations.")
        return None
    
    try:
        conn = psycopg2.connect(DB_TRANSACTION_URL)
        logger.info("Connected to Postgres using transaction pooler")
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to Postgres via transaction pooler: {e}")
        logger.info("Will fall back to using Supabase API")
        return None

def get_table_names(sqlite_conn):
    """Get all table names from SQLite database"""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    return [row['name'] for row in cursor.fetchall()]

def migrate_users(sqlite_conn, supabase: Client, pg_conn=None):
    """Migrate users from SQLite to Supabase"""
    logger.info("Migrating users...")
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()
    
    if not users:
        logger.info("No users to migrate")
        return
    
    # If we have direct Postgres connection, use it for bulk insert
    if pg_conn:
        try:
            pg_cursor = pg_conn.cursor()
            
            # Prepare data for bulk insert
            data = []
            for user in users:
                user_dict = dict(user)
                # Check if user already exists
                pg_cursor.execute("SELECT id FROM users WHERE email = %s", (user_dict["email"],))
                if pg_cursor.fetchone():
                    logger.info(f"User already exists: {user_dict['email']}")
                    continue
                
                data.append({
                    "id": user_dict["id"],
                    "email": user_dict["email"],
                    "password_hash": user_dict["password_hash"],
                    "organization_id": user_dict["organization_id"],
                    "created_at": user_dict["created_at"] or datetime.now().isoformat()
                })
            
            if data:
                # Use Postgres COPY for fast bulk insert
                psycopg2.extras.execute_values(
                    pg_cursor,
                    """
                    INSERT INTO users (id, email, password_hash, organization_id, created_at)
                    VALUES %s
                    ON CONFLICT (id) DO NOTHING
                    """,
                    [(
                        item["id"],
                        item["email"],
                        item["password_hash"],
                        item["organization_id"],
                        item["created_at"]
                    ) for item in data],
                    template=None,
                    page_size=100
                )
                pg_conn.commit()
                logger.info(f"Bulk inserted {len(data)} users")
            return
        except Exception as e:
            logger.error(f"Error during bulk insert of users: {e}")
            logger.info("Falling back to Supabase API")
    
    # Fallback to Supabase API
    for user in users:
        # Convert SQLite Row to dict
        user_dict = dict(user)
        
        # Check if user already exists
        response = supabase.table("users").select("*").eq("email", user_dict["email"]).execute()
        
        if not response.data:
            # Insert user
            logger.info(f"Adding user: {user_dict['email']}")
            supabase.table("users").insert({
                "id": user_dict["id"],
                "email": user_dict["email"],
                "password_hash": user_dict["password_hash"],
                "organization_id": user_dict["organization_id"],
                "created_at": user_dict["created_at"] or datetime.now().isoformat()
            }).execute()
        else:
            logger.info(f"User already exists: {user_dict['email']}")
    
    logger.info(f"Migrated {len(users)} users")

def migrate_results(sqlite_conn, supabase: Client, pg_conn=None):
    """Migrate results (queries) from SQLite to Supabase"""
    logger.info("Migrating query results...")
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM results")
    results = cursor.fetchall()
    
    if not results:
        logger.info("No results to migrate")
        return
    
    results_count = len(results)
    
    # If we have direct Postgres connection, use it for bulk insert
    if pg_conn:
        try:
            pg_cursor = pg_conn.cursor()
            
            # Process in batches to avoid memory issues
            batch_size = 500
            for i in range(0, results_count, batch_size):
                batch = results[i:i+batch_size]
                
                # Prepare data for bulk insert
                batch_data = []
                for result in batch:
                    result_dict = dict(result)
                    batch_data.append({
                        "id": result_dict["id"],
                        "brand_id": result_dict["brand_id"],
                        "topic_id": result_dict["topic_id"],
                        "query_text": result_dict["query_text"],
                        "llm_type": result_dict["llm_type"],
                        "llm_version": result_dict["llm_version"],
                        "llm_response": result_dict["llm_response"],
                        "brand_mentioned": bool(result_dict["brand_mentioned"]),
                        "sentiment_score": result_dict["sentiment_score"],
                        "ranking_position": result_dict["ranking_position"],
                        "tokens_used": result_dict["tokens_used"],
                        "created_at": result_dict["created_at"] or datetime.now().isoformat()
                    })
                
                # Use Postgres COPY for fast bulk insert
                psycopg2.extras.execute_values(
                    pg_cursor,
                    """
                    INSERT INTO results (id, brand_id, topic_id, query_text, llm_type, llm_version, 
                                        llm_response, brand_mentioned, sentiment_score, ranking_position, 
                                        tokens_used, created_at)
                    VALUES %s
                    ON CONFLICT (id) DO NOTHING
                    """,
                    [(
                        item["id"],
                        item["brand_id"],
                        item["topic_id"],
                        item["query_text"],
                        item["llm_type"],
                        item["llm_version"],
                        item["llm_response"],
                        item["brand_mentioned"],
                        item["sentiment_score"],
                        item["ranking_position"],
                        item["tokens_used"],
                        item["created_at"]
                    ) for item in batch_data],
                    template=None,
                    page_size=100
                )
                pg_conn.commit()
                logger.info(f"Bulk inserted batch {i//batch_size + 1}/{(results_count + batch_size - 1)//batch_size}")
            
            logger.info(f"Migrated {results_count} query results using direct Postgres connection")
            return
        except Exception as e:
            logger.error(f"Error during bulk insert of results: {e}")
            logger.info("Falling back to Supabase API")
    
    # Fallback to Supabase API
    batch_size = 100
    for i in range(0, results_count, batch_size):
        batch = results[i:i+batch_size]
        batch_data = []
        
        for result in batch:
            # Convert SQLite Row to dict
            result_dict = dict(result)
            batch_data.append({
                "id": result_dict["id"],
                "brand_id": result_dict["brand_id"],
                "topic_id": result_dict["topic_id"],
                "query_text": result_dict["query_text"],
                "llm_type": result_dict["llm_type"],
                "llm_version": result_dict["llm_version"],
                "llm_response": result_dict["llm_response"],
                "brand_mentioned": bool(result_dict["brand_mentioned"]),
                "sentiment_score": result_dict["sentiment_score"],
                "ranking_position": result_dict["ranking_position"],
                "tokens_used": result_dict["tokens_used"],
                "created_at": result_dict["created_at"] or datetime.now().isoformat()
            })
        
        # Insert batch
        logger.info(f"Adding batch {i//batch_size + 1}/{(results_count + batch_size - 1)//batch_size}...")
        supabase.table("results").insert(batch_data).execute()
    
    logger.info(f"Migrated {results_count} query results")

def migrate_brands(sqlite_conn, supabase: Client, pg_conn=None):
    """Migrate brands from SQLite to Supabase"""
    logger.info("Migrating brands...")
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM brands")
    brands = cursor.fetchall()
    
    if not brands:
        logger.info("No brands to migrate")
        return
    
    # If we have direct Postgres connection, use it for bulk insert
    if pg_conn:
        try:
            pg_cursor = pg_conn.cursor()
            
            # Prepare data for bulk insert
            batch_data = []
            for brand in brands:
                brand_dict = dict(brand)
                pg_cursor.execute("SELECT id FROM brands WHERE id = %s", (brand_dict["id"],))
                if pg_cursor.fetchone():
                    logger.info(f"Brand already exists: {brand_dict['name']}")
                    continue
                
                batch_data.append({
                    "id": brand_dict["id"],
                    "name": brand_dict["name"],
                    "organization_id": brand_dict["organization_id"],
                    "website": brand_dict.get("website"),
                    "description": brand_dict.get("description"),
                    "industry": brand_dict.get("industry")
                })
            
            if batch_data:
                # Use Postgres COPY for fast bulk insert
                psycopg2.extras.execute_values(
                    pg_cursor,
                    """
                    INSERT INTO brands (id, name, organization_id, website, description, industry)
                    VALUES %s
                    ON CONFLICT (id) DO NOTHING
                    """,
                    [(
                        item["id"],
                        item["name"],
                        item["organization_id"],
                        item["website"],
                        item["description"],
                        item["industry"]
                    ) for item in batch_data],
                    template=None,
                    page_size=100
                )
                pg_conn.commit()
                logger.info(f"Bulk inserted {len(batch_data)} brands")
            return
        except Exception as e:
            logger.error(f"Error during bulk insert of brands: {e}")
            logger.info("Falling back to Supabase API")
    
    # Fallback to Supabase API
    for brand in brands:
        # Convert SQLite Row to dict
        brand_dict = dict(brand)
        
        # Check if brand already exists
        response = supabase.table("brands").select("*").eq("id", brand_dict["id"]).execute()
        
        if not response.data:
            # Insert brand
            logger.info(f"Adding brand: {brand_dict['name']}")
            supabase.table("brands").insert({
                "id": brand_dict["id"],
                "name": brand_dict["name"],
                "organization_id": brand_dict["organization_id"],
                "website": brand_dict.get("website"),
                "description": brand_dict.get("description"),
                "industry": brand_dict.get("industry"),
            }).execute()
        else:
            logger.info(f"Brand already exists: {brand_dict['name']}")
    
    logger.info(f"Migrated {len(brands)} brands")

def migrate_alerts(sqlite_conn, supabase: Client, pg_conn=None):
    """Migrate alert settings from SQLite to Supabase"""
    logger.info("Migrating alert settings...")
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM alerts")
    alerts = cursor.fetchall()
    
    if not alerts:
        logger.info("No alerts to migrate")
        return
    
    # If we have direct Postgres connection, use it for bulk insert
    if pg_conn:
        try:
            pg_cursor = pg_conn.cursor()
            
            # Prepare data for bulk insert
            batch_data = []
            for alert in alerts:
                alert_dict = dict(alert)
                pg_cursor.execute("SELECT id FROM alerts WHERE id = %s", (alert_dict["id"],))
                if pg_cursor.fetchone():
                    logger.info(f"Alert settings already exist: ID {alert_dict['id']}")
                    continue
                
                batch_data.append({
                    "id": alert_dict["id"],
                    "alert_threshold": alert_dict["alert_threshold"],
                    "email_notifications": bool(alert_dict["email_notifications"]),
                    "plan_queries": alert_dict["plan_queries"],
                    "plan_cost": alert_dict["plan_cost"],
                    "updated_at": alert_dict["updated_at"] or datetime.now().isoformat()
                })
            
            if batch_data:
                # Use Postgres COPY for fast bulk insert
                psycopg2.extras.execute_values(
                    pg_cursor,
                    """
                    INSERT INTO alerts (id, alert_threshold, email_notifications, plan_queries, plan_cost, updated_at)
                    VALUES %s
                    ON CONFLICT (id) DO NOTHING
                    """,
                    [(
                        item["id"],
                        item["alert_threshold"],
                        item["email_notifications"],
                        item["plan_queries"],
                        item["plan_cost"],
                        item["updated_at"]
                    ) for item in batch_data],
                    template=None,
                    page_size=100
                )
                pg_conn.commit()
                logger.info(f"Bulk inserted {len(batch_data)} alert settings")
            return
        except Exception as e:
            logger.error(f"Error during bulk insert of alerts: {e}")
            logger.info("Falling back to Supabase API")
    
    # Fallback to Supabase API
    for alert in alerts:
        # Convert SQLite Row to dict
        alert_dict = dict(alert)
        
        # Check if alert already exists
        response = supabase.table("alerts").select("*").eq("id", alert_dict["id"]).execute()
        
        if not response.data:
            # Insert alert
            logger.info(f"Adding alert settings: ID {alert_dict['id']}")
            supabase.table("alerts").insert({
                "id": alert_dict["id"],
                "alert_threshold": alert_dict["alert_threshold"],
                "email_notifications": bool(alert_dict["email_notifications"]),
                "plan_queries": alert_dict["plan_queries"],
                "plan_cost": alert_dict["plan_cost"],
                "updated_at": alert_dict["updated_at"] or datetime.now().isoformat()
            }).execute()
        else:
            logger.info(f"Alert settings already exist: ID {alert_dict['id']}")
    
    logger.info(f"Migrated {len(alerts)} alert settings")

def migrate_sent_alerts(sqlite_conn, supabase: Client, pg_conn=None):
    """Migrate sent alerts from SQLite to Supabase"""
    logger.info("Migrating sent alerts...")
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM sent_alerts")
    sent_alerts = cursor.fetchall()
    
    if not sent_alerts:
        logger.info("No sent alerts to migrate")
        return
    
    # If we have direct Postgres connection, use it for bulk insert
    if pg_conn:
        try:
            pg_cursor = pg_conn.cursor()
            
            # Prepare data for bulk insert
            batch_data = []
            for alert in sent_alerts:
                alert_dict = dict(alert)
                batch_data.append({
                    "id": alert_dict["id"],
                    "user_id": alert_dict.get("user_id", "default"),
                    "usage_percent": alert_dict["usage_percent"],
                    "threshold_percent": alert_dict["threshold_percent"],
                    "message": alert_dict.get("message", "Alert notification"),
                    "sent_at": alert_dict["sent_at"] or datetime.now().isoformat()
                })
            
            if batch_data:
                # Use Postgres COPY for fast bulk insert
                psycopg2.extras.execute_values(
                    pg_cursor,
                    """
                    INSERT INTO sent_alerts (id, user_id, usage_percent, threshold_percent, message, sent_at)
                    VALUES %s
                    ON CONFLICT (id) DO NOTHING
                    """,
                    [(
                        item["id"],
                        item["user_id"],
                        item["usage_percent"],
                        item["threshold_percent"],
                        item["message"],
                        item["sent_at"]
                    ) for item in batch_data],
                    template=None,
                    page_size=100
                )
                pg_conn.commit()
                logger.info(f"Bulk inserted {len(batch_data)} sent alerts")
            return
        except Exception as e:
            logger.error(f"Error during bulk insert of sent alerts: {e}")
            logger.info("Falling back to Supabase API")
    
    # Fallback to Supabase API
    for alert in sent_alerts:
        # Convert SQLite Row to dict
        alert_dict = dict(alert)
        
        # Insert alert
        logger.info(f"Adding sent alert: ID {alert_dict['id']}")
        supabase.table("sent_alerts").insert({
            "id": alert_dict["id"],
            "user_id": alert_dict.get("user_id", "default"),
            "usage_percent": alert_dict["usage_percent"],
            "threshold_percent": alert_dict["threshold_percent"],
            "message": alert_dict.get("message", "Alert notification"),
            "sent_at": alert_dict["sent_at"] or datetime.now().isoformat()
        }).execute()
    
    logger.info(f"Migrated {len(sent_alerts)} sent alerts")

def migrate_monitoring_tasks(sqlite_conn, supabase: Client, pg_conn=None):
    """Migrate monitoring tasks from SQLite to Supabase"""
    logger.info("Migrating monitoring tasks...")
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM monitoring_tasks")
    tasks = cursor.fetchall()
    
    if not tasks:
        logger.info("No monitoring tasks to migrate")
        return
    
    # If we have direct Postgres connection, use it for bulk insert
    if pg_conn:
        try:
            pg_cursor = pg_conn.cursor()
            
            # Prepare data for bulk insert
            batch_data = []
            for task in tasks:
                task_dict = dict(task)
                pg_cursor.execute("SELECT id FROM monitoring_tasks WHERE id = %s", (task_dict["id"],))
                if pg_cursor.fetchone():
                    logger.info(f"Monitoring task already exists: ID {task_dict['id']}")
                    continue
                
                batch_data.append({
                    "id": task_dict["id"],
                    "brand_id": task_dict["brand_id"],
                    "query_text": task_dict["query_text"],
                    "topic_id": task_dict.get("topic_id"),
                    "frequency_minutes": task_dict.get("frequency_minutes", 60),
                    "llm_type": task_dict.get("llm_type", "openai"),
                    "llm_version": task_dict.get("llm_version", "gpt-4"),
                    "active": bool(task_dict.get("active", 1)),
                    "created_at": task_dict.get("created_at") or datetime.now().isoformat(),
                    "last_run": task_dict.get("last_run"),
                    "next_run": task_dict.get("next_run")
                })
            
            if batch_data:
                # Use Postgres COPY for fast bulk insert
                psycopg2.extras.execute_values(
                    pg_cursor,
                    """
                    INSERT INTO monitoring_tasks (id, brand_id, query_text, topic_id, frequency_minutes,
                                               llm_type, llm_version, active, created_at, last_run, next_run)
                    VALUES %s
                    ON CONFLICT (id) DO NOTHING
                    """,
                    [(
                        item["id"],
                        item["brand_id"],
                        item["query_text"],
                        item["topic_id"],
                        item["frequency_minutes"],
                        item["llm_type"],
                        item["llm_version"],
                        item["active"],
                        item["created_at"],
                        item["last_run"],
                        item["next_run"]
                    ) for item in batch_data],
                    template=None,
                    page_size=100
                )
                pg_conn.commit()
                logger.info(f"Bulk inserted {len(batch_data)} monitoring tasks")
            return
        except Exception as e:
            logger.error(f"Error during bulk insert of monitoring tasks: {e}")
            logger.info("Falling back to Supabase API")
    
    # Fallback to Supabase API
    for task in tasks:
        # Convert SQLite Row to dict
        task_dict = dict(task)
        
        # Check if task already exists
        response = supabase.table("monitoring_tasks").select("*").eq("id", task_dict["id"]).execute()
        
        if not response.data:
            # Insert task
            logger.info(f"Adding monitoring task: ID {task_dict['id']}")
            supabase.table("monitoring_tasks").insert({
                "id": task_dict["id"],
                "brand_id": task_dict["brand_id"],
                "query_text": task_dict["query_text"],
                "topic_id": task_dict.get("topic_id"),
                "frequency_minutes": task_dict.get("frequency_minutes", 60),
                "llm_type": task_dict.get("llm_type", "openai"),
                "llm_version": task_dict.get("llm_version", "gpt-4"),
                "active": bool(task_dict.get("active", 1)),
                "created_at": task_dict.get("created_at") or datetime.now().isoformat(),
                "last_run": task_dict.get("last_run"),
                "next_run": task_dict.get("next_run")
            }).execute()
        else:
            logger.info(f"Monitoring task already exists: ID {task_dict['id']}")
    
    logger.info(f"Migrated {len(tasks)} monitoring tasks")

def migrate_api_usage(sqlite_conn, supabase: Client, pg_conn=None):
    """Migrate API usage data from SQLite to Supabase"""
    logger.info("Migrating API usage data...")
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM api_usage")
    usage_data = cursor.fetchall()
    
    if not usage_data:
        logger.info("No API usage data to migrate")
        return
    
    # If we have direct Postgres connection, use it for bulk insert
    if pg_conn:
        try:
            pg_cursor = pg_conn.cursor()
            
            # Prepare data for bulk insert
            batch_data = []
            for usage in usage_data:
                usage_dict = dict(usage)
                batch_data.append({
                    "id": usage_dict["id"],
                    "user_id": usage_dict.get("user_id", "default"),
                    "request_type": usage_dict["request_type"],
                    "tokens_used": usage_dict["tokens_used"],
                    "cost": usage_dict["cost"],
                    "timestamp": usage_dict.get("timestamp") or datetime.now().isoformat()
                })
            
            if batch_data:
                # Use Postgres COPY for fast bulk insert
                psycopg2.extras.execute_values(
                    pg_cursor,
                    """
                    INSERT INTO api_usage (id, user_id, request_type, tokens_used, cost, timestamp)
                    VALUES %s
                    ON CONFLICT (id) DO NOTHING
                    """,
                    [(
                        item["id"],
                        item["user_id"],
                        item["request_type"],
                        item["tokens_used"],
                        item["cost"],
                        item["timestamp"]
                    ) for item in batch_data],
                    template=None,
                    page_size=100
                )
                pg_conn.commit()
                logger.info(f"Bulk inserted {len(batch_data)} API usage records")
            return
        except Exception as e:
            logger.error(f"Error during bulk insert of API usage data: {e}")
            logger.info("Falling back to Supabase API")
    
    # Fallback to Supabase API
    for usage in usage_data:
        # Convert SQLite Row to dict
        usage_dict = dict(usage)
        
        # Insert API usage data
        logger.info(f"Adding API usage data: ID {usage_dict['id']}")
        supabase.table("api_usage").insert({
            "id": usage_dict["id"],
            "user_id": usage_dict.get("user_id", "default"),
            "request_type": usage_dict["request_type"],
            "tokens_used": usage_dict["tokens_used"],
            "cost": usage_dict["cost"],
            "timestamp": usage_dict.get("timestamp") or datetime.now().isoformat()
        }).execute()
    
    logger.info(f"Migrated {len(usage_data)} API usage records")

def main():
    """Main migration function"""
    # Connect to databases
    try:
        sqlite_conn = connect_to_sqlite()
        supabase = connect_to_supabase()
        
        # Try direct connection first (best for admin operations like migrations)
        pg_conn = connect_to_postgres_direct()
        
        # If direct connection fails, try transaction pooler
        if pg_conn is None:
            pg_conn = connect_to_postgres_pool()
            
        # Check Supabase connection
        response = supabase.table("brands").select("count", count="exact").execute()
        logger.info(f"Supabase connection successful. Current brand count: {response.count}")
        
        # Get all tables from SQLite
        tables = get_table_names(sqlite_conn)
        logger.info(f"Found tables in SQLite: {', '.join(tables)}")
        
        # Perform migrations for core tables
        if "users" in tables:
            migrate_users(sqlite_conn, supabase, pg_conn)
        if "brands" in tables:
            migrate_brands(sqlite_conn, supabase, pg_conn)
        if "alerts" in tables:
            migrate_alerts(sqlite_conn, supabase, pg_conn)
        if "sent_alerts" in tables:
            migrate_sent_alerts(sqlite_conn, supabase, pg_conn)
        if "results" in tables:
            migrate_results(sqlite_conn, supabase, pg_conn)
        if "monitoring_tasks" in tables:
            migrate_monitoring_tasks(sqlite_conn, supabase, pg_conn)
        if "api_usage" in tables:
            migrate_api_usage(sqlite_conn, supabase, pg_conn)
        
        logger.info("Migration completed successfully!")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
    finally:
        if 'sqlite_conn' in locals():
            sqlite_conn.close()
        if 'pg_conn' in locals() and pg_conn:
            pg_conn.close()

if __name__ == "__main__":
    main() 