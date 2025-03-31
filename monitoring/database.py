from supabase import create_client, Client
import os
import logging
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from contextlib import contextmanager
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role key for full access

# Initialize direct database connection variables
direct_db_url = os.getenv("DATABASE_URL")  # Direct, non-pooled connection
db_session_url = os.getenv("DB_SESSION_POOLER_URL")  # Session pooler
db_transaction_url = os.getenv("DB_TRANSACTION_POOLER_URL")  # Transaction pooler

# Connection pools
session_pool = None
transaction_pool = None
direct_connection = None

if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables")

def init_supabase() -> Client:
    """Initialize Supabase client with error handling"""
    try:
        return create_client(supabase_url, supabase_key)
    except Exception as e:
        logger.error(f"Error initializing Supabase client: {e}")
        raise

def init_db_pools():
    """Initialize database connection pools if URLs are provided"""
    global session_pool, transaction_pool, direct_connection
    
    # Only initialize if not already done
    if session_pool is None and db_session_url:
        try:
            session_pool = SimpleConnectionPool(1, 20, db_session_url)
            logger.info("Session pool initialized")
        except Exception as e:
            logger.error(f"Error initializing session pool: {e}")
            
    if transaction_pool is None and db_transaction_url:
        try:
            transaction_pool = SimpleConnectionPool(1, 10, db_transaction_url)
            logger.info("Transaction pool initialized")
        except Exception as e:
            logger.error(f"Error initializing transaction pool: {e}")

def get_direct_connection():
    """Get a direct database connection (non-pooled)"""
    if not direct_db_url:
        raise ValueError("DATABASE_URL not set in environment variables")
        
    try:
        return psycopg2.connect(direct_db_url)
    except Exception as e:
        logger.error(f"Error connecting directly to database: {e}")
        raise

@contextmanager
def get_db_connection(use_transaction_pool=False, use_direct=False):
    """
    Get a database connection from the appropriate pool or direct
    
    Args:
        use_transaction_pool: If True, use transaction pooler instead of session pooler
        use_direct: If True, use direct connection instead of poolers (for admin operations)
    """
    global session_pool, transaction_pool
    
    # For direct connections (admin operations)
    if use_direct:
        try:
            connection = get_direct_connection()
            yield connection
        finally:
            if connection:
                connection.close()
        return
    
    # Initialize pools if needed
    if session_pool is None or transaction_pool is None:
        init_db_pools()
    
    pool = transaction_pool if use_transaction_pool else session_pool
    
    if pool is None:
        raise ValueError("Database connection pool not initialized. Check your environment variables.")
    
    try:
        connection = pool.getconn()
        yield connection
    finally:
        pool.putconn(connection)

@contextmanager
def get_db_cursor(commit=False, use_transaction_pool=False, use_direct=False):
    """
    Get a database cursor from a connection
    
    Args:
        commit: If True, commit transaction after operations
        use_transaction_pool: If True, use transaction pooler
        use_direct: If True, use direct connection (for admin operations)
    """
    with get_db_connection(use_transaction_pool, use_direct) as connection:
        cursor = connection.cursor()
        try:
            yield cursor
            if commit:
                connection.commit()
        finally:
            cursor.close()

def get_admin_connection():
    """Get direct, non-pooled connection for admin/maintenance operations"""
    return get_direct_connection()

def get_db() -> Client:
    """Get database connection using Supabase client"""
    try:
        supabase = init_supabase()
        # Verify connection
        supabase.table("brands").select("count", count="exact").limit(1).execute()
        return supabase
    except Exception as e:
        logger.error(f"Error connecting to Supabase: {e}")
        raise

def check_table_exists(supabase: Client, table_name: str) -> bool:
    """Check if a table exists in Supabase"""
    try:
        supabase.table(table_name).select("count", count="exact").limit(1).execute()
        return True
    except Exception:
        return False

def check_table_exists_direct(table_name: str) -> bool:
    """Check if a table exists using direct connection"""
    try:
        with get_db_cursor(use_direct=True) as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    AND table_name = %s
                )
            """, (table_name,))
            return cursor.fetchone()[0]
    except Exception as e:
        logger.error(f"Error checking table existence via direct connection: {e}")
        return False

def create_monitoring_tasks_table(supabase: Client):
    """Create monitoring_tasks table if it doesn't exist"""
    if not check_table_exists(supabase, "monitoring_tasks"):
        logger.info("Creating monitoring_tasks table")
        supabase.postgrest.rpc(
            "exec",
            {
                "command": """
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
            }
        ).execute()
        logger.info("Created monitoring_tasks table")

def create_api_usage_table(supabase: Client):
    """Create api_usage table if it doesn't exist"""
    if not check_table_exists(supabase, "api_usage"):
        logger.info("Creating api_usage table")
        supabase.postgrest.rpc(
            "exec",
            {
                "command": """
                CREATE TABLE IF NOT EXISTS api_usage (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id TEXT NOT NULL,
                    request_type TEXT NOT NULL,
                    tokens_used INTEGER NOT NULL,
                    cost REAL NOT NULL,
                    timestamp TIMESTAMPTZ DEFAULT NOW()
                )
                """
            }
        ).execute()
        logger.info("Created api_usage table")

def bulk_insert(table_name, data, columns=None, use_direct=False):
    """
    Perform a bulk insert operation using direct DB connection for better performance
    
    Args:
        table_name: The table to insert into
        data: List of dictionaries with data to insert
        columns: List of columns to insert (if None, uses all keys from first data item)
        use_direct: If True, use direct connection instead of transaction pool
    """
    if not data:
        return 0
    
    if not columns:
        columns = list(data[0].keys())
    
    # Use appropriate connection type
    with get_db_cursor(commit=True, use_transaction_pool=not use_direct, use_direct=use_direct) as cursor:
        values_list = []
        
        for row in data:
            values = []
            for col in columns:
                values.append(row.get(col))
            values_list.append(tuple(values))
        
        # Create the placeholders for the SQL query
        placeholders = ','.join(['%s'] * len(columns))
        columns_str = ','.join([f'"{col}"' for col in columns])
        
        # Create the query
        query = f'INSERT INTO "{table_name}" ({columns_str}) VALUES ({placeholders})'
        
        # Execute with executemany for efficiency
        cursor.executemany(query, values_list)
        
        return len(data)

def run_admin_query(query, params=None, fetch=False, commit=True):
    """
    Run SQL query with admin privileges using direct connection
    
    Args:
        query: SQL query to execute
        params: Parameters for the query
        fetch: If True, fetch and return results
        commit: If True, commit transaction
    """
    with get_db_cursor(commit=commit, use_direct=True) as cursor:
        cursor.execute(query, params or ())
        if fetch:
            return cursor.fetchall()
        return None

def ensure_tables_exist(supabase: Client):
    """Ensure all necessary tables exist in Supabase"""
    try:
        # Try to use direct connection for checking tables if available
        if direct_db_url:
            logger.info("Using direct connection to check/create tables")
            # Create tables if they don't exist
            if not check_table_exists_direct("monitoring_tasks"):
                with get_db_cursor(commit=True, use_direct=True) as cursor:
                    cursor.execute("""
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
                    """)
                logger.info("Created monitoring_tasks table via direct connection")
            
            if not check_table_exists_direct("api_usage"):
                with get_db_cursor(commit=True, use_direct=True) as cursor:
                    cursor.execute("""
                    CREATE TABLE IF NOT EXISTS api_usage (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id TEXT NOT NULL,
                        request_type TEXT NOT NULL,
                        tokens_used INTEGER NOT NULL,
                        cost REAL NOT NULL,
                        timestamp TIMESTAMPTZ DEFAULT NOW()
                    )
                    """)
                logger.info("Created api_usage table via direct connection")
            
            # Check other tables
            tables_to_check = [
                "alerts", "sent_alerts", "brands", "organizations", 
                "keyword_queries", "query_responses"
            ]
            
            for table in tables_to_check:
                if check_table_exists_direct(table):
                    logger.info(f"Table {table} exists (direct check)")
                else:
                    logger.warning(f"Table {table} doesn't exist - may need to run migrations")
        else:
            # Fallback to Supabase API
            logger.info("Using Supabase API to check/create tables")
            # Create tables if they don't exist
            create_monitoring_tasks_table(supabase)
            create_api_usage_table(supabase)
            
            # Additional tables that should exist from migrations
            tables_to_check = [
                "alerts", "sent_alerts", "brands", "organizations", 
                "keyword_queries", "query_responses"
            ]
            
            for table in tables_to_check:
                if check_table_exists(supabase, table):
                    logger.info(f"Table {table} exists")
                else:
                    logger.warning(f"Table {table} doesn't exist - may need to run migrations")
                
    except Exception as e:
        logger.error(f"Error ensuring tables exist: {e}")
        raise

# Initialize connection pools when module is imported
init_db_pools() 