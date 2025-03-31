"""
Setup script to initialize Supabase tables for deployment.
Run this script to create all necessary tables in Supabase.
"""

import os
import sys
import logging
import argparse
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from supabase import create_client, Client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def parse_args():
    parser = argparse.ArgumentParser(description='Setup Supabase tables for deployment')
    parser.add_argument('--env', type=str, default='.env', help='Path to .env file')
    parser.add_argument('--force', action='store_true', help='Force table creation even if they exist')
    parser.add_argument('--use-direct', action='store_true', help='Use direct database connection for setup')
    return parser.parse_args()

def connect_to_supabase(env_file):
    """Connect to Supabase using credentials from env file"""
    # Load environment variables
    load_dotenv(env_file)
    
    # Supabase configuration
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        raise ValueError("Missing Supabase URL or Key. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file")
    
    try:
        return create_client(supabase_url, supabase_key)
    except Exception as e:
        logger.error(f"Failed to connect to Supabase: {e}")
        sys.exit(1)

def connect_to_postgres_direct(env_file):
    """Connect directly to Postgres for admin operations"""
    # Load environment variables
    load_dotenv(env_file)
    
    # Direct database connection
    direct_db_url = os.getenv("DATABASE_URL")
    
    if not direct_db_url:
        logger.warning("No DATABASE_URL found in .env file. Cannot use direct connection.")
        return None
    
    try:
        conn = psycopg2.connect(direct_db_url)
        logger.info("Connected to Postgres using direct connection")
        return conn
    except Exception as e:
        logger.error(f"Failed to connect directly to Postgres: {e}")
        return None

def check_table_exists(supabase: Client, table_name: str) -> bool:
    """Check if a table exists in Supabase using API"""
    try:
        supabase.table(table_name).select("count", count="exact").limit(1).execute()
        return True
    except Exception:
        return False

def check_table_exists_direct(pg_conn, table_name: str) -> bool:
    """Check if a table exists using direct connection"""
    try:
        cursor = pg_conn.cursor()
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public'
                AND table_name = %s
            )
        """, (table_name,))
        exists = cursor.fetchone()[0]
        cursor.close()
        return exists
    except Exception as e:
        logger.error(f"Error checking table existence via direct connection: {e}")
        return False

def create_table(supabase: Client, table_name: str, sql_command: str, force: bool = False):
    """Create a table in Supabase using API if it doesn't exist or force is True"""
    if force or not check_table_exists(supabase, table_name):
        logger.info(f"Creating {table_name} table via Supabase API")
        try:
            supabase.postgrest.rpc(
                "exec",
                {"command": sql_command}
            ).execute()
            logger.info(f"Created {table_name} table successfully")
            return True
        except Exception as e:
            logger.error(f"Error creating {table_name} table: {e}")
            return False
    else:
        logger.info(f"Table {table_name} already exists, skipping creation")
        return True

def create_table_direct(pg_conn, table_name: str, sql_command: str, force: bool = False):
    """Create a table using direct connection if it doesn't exist or force is True"""
    if force or not check_table_exists_direct(pg_conn, table_name):
        logger.info(f"Creating {table_name} table via direct connection")
        try:
            cursor = pg_conn.cursor()
            cursor.execute(sql_command)
            pg_conn.commit()
            cursor.close()
            logger.info(f"Created {table_name} table successfully")
            return True
        except Exception as e:
            logger.error(f"Error creating {table_name} table: {e}")
            pg_conn.rollback()
            return False
    else:
        logger.info(f"Table {table_name} already exists, skipping creation")
        return True

def create_monitoring_tasks_table(supabase: Client, pg_conn=None, force: bool = False, use_direct: bool = False):
    """Create monitoring_tasks table"""
    sql_command = """
    CREATE TABLE IF NOT EXISTS monitoring_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        brand_id UUID NOT NULL,
        query_text TEXT NOT NULL,
        topic_id UUID,
        frequency_minutes INTEGER NOT NULL DEFAULT 60,
        llm_type TEXT NOT NULL DEFAULT 'openai',
        llm_version TEXT NOT NULL DEFAULT 'gpt-4',
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_run TIMESTAMPTZ,
        next_run TIMESTAMPTZ
    )
    """
    
    if use_direct and pg_conn:
        return create_table_direct(pg_conn, "monitoring_tasks", sql_command, force)
    else:
        return create_table(supabase, "monitoring_tasks", sql_command, force)

def create_api_usage_table(supabase: Client, pg_conn=None, force: bool = False, use_direct: bool = False):
    """Create api_usage table"""
    sql_command = """
    CREATE TABLE IF NOT EXISTS api_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        request_type TEXT NOT NULL,
        tokens_used INTEGER NOT NULL,
        cost REAL NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW()
    )
    """
    
    if use_direct and pg_conn:
        return create_table_direct(pg_conn, "api_usage", sql_command, force)
    else:
        return create_table(supabase, "api_usage", sql_command, force)

def create_alerts_table(supabase: Client, pg_conn=None, force: bool = False, use_direct: bool = False):
    """Create alerts table"""
    sql_command = """
    CREATE TABLE IF NOT EXISTS alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        alert_threshold REAL NOT NULL DEFAULT 0.8,
        email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
        plan_queries INTEGER NOT NULL DEFAULT 10000,
        plan_cost REAL NOT NULL DEFAULT 50.0,
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )
    """
    
    success = False
    if use_direct and pg_conn:
        success = create_table_direct(pg_conn, "alerts", sql_command, force)
    else:
        success = create_table(supabase, "alerts", sql_command, force)
    
    # Insert default alert settings if table is empty
    if success:
        try:
            if use_direct and pg_conn:
                # Check if there are any records
                cursor = pg_conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM alerts")
                count = cursor.fetchone()[0]
                
                if count == 0:
                    logger.info("Inserting default alert settings via direct connection")
                    cursor.execute("""
                    INSERT INTO alerts (alert_threshold, email_notifications, plan_queries, plan_cost)
                    VALUES (0.8, TRUE, 10000, 50.0)
                    """)
                    pg_conn.commit()
                cursor.close()
            else:
                result = supabase.table("alerts").select("*").execute()
                if not result.data:
                    logger.info("Inserting default alert settings via Supabase API")
                    supabase.table("alerts").insert({
                        "alert_threshold": 0.8,
                        "email_notifications": True,
                        "plan_queries": 10000,
                        "plan_cost": 50.0
                    }).execute()
        except Exception as e:
            logger.error(f"Error inserting default alert settings: {e}")
    
    return success

def create_sent_alerts_table(supabase: Client, pg_conn=None, force: bool = False, use_direct: bool = False):
    """Create sent_alerts table"""
    sql_command = """
    CREATE TABLE IF NOT EXISTS sent_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL DEFAULT 'default',
        usage_percent REAL NOT NULL,
        threshold_percent REAL NOT NULL,
        message TEXT NOT NULL DEFAULT 'Usage alert notification',
        sent_at TIMESTAMPTZ DEFAULT NOW()
    )
    """
    
    if use_direct and pg_conn:
        return create_table_direct(pg_conn, "sent_alerts", sql_command, force)
    else:
        return create_table(supabase, "sent_alerts", sql_command, force)

def create_all_tables(supabase: Client, pg_conn=None, force: bool = False, use_direct: bool = False):
    """Create all necessary tables"""
    tables_created = 0
    tables_total = 4
    
    if create_monitoring_tasks_table(supabase, pg_conn, force, use_direct):
        tables_created += 1
        
    if create_api_usage_table(supabase, pg_conn, force, use_direct):
        tables_created += 1
        
    if create_alerts_table(supabase, pg_conn, force, use_direct):
        tables_created += 1
        
    if create_sent_alerts_table(supabase, pg_conn, force, use_direct):
        tables_created += 1
    
    return tables_created, tables_total

def main():
    args = parse_args()
    logger.info(f"Setting up Supabase tables using {args.env}")
    
    # Connect to Supabase
    supabase = connect_to_supabase(args.env)
    
    # Connect to Postgres directly if requested
    pg_conn = None
    if args.use_direct:
        pg_conn = connect_to_postgres_direct(args.env)
        if not pg_conn:
            logger.warning("Direct connection not available, falling back to Supabase API")
    
    # Create tables
    tables_created, tables_total = create_all_tables(
        supabase, 
        pg_conn, 
        args.force, 
        args.use_direct and pg_conn is not None
    )
    
    # Close direct connection if used
    if pg_conn:
        pg_conn.close()
    
    logger.info(f"Setup complete. Created {tables_created}/{tables_total} tables")
    
    if tables_created < tables_total:
        logger.warning("Some tables could not be created. Check the logs for details.")
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main()) 