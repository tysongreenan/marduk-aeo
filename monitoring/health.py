"""
A simple health check FastAPI application for Render deployment.
This file can be used as an alternative entrypoint for the server if the main app
has issues with startup.
"""

from fastapi import FastAPI
import os
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app just for health checks
app = FastAPI(title="Marduk AEO Health Check Service")

@app.get("/")
async def root():
    """Root endpoint redirects to health check"""
    return {"message": "Health check service is running. Use /health for status."}

@app.get("/health")
async def health_check():
    """
    Simple health check endpoint.
    Always returns a 200 OK response to let Render know the service is running.
    """
    logger.info("Health check requested")
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "service": "Marduk AEO Monitoring Service",
        "environment": os.environ.get("ENVIRONMENT", "production")
    }

# Run with:
# uvicorn health:app --host 0.0.0.0 --port $PORT
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    logger.info(f"Starting health check server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port) 