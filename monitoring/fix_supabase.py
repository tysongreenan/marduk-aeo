"""
Helper module to fix Supabase initialization issues
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client

def create_supabase_client() -> Client:
    """Create a Supabase client with proper error handling"""
    # Load environment variables
    load_dotenv()
    
    # Get Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables")
    
    # Create client without proxy argument
    try:
        # First try without any extra arguments
        return create_client(supabase_url, supabase_key)
    except TypeError as e:
        if "proxy" in str(e):
            print("Warning: Supabase client initialization failed due to proxy argument")
            # Try with a more compatible approach if needed
            import httpx
            from postgrest.client import PostgrestClient
            from gotrue.client import GoTrueClient
            from storage.client import StorageClient
            from realtime.client import RealtimeClient
            from functions.client import FunctionsClient
            
            # Create a custom client without using proxy
            client = Client(
                supabase_url=supabase_url, 
                supabase_key=supabase_key
            )
            
            # Initialize manually if needed
            client.auth = GoTrueClient(
                url=f"{supabase_url}/auth/v1",
                headers={"apiKey": supabase_key}
            )
            
            return client
        else:
            # If it's some other error, re-raise
            raise 