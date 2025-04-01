"""
Minimal backend API for Marduk AEO.
Provides only essential endpoints that can't be handled directly by Supabase.
"""

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import os
import logging
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Marduk AEO Minimal API")

# Add CORS middleware
frontend_domain = os.getenv("FRONTEND_DOMAIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_domain],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables")

supabase: Client = create_client(supabase_url, supabase_key)

# Models
class RankingResult(BaseModel):
    """Model for storing a ranking analysis result"""
    user_id: str
    brand_id: str
    query_text: str
    brand_mentioned: bool
    sentiment_score: Optional[float] = 0.0
    ranking_position: Optional[int] = 0
    llm_response: str

# Health check endpoint (required by Render)
@app.get("/health")
async def health_check():
    """Health check endpoint for Render"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "service": "Marduk AEO Minimal API"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Marduk AEO Minimal API is running",
        "docs": "/docs"
    }

# Store ranking results - this is one process that benefits from server-side logic
@app.post("/api/store-ranking")
async def store_ranking(result: RankingResult):
    """
    Store a ranking analysis result
    This could be done directly from the frontend with RLS,
    but keeping it here as an example of server-side logic
    """
    try:
        # Insert the result into Supabase
        response = supabase.table("monitoring_results").insert({
            "user_id": result.user_id,
            "brand_id": result.brand_id,
            "query_text": result.query_text,
            "brand_mentioned": result.brand_mentioned,
            "sentiment_score": result.sentiment_score,
            "ranking_position": result.ranking_position,
            "llm_response": result.llm_response,
            "created_at": datetime.now().isoformat()
        }).execute()
        
        return {"success": True, "id": response.data[0]["id"]}
    except Exception as e:
        logger.error(f"Error storing ranking result: {e}")
        raise HTTPException(status_code=500, detail=f"Error storing ranking result: {str(e)}")

# Example of a server-side operation that might need processing logic
@app.get("/api/ranking-summary/{user_id}")
async def get_ranking_summary(user_id: str):
    """
    Get a summary of ranking performance for a user
    Shows how you can do some processing on the server if needed
    """
    try:
        # Get the last 20 results for this user
        response = supabase.table("monitoring_results") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(20) \
            .execute()
        
        results = response.data
        
        if not results:
            return {"summary": "No data available"}
        
        # Process the results to create a summary
        mentions = sum(1 for r in results if r.get("brand_mentioned", False))
        avg_position = sum(r.get("ranking_position", 0) for r in results) / len(results)
        avg_sentiment = sum(r.get("sentiment_score", 0) for r in results) / len(results)
        
        return {
            "summary": {
                "total_queries": len(results),
                "brand_mentioned_count": mentions,
                "brand_mentioned_percent": round((mentions / len(results)) * 100, 1),
                "average_position": round(avg_position, 1),
                "average_sentiment": round(avg_sentiment, 2)
            },
            "trends": {
                "recent_results": [
                    {
                        "query": r.get("query_text", ""),
                        "mentioned": r.get("brand_mentioned", False),
                        "position": r.get("ranking_position", 0),
                        "date": r.get("created_at", "")
                    } for r in results[:5]
                ]
            }
        }
    except Exception as e:
        logger.error(f"Error getting ranking summary: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting ranking summary: {str(e)}")

# Run the app
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port) 