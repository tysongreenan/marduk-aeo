# WSGI entry point for the application
import os
from dotenv import load_dotenv

# Load environment variables before importing app
load_dotenv()

# Create a custom wrapper for importing app
try:
    # Try the standard import first
    from monitoring.main import app
except ImportError as e:
    print(f"Standard import failed: {e}")
    
    # If that fails, try direct import
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    
    try:
        from monitoring.main import app
    except ImportError as e:
        print(f"Direct import also failed: {e}")
        
        # Last resort: try to modify the app from the main module
        try:
            import monitoring.main as monitoring_main
            
            # Fix Supabase initialization if needed
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            
            if hasattr(monitoring_main, 'supabase'):
                # Try to reinitialize Supabase without the proxy argument
                from supabase import create_client
                monitoring_main.supabase = create_client(supabase_url, supabase_key)
                
            app = monitoring_main.app
        except Exception as e:
            print(f"Failed to load or fix app: {e}")
            raise

# This is needed for gunicorn to find the app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 