from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from .database import get_db
from typing import Dict, List
import secrets
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
security = HTTPBasic()

# Basic auth credentials (in production, use proper auth system)
USERNAME = os.getenv("DASHBOARD_USERNAME", "admin")
PASSWORD = os.getenv("DASHBOARD_PASSWORD", "admin")

def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    """Verify HTTP basic auth credentials"""
    correct_username = secrets.compare_digest(credentials.username, USERNAME)
    correct_password = secrets.compare_digest(credentials.password, PASSWORD)
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials

@router.get("/dashboard/usage-trends")
async def get_usage_trends(credentials: HTTPBasicCredentials = Depends(verify_credentials)):
    """Get usage trends data"""
    try:
        supabase = get_db()
        response = supabase.table("usage_trends").select("*").execute()
        return response.data[0] if response.data else {"error": "No data found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/alert-history")
async def get_alert_history(credentials: HTTPBasicCredentials = Depends(verify_credentials)):
    """Get alert history"""
    try:
        supabase = get_db()
        response = supabase.table("alert_history").select("*").order("timestamp.desc").limit(10).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/cost-projection")
async def get_cost_projection(credentials: HTTPBasicCredentials = Depends(verify_credentials)):
    """Get cost projection data"""
    try:
        supabase = get_db()
        response = supabase.table("cost_projections").select("*").execute()
        return response.data[0] if response.data else {"error": "No data found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/summary")
async def get_dashboard_summary(credentials: HTTPBasicCredentials = Depends(verify_credentials)):
    """Get a summary of all dashboard data"""
    try:
        supabase = get_db()
        
        # Get all required data
        usage = supabase.table("usage_trends").select("*").execute()
        alerts = supabase.table("alert_history").select("*").order("timestamp.desc").limit(5).execute()
        costs = supabase.table("cost_projections").select("*").execute()
        
        return {
            "usage_trends": usage.data[0] if usage.data else None,
            "recent_alerts": alerts.data,
            "cost_projection": costs.data[0] if costs.data else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 