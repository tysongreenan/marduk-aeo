"""
Ranking API - Endpoints for brand ranking monitoring and insights

This module provides API endpoints for:
1. Getting ranking performance data
2. Getting ranking insights
3. Updating the dashboard to focus on rankings
"""

import logging
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query

from .database import get_db_cursor, get_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/dashboard",
    tags=["ranking"],
    responses={
        500: {"description": "Internal Server Error"}
    },
)

@router.get("/ranking-performance", summary="Get brand ranking performance metrics")
async def get_ranking_performance(
    user_id: str = Query(..., description="User ID to get performance for"),
    days: int = Query(7, description="Number of days to analyze")
):
    """
    Get ranking performance metrics for a user's keywords
    
    This endpoint calculates:
    - How many times each keyword was searched
    - How many times the brand appeared in results
    - The appearance percentage
    """
    try:
        start_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        with get_db_cursor() as cursor:
            # First get all keywords for the user's brands
            cursor.execute("""
                SELECT DISTINCT unnest(keywords) as keyword, name as brand_name
                FROM brands
                WHERE user_id = %s
            """, (user_id,))
            
            keyword_results = cursor.fetchall()
            
            if not keyword_results:
                return {"keywords": [], "message": "No keywords found for this user"}
            
            # For each keyword, get search and appearance counts
            performance_data = []
            
            for keyword, brand_name in keyword_results:
                # Get total searches for this keyword
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM search_results
                    WHERE user_id = %s AND keyword = %s AND timestamp > %s
                """, (user_id, keyword, start_date))
                
                total_searches = cursor.fetchone()[0]
                
                # Get appearances (where found=TRUE)
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM search_results
                    WHERE user_id = %s AND keyword = %s AND found = TRUE AND timestamp > %s
                """, (user_id, keyword, start_date))
                
                appearances = cursor.fetchone()[0]
                
                # Calculate percentage
                percentage = (appearances / total_searches * 100) if total_searches > 0 else 0
                
                performance_data.append({
                    "keyword": keyword,
                    "brand_name": brand_name,
                    "searches": total_searches,
                    "appearances": appearances,
                    "percentage": round(percentage, 1)
                })
            
            return {"keywords": performance_data}
            
    except Exception as e:
        logger.error(f"Error getting ranking performance: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting ranking performance: {str(e)}")

@router.get("/ranking-insights", summary="Get insights and recommendations for improving rankings")
async def get_ranking_insights(
    user_id: str = Query(..., description="User ID to get insights for"),
    days: int = Query(7, description="Number of days to analyze")
):
    """
    Get insights and recommended actions for improving rankings
    
    This endpoint:
    - Analyzes responses where the brand didn't appear
    - Identifies patterns in successful rankings
    - Provides actionable recommendations
    """
    try:
        start_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        with get_db_cursor() as cursor:
            # First check if we have pre-calculated insights in the ranking_insights table
            cursor.execute("""
                SELECT keyword, insight, action
                FROM ranking_insights
                WHERE user_id = %s AND created_at > %s
                ORDER BY created_at DESC
            """, (user_id, start_date))
            
            existing_insights = cursor.fetchall()
            
            if existing_insights:
                insights_data = [
                    {
                        "keyword": keyword,
                        "insight": insight,
                        "action": action
                    }
                    for keyword, insight, action in existing_insights
                ]
                return {"insights": insights_data}
            
            # If no pre-calculated insights, generate basic ones based on search data
            cursor.execute("""
                SELECT DISTINCT keyword, brand_name
                FROM search_results
                WHERE user_id = %s AND found = FALSE AND timestamp > %s
                GROUP BY keyword, brand_name
                HAVING COUNT(*) > 2
                ORDER BY COUNT(*) DESC
                LIMIT 5
            """, (user_id, start_date))
            
            low_performing_keywords = cursor.fetchall()
            
            insights_data = []
            for keyword, brand_name in low_performing_keywords:
                # Get sample responses to analyze
                cursor.execute("""
                    SELECT response_text
                    FROM search_results
                    WHERE user_id = %s AND keyword = %s AND found = FALSE AND timestamp > %s
                    AND response_text IS NOT NULL
                    LIMIT 3
                """, (user_id, keyword, start_date))
                
                sample_responses = [row[0] for row in cursor.fetchall()]
                
                # Check if we have enough data for insights
                if not sample_responses:
                    continue
                
                # Generate basic insight (in a real implementation, this would use LLM analysis)
                insight = f"Your brand '{brand_name}' isn't appearing for '{keyword}' searches."
                action = f"Add more content about '{keyword}' to your website and social media."
                
                # Store this insight for future use
                cursor.execute("""
                    INSERT INTO ranking_insights (user_id, brand_id, keyword, insight, action)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    user_id, 
                    "unknown",  # We don't have the brand ID here, would need to be fixed
                    keyword,
                    insight,
                    action
                ))
                
                insights_data.append({
                    "keyword": keyword,
                    "insight": insight,
                    "action": action
                })
            
            return {"insights": insights_data}
            
    except Exception as e:
        logger.error(f"Error getting ranking insights: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting ranking insights: {str(e)}")

@router.post("/update-alerts", summary="Update alert settings including ranking threshold")
async def update_alerts(
    user_id: str,
    alert_type: str,
    threshold: float = None,
    ranking_threshold: float = None
):
    """
    Update alert settings for a user
    
    This endpoint allows updating:
    - Usage threshold (percentage of plan)
    - Ranking threshold (percentage of appearances)
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if alert exists
            cursor.execute("""
                SELECT id FROM alerts
                WHERE user_id = %s AND alert_type = %s
            """, (user_id, alert_type))
            
            existing_alert = cursor.fetchone()
            
            if existing_alert:
                # Update existing alert
                update_fields = []
                params = []
                
                if threshold is not None:
                    update_fields.append("threshold = %s")
                    params.append(threshold)
                
                if ranking_threshold is not None:
                    update_fields.append("ranking_threshold = %s")
                    params.append(ranking_threshold)
                
                if not update_fields:
                    return {"message": "No fields to update"}
                
                query = f"""
                    UPDATE alerts
                    SET {", ".join(update_fields)}
                    WHERE user_id = %s AND alert_type = %s
                    RETURNING id
                """
                params.extend([user_id, alert_type])
                
                cursor.execute(query, params)
                result = cursor.fetchone()
                
                return {"message": "Alert updated successfully", "id": result[0]}
            else:
                # Create new alert
                query = """
                    INSERT INTO alerts (user_id, alert_type, threshold, ranking_threshold)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                """
                cursor.execute(query, (user_id, alert_type, threshold, ranking_threshold))
                result = cursor.fetchone()
                
                return {"message": "Alert created successfully", "id": result[0]}
                
    except Exception as e:
        logger.error(f"Error updating alerts: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating alerts: {str(e)}")

@router.get("/check-ranking-alerts", summary="Check if any keywords have fallen below ranking thresholds")
async def check_ranking_alerts(
    user_id: str = Query(..., description="User ID to check alerts for"),
    days: int = Query(7, description="Number of days to analyze")
):
    """
    Check if any keywords have fallen below ranking thresholds
    
    This endpoint:
    - Gets the user's ranking threshold from alerts
    - Compares current ranking percentages to threshold
    - Returns alerts for keywords below threshold
    """
    try:
        # First get the user's ranking threshold
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT ranking_threshold
                FROM alerts
                WHERE user_id = %s
                LIMIT 1
            """, (user_id,))
            
            result = cursor.fetchone()
            threshold = result[0] if result else 50.0  # Default 50% if not set
            
            # Get ranking performance data
            start_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            cursor.execute("""
                SELECT keyword, COUNT(*) as searches, 
                       SUM(CASE WHEN found THEN 1 ELSE 0 END) as appearances
                FROM search_results
                WHERE user_id = %s AND timestamp > %s
                GROUP BY keyword
                HAVING COUNT(*) > 0
            """, (user_id, start_date))
            
            keyword_stats = cursor.fetchall()
            
            alerts = []
            for keyword, searches, appearances in keyword_stats:
                percentage = (appearances / searches * 100) if searches > 0 else 0
                
                if percentage < threshold:
                    alerts.append({
                        "keyword": keyword,
                        "percentage": round(percentage, 1),
                        "threshold": threshold,
                        "message": f"Your ranking for '{keyword}' dropped to {round(percentage, 1)}%—take action to improve!"
                    })
            
            # Store these alerts
            for alert in alerts:
                cursor.execute("""
                    INSERT INTO sent_alerts (user_id, alert_type, message, created_at)
                    VALUES (%s, %s, %s, NOW())
                """, (user_id, "ranking", alert["message"]))
            
            return {"alerts": alerts}
            
    except Exception as e:
        logger.error(f"Error checking ranking alerts: {e}")
        raise HTTPException(status_code=500, detail=f"Error checking ranking alerts: {str(e)}")

@router.post("/store-search-result", summary="Store a search result with full response text")
async def store_search_result(
    user_id: str,
    keyword: str,
    brand_name: str,
    found: bool,
    response_text: str,
    rank: int = None,
    confidence: float = None
):
    """
    Store a search result with full response text
    
    This endpoint stores:
    - The keyword searched
    - Whether the brand was found
    - The full response text for analysis
    - Optional rank and confidence scores
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            query = """
                INSERT INTO search_results 
                (user_id, keyword, brand_name, found, response_text, rank, confidence)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """
            cursor.execute(query, (
                user_id, keyword, brand_name, found, response_text, rank, confidence
            ))
            result = cursor.fetchone()
            
            return {"message": "Search result stored successfully", "id": result[0]}
            
    except Exception as e:
        logger.error(f"Error storing search result: {e}")
        raise HTTPException(status_code=500, detail=f"Error storing search result: {str(e)}") 