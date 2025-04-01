"""
Monitoring package for Marduk AEO.
This package provides APIs for monitoring and analytics of AI query results.
"""

__version__ = "1.0.0"

# Initialize monitoring package
# This file makes Python treat the directory as a package

# Import key modules to make them directly accessible
try:
    from .main import app
    from .usage_manager import UsageSettings, UsageManager, init_supabase_tables
    from .database import get_db, ensure_tables_exist
    from .dashboard import router as dashboard_router
    from .secure_data_api import router as secure_data_api_router 
    from .ranking_api import router as ranking_api_router
except ImportError as e:
    print(f"Error importing monitoring modules: {e}")
    # Continue even if imports fail, as they may be imported differently 