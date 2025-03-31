import sys
import os
import json
import asyncio
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client

# Add the parent directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the usage manager
from monitoring.usage_manager import UsageSettings, UsageManager, init_supabase_tables

# Load environment variables
load_dotenv("../monitoring/.env")

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables")

supabase = create_client(supabase_url, supabase_key)

async def test_init_tables():
    """Test initializing tables in Supabase"""
    print("Initializing tables...")
    init_supabase_tables(supabase)
    
    # Verify the tables exist
    try:
        results = supabase.table("results").select("id").limit(1).execute()
        print(f"Results table exists: {bool(results)}")
        
        alerts = supabase.table("alerts").select("id").limit(1).execute()
        print(f"Alerts table exists: {bool(alerts)}")
        
        sent_alerts = supabase.table("sent_alerts").select("id").limit(1).execute()
        print(f"Sent alerts table exists: {bool(sent_alerts)}")
        
        return True
    except Exception as e:
        print(f"Error verifying tables: {e}")
        return False

async def test_usage_manager():
    """Test the UsageManager class"""
    print("\nTesting UsageManager...")
    
    # Create a UsageManager instance
    usage_manager = UsageManager(supabase)
    
    # Test getting usage settings
    print("Getting usage settings...")
    settings = await usage_manager.get_usage_settings()
    print(f"Settings: {settings}")
    
    # Test setting usage alert
    print("\nSetting usage alert...")
    new_settings = UsageSettings(
        alert_threshold=0.8,
        email_notifications=True,
        plan_queries=10000,
        plan_cost=50.0
    )
    result = await usage_manager.set_usage_alert(new_settings)
    print(f"Set usage alert result: {result}")
    
    # Test getting usage stats
    print("\nGetting usage stats...")
    stats = await usage_manager.get_usage_stats(days=30)
    print(f"Usage stats: {json.dumps(stats, indent=2)}")
    
    # Test forecasting usage
    print("\nForecasting usage...")
    forecast = await usage_manager.forecast_usage(days=30)
    print(f"Forecast: {json.dumps(forecast, indent=2)}")
    
    # Test getting internal costs
    print("\nGetting internal costs...")
    costs = await usage_manager.get_internal_costs(days=30)
    print(f"Costs: {json.dumps(costs, indent=2)}")
    
    return True

async def test_insert_sample_data():
    """Test inserting sample data into the results table"""
    print("\nInserting sample data...")
    
    # Create a sample result
    sample_result = {
        "user_id": "test_user",
        "brand_id": "test_brand",
        "topic_id": None,
        "query_text": "Test query",
        "llm_type": "openai",
        "llm_version": "gpt-3.5-turbo",
        "llm_response": "This is a test response for AirankBooster.",
        "brand_mentioned": True,
        "sentiment_score": 0.8,
        "ranking_position": 1,
        "tokens_used": 150,
        "created_at": datetime.now().isoformat()
    }
    
    # Insert into results table
    try:
        result = supabase.table("results").insert(sample_result).execute()
        print(f"Inserted result: {bool(result.data)}")
        return True
    except Exception as e:
        print(f"Error inserting sample data: {e}")
        return False

async def main():
    """Run all tests"""
    print("Running Supabase integration tests...")
    
    # Test initializing tables
    if not await test_init_tables():
        print("Failed to initialize tables. Exiting.")
        return
    
    # Test inserting sample data
    await test_insert_sample_data()
    
    # Test UsageManager
    await test_usage_manager()
    
    print("\nAll tests completed successfully!")

if __name__ == "__main__":
    asyncio.run(main()) 