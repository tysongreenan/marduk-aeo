"""
WSGI entry point for the monitoring application.
This file allows Gunicorn to run the app without package import issues.
"""
import sys
import os

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the FastAPI app from the monitoring module
from monitoring.main import app

# This is used by Gunicorn to access the FastAPI application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("wsgi:app", host="0.0.0.0", port=8000, reload=True) 