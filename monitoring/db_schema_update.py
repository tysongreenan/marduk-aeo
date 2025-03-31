"""
Database Schema Update Script

This script updates the Supabase database schema to support the pivot to focusing on
ranking monitoring and insights rather than primarily usage tracking.

Changes:
1. Rename api_usage table to search_results and update schema
2. Add ranking_threshold column to alerts table
3. Create new tables for insights if they don't exist
"""

import os
import sys
import json
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

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
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables")
    sys.exit(1)

supabase = create_client(supabase_url, supabase_key)

def check_table_exists(table_name):
    """Check if a table exists in Supabase"""
    try:
        query = f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public'
                AND table_name = '{table_name}'
            )
        """
        result = supabase.rpc('exec', {'command': query}).execute()
        return result.data[0][0] if result.data else False
    except Exception as e:
        logger.error(f"Error checking if table exists: {e}")
        return False

def create_brands_table_if_missing():
    """Create brands table if it doesn't exist"""
    try:
        brands_exists = check_table_exists('brands')
        
        if not brands_exists:
            logger.info("Creating brands table")
            query = """
                CREATE TABLE brands (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    website TEXT,
                    description TEXT,
                    keywords TEXT[],
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """
            supabase.rpc('exec', {'command': query}).execute()
            logger.info("Created brands table")
        else:
            logger.info("brands table already exists")
            
    except Exception as e:
        logger.error(f"Error creating brands table: {e}")
        raise

def rename_api_usage_to_search_results():
    """Rename api_usage table to search_results and update schema"""
    try:
        # First check if api_usage exists and search_results doesn't
        api_usage_exists = check_table_exists('api_usage')
        search_results_exists = check_table_exists('search_results')
        
        if not api_usage_exists:
            logger.info("api_usage table doesn't exist, creating search_results from scratch")
            # Create search_results table
            query = """
                CREATE TABLE IF NOT EXISTS search_results (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id TEXT NOT NULL,
                    keyword TEXT NOT NULL,
                    brand_name TEXT NOT NULL,
                    timestamp TIMESTAMPTZ DEFAULT NOW(),
                    found BOOLEAN NOT NULL DEFAULT FALSE,
                    response_text TEXT,
                    rank INT,
                    confidence REAL
                )
            """
            supabase.rpc('exec', {'command': query}).execute()
            logger.info("Created search_results table")
            return
            
        if search_results_exists:
            logger.info("search_results table already exists, checking for missing columns")
            # Check if response_text column exists
            query = """
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'search_results' 
                AND column_name = 'response_text'
            """
            result = supabase.rpc('exec', {'command': query}).execute()
            has_response_text = len(result.data) > 0
                
            # Add response_text column if it doesn't exist
            if not has_response_text:
                logger.info("Adding response_text column to search_results")
                query = """
                    ALTER TABLE search_results 
                    ADD COLUMN response_text TEXT
                """
                supabase.rpc('exec', {'command': query}).execute()
                logger.info("Added response_text column to search_results")
            return
            
        # If api_usage exists but search_results doesn't, rename the table
        logger.info("Renaming api_usage to search_results")
        
        # First, create a backup of api_usage
        query = """
            CREATE TABLE api_usage_backup AS 
            SELECT * FROM api_usage
        """
        supabase.rpc('exec', {'command': query}).execute()
        
        # Create the new search_results table with the updated schema
        query = """
            CREATE TABLE search_results (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT NOT NULL,
                keyword TEXT NOT NULL,
                brand_name TEXT NOT NULL,
                timestamp TIMESTAMPTZ DEFAULT NOW(),
                found BOOLEAN NOT NULL DEFAULT FALSE,
                response_text TEXT,
                rank INT,
                confidence REAL
            )
        """
        supabase.rpc('exec', {'command': query}).execute()
        
        # Copy data from api_usage to search_results
        query = """
            INSERT INTO search_results (id, user_id, keyword, brand_name, timestamp, found)
            SELECT id, user_id, request_type, '', timestamp, TRUE
            FROM api_usage
        """
        supabase.rpc('exec', {'command': query}).execute()
        
        # Drop the original api_usage table (can restore from backup if needed)
        query = """
            DROP TABLE api_usage
        """
        supabase.rpc('exec', {'command': query}).execute()
        
        logger.info("Successfully renamed api_usage to search_results with updated schema")
        
    except Exception as e:
        logger.error(f"Error renaming api_usage to search_results: {e}")
        raise

def add_ranking_threshold_to_alerts():
    """Add ranking_threshold column to alerts table"""
    try:
        # Check if alerts table exists
        alerts_exists = check_table_exists('alerts')
        
        if not alerts_exists:
            logger.info("alerts table doesn't exist, creating with ranking_threshold column")
            query = """
                CREATE TABLE alerts (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id TEXT NOT NULL,
                    alert_type TEXT NOT NULL,
                    threshold REAL,
                    ranking_threshold REAL DEFAULT 50.0,
                    message TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    active BOOLEAN DEFAULT TRUE
                )
            """
            supabase.rpc('exec', {'command': query}).execute()
            logger.info("Created alerts table with ranking_threshold")
            return
        
        # Check if ranking_threshold column already exists
        query = """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'alerts' 
            AND column_name = 'ranking_threshold'
        """
        result = supabase.rpc('exec', {'command': query}).execute()
        has_ranking_threshold = len(result.data) > 0
            
        if not has_ranking_threshold:
            logger.info("Adding ranking_threshold column to alerts table")
            query = """
                ALTER TABLE alerts 
                ADD COLUMN ranking_threshold REAL DEFAULT 50.0
            """
            supabase.rpc('exec', {'command': query}).execute()
            logger.info("Added ranking_threshold column to alerts table")
        else:
            logger.info("alerts table already has ranking_threshold column")
            
    except Exception as e:
        logger.error(f"Error adding ranking_threshold to alerts: {e}")
        raise

def create_insights_table():
    """Create ranking_insights table if it doesn't exist"""
    try:
        insights_exists = check_table_exists('ranking_insights')
        
        if not insights_exists:
            logger.info("Creating ranking_insights table")
            query = """
                CREATE TABLE ranking_insights (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id TEXT NOT NULL,
                    brand_id TEXT NOT NULL,
                    keyword TEXT NOT NULL,
                    insight TEXT NOT NULL,
                    action TEXT NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    implemented BOOLEAN DEFAULT FALSE
                )
            """
            supabase.rpc('exec', {'command': query}).execute()
            logger.info("Created ranking_insights table")
        else:
            logger.info("ranking_insights table already exists")
            
    except Exception as e:
        logger.error(f"Error creating insights table: {e}")
        raise

def main():
    """Execute all schema updates"""
    try:
        logger.info("Starting database schema update")
        
        # Create brands table if missing (needed for foreign keys)
        create_brands_table_if_missing()
        
        # Rename api_usage to search_results
        rename_api_usage_to_search_results()
        
        # Add ranking_threshold to alerts
        add_ranking_threshold_to_alerts()
        
        # Create insights table
        create_insights_table()
        
        logger.info("Database schema update completed successfully")
        
    except Exception as e:
        logger.error(f"Database schema update failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 