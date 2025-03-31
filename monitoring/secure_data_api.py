"""
Secure Data API - Middleware for controlled database access
This module provides authenticated API endpoints for secure database operations.
"""

import logging
import time
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union

from fastapi import APIRouter, Depends, HTTPException, Header, Request, Body, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field, field_validator

from .database import get_db_cursor, get_db, get_direct_connection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/api/data",
    tags=["data-api"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        500: {"description": "Internal Server Error"}
    },
)

# API Key security scheme
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)

# Request rate limiting
rate_limits = {
    "read": {"max_requests": 100, "window_seconds": 60},
    "write": {"max_requests": 20, "window_seconds": 60},
    "admin": {"max_requests": 10, "window_seconds": 60}
}
request_counters = {}

# Schemas
class AuditLog(BaseModel):
    """Audit log entry schema"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    operation: str
    table_name: str
    user_id: str
    details: Dict[str, Any] = {}
    status: str = "success"
    error: Optional[str] = None
    ip_address: Optional[str] = None

class DataOperation(BaseModel):
    """Base data operation schema"""
    table: str
    operation: str = "select"
    
    @field_validator('operation')
    def operation_must_be_valid(cls, v):
        if v not in ["select", "insert", "update", "delete", "create", "alter"]:
            raise ValueError('Operation must be a valid SQL operation')
        return v
    
    @field_validator('table')
    def table_must_be_valid(cls, v):
        # Add validation for table names to prevent SQL injection
        if not v.isalnum() and not (v.replace('_', '').isalnum()):
            raise ValueError('Table name must be alphanumeric or underscore')
        return v

class SelectOperation(DataOperation):
    """Select operation schema"""
    operation: str = "select"
    columns: List[str] = ["*"]
    where: Optional[Dict[str, Any]] = None
    limit: Optional[int] = 100
    offset: Optional[int] = 0
    
    @field_validator('columns')
    def columns_must_be_valid(cls, v):
        for col in v:
            if col != "*" and not col.isalnum() and not (col.replace('_', '').isalnum()):
                raise ValueError(f'Column name must be alphanumeric or underscore: {col}')
        return v

class InsertOperation(DataOperation):
    """Insert operation schema"""
    operation: str = "insert"
    data: Dict[str, Any]
    
    @field_validator('data')
    def validate_data_fields(cls, v):
        for key in v.keys():
            if not key.isalnum() and not (key.replace('_', '').isalnum()):
                raise ValueError(f'Field name must be alphanumeric or underscore: {key}')
        return v

class UpdateOperation(DataOperation):
    """Update operation schema"""
    operation: str = "update"
    data: Dict[str, Any]
    where: Dict[str, Any]
    
    @field_validator('data')
    def validate_data_fields(cls, v):
        for key in v.keys():
            if not key.isalnum() and not (key.replace('_', '').isalnum()):
                raise ValueError(f'Field name must be alphanumeric or underscore: {key}')
        return v

class DeleteOperation(DataOperation):
    """Delete operation schema"""
    operation: str = "delete"
    where: Dict[str, Any]
    
    @field_validator('where')
    def where_must_not_be_empty(cls, v):
        if not v:
            raise ValueError('Where clause must not be empty for delete operations')
        return v

class APIKeyInfo(BaseModel):
    """API Key information schema"""
    key_id: str
    role: str
    permissions: List[str]

# Authentication and authorization
async def validate_api_key(api_key: str = Header(..., alias=API_KEY_NAME)) -> Dict[str, Any]:
    """Validate API key and return permissions"""
    try:
        # Try to look up the API key in the database
        with get_db_cursor(use_transaction_pool=False) as cursor:
            cursor.execute("""
                SELECT id, role, expires_at, active
                FROM api_keys
                WHERE key_value = %s
            """, (api_key,))
            
            result = cursor.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid API Key",
                )
            
            key_id, role, expires_at, active = result
            
            # Check if key is active
            if not active:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="API Key is inactive",
                )
            
            # Check if key has expired
            if expires_at and datetime.now() > expires_at:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="API Key has expired",
                )
            
            # Update last_used_at timestamp
            cursor.execute("""
                UPDATE api_keys
                SET last_used_at = NOW()
                WHERE id = %s
            """, (key_id,))
            
            # Map role to permissions
            permissions_map = {
                "read_only": ["read"],
                "read_write": ["read", "write"],
                "admin": ["read", "write", "admin"]
            }
            
            permissions = permissions_map.get(role, [])
            
            return {
                "role": role,
                "permissions": permissions,
                "key_id": str(key_id)
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error validating API key",
        )

def check_permission(required_permission: str):
    """Dependency to check for specific permission"""
    def _check_permission(auth_data: Dict[str, Any] = Depends(validate_api_key)):
        if required_permission not in auth_data["permissions"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {required_permission} required",
            )
        return auth_data
    return _check_permission

def check_rate_limit(permission_type: str):
    """Check rate limits based on permission type"""
    def _check_rate_limit(request: Request, auth_data: Dict[str, Any] = Depends(validate_api_key)):
        client_ip = request.client.host
        role = auth_data["role"]
        key = f"{client_ip}:{role}:{permission_type}"
        
        current_time = time.time()
        limit_data = rate_limits.get(permission_type, {"max_requests": 10, "window_seconds": 60})
        
        if key not in request_counters:
            request_counters[key] = {"count": 0, "reset_time": current_time + limit_data["window_seconds"]}
        
        # Reset counter if window has passed
        if current_time > request_counters[key]["reset_time"]:
            request_counters[key] = {"count": 0, "reset_time": current_time + limit_data["window_seconds"]}
        
        # Check limit
        if request_counters[key]["count"] >= limit_data["max_requests"]:
            retry_after = int(request_counters[key]["reset_time"] - current_time)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)}
            )
        
        # Increment counter
        request_counters[key]["count"] += 1
        return auth_data
    return _check_rate_limit

async def log_operation(operation: str, table: str, auth_data: Dict[str, Any], request: Request = None, details: Dict[str, Any] = None, status: str = "success", error: str = None):
    """Log database operation to audit log (stored in database)"""
    try:
        ip_address = request.client.host if request else None
        
        # Store audit log in database
        with get_db_cursor(commit=True, use_transaction_pool=True) as cursor:
            cursor.execute("""
                INSERT INTO audit_logs
                (operation, table_name, user_id, details, status, error, ip_address)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                operation,
                table,
                auth_data["role"],
                json.dumps(details or {}),
                status,
                error,
                ip_address
            ))
            
        logger.info(f"Audit: {operation} on {table} by {auth_data['role']} - {status}")
    except Exception as e:
        logger.error(f"Error logging operation: {e}")

# API Endpoints
@router.get("/tables", summary="List all tables")
async def list_tables(
    request: Request,
    auth_data: Dict[str, Any] = Depends(check_permission("read"))
):
    """List all available tables"""
    try:
        with get_db_cursor(use_direct=True) as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """)
            tables = [row[0] for row in cursor.fetchall()]
            
            await log_operation("list", "tables", auth_data, request)
            return {"tables": tables}
    except Exception as e:
        await log_operation("list", "tables", auth_data, request, status="error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error listing tables: {str(e)}")

@router.post("/query/select", summary="Execute a select query")
async def execute_select(
    operation: SelectOperation,
    request: Request,
    auth_data: Dict[str, Any] = Depends(check_rate_limit("read")),
    _: Dict[str, Any] = Depends(check_permission("read"))
):
    """Execute a select query with specified parameters"""
    try:
        # Build query safely with parameters
        query = f"SELECT {', '.join(operation.columns)} FROM {operation.table}"
        params = []
        
        # Add WHERE clause if specified
        if operation.where:
            where_clauses = []
            for key, value in operation.where.items():
                where_clauses.append(f"{key} = %s")
                params.append(value)
            
            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
        
        # Add LIMIT and OFFSET
        query += f" LIMIT {operation.limit} OFFSET {operation.offset}"
        
        # Execute query
        with get_db_cursor(use_transaction_pool=False) as cursor:
            cursor.execute(query, params)
            columns = [desc[0] for desc in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            await log_operation("select", operation.table, auth_data, request, details={
                "columns": operation.columns,
                "where": operation.where,
                "row_count": len(results)
            })
            
            return {"data": results, "count": len(results)}
    except Exception as e:
        await log_operation("select", operation.table, auth_data, request, 
                     details={"columns": operation.columns, "where": operation.where},
                     status="error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error executing select: {str(e)}")

@router.post("/query/insert", summary="Execute an insert query")
async def execute_insert(
    operation: InsertOperation,
    request: Request,
    auth_data: Dict[str, Any] = Depends(check_rate_limit("write")),
    _: Dict[str, Any] = Depends(check_permission("write"))
):
    """Execute an insert query with specified data"""
    try:
        # Get column names and values
        columns = list(operation.data.keys())
        values = list(operation.data.values())
        
        # Build query safely with parameters
        placeholders = ", ".join(["%s"] * len(values))
        query = f"INSERT INTO {operation.table} ({', '.join(columns)}) VALUES ({placeholders}) RETURNING id"
        
        # Execute query
        with get_db_cursor(commit=True, use_transaction_pool=True) as cursor:
            cursor.execute(query, values)
            result = cursor.fetchone()
            
            await log_operation("insert", operation.table, auth_data, request, details={"data": operation.data})
            
            return {"success": True, "id": result[0] if result else None}
    except Exception as e:
        await log_operation("insert", operation.table, auth_data, request, 
                     details={"data": operation.data},
                     status="error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error executing insert: {str(e)}")

@router.post("/query/update", summary="Execute an update query")
async def execute_update(
    operation: UpdateOperation,
    request: Request,
    auth_data: Dict[str, Any] = Depends(check_rate_limit("write")),
    _: Dict[str, Any] = Depends(check_permission("write"))
):
    """Execute an update query with specified data and where clause"""
    try:
        # Build SET clause
        set_clauses = []
        set_values = []
        for key, value in operation.data.items():
            set_clauses.append(f"{key} = %s")
            set_values.append(value)
        
        # Build WHERE clause
        where_clauses = []
        where_values = []
        for key, value in operation.where.items():
            where_clauses.append(f"{key} = %s")
            where_values.append(value)
        
        # Build query
        query = f"UPDATE {operation.table} SET {', '.join(set_clauses)}"
        if where_clauses:
            query += f" WHERE {' AND '.join(where_clauses)}"
        
        # Execute query
        with get_db_cursor(commit=True, use_transaction_pool=True) as cursor:
            cursor.execute(query, set_values + where_values)
            rows_affected = cursor.rowcount
            
            await log_operation("update", operation.table, auth_data, request, details={
                "data": operation.data,
                "where": operation.where,
                "rows_affected": rows_affected
            })
            
            return {"success": True, "rows_affected": rows_affected}
    except Exception as e:
        await log_operation("update", operation.table, auth_data, request, 
                     details={"data": operation.data, "where": operation.where},
                     status="error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error executing update: {str(e)}")

@router.post("/query/delete", summary="Execute a delete query")
async def execute_delete(
    operation: DeleteOperation,
    request: Request,
    auth_data: Dict[str, Any] = Depends(check_rate_limit("write")),
    _: Dict[str, Any] = Depends(check_permission("write"))
):
    """Execute a delete query with specified where clause"""
    try:
        # Build WHERE clause
        where_clauses = []
        where_values = []
        for key, value in operation.where.items():
            where_clauses.append(f"{key} = %s")
            where_values.append(value)
        
        if not where_clauses:
            raise HTTPException(status_code=400, detail="WHERE clause is required for DELETE operations")
        
        # Build query
        query = f"DELETE FROM {operation.table} WHERE {' AND '.join(where_clauses)}"
        
        # Execute query
        with get_db_cursor(commit=True, use_transaction_pool=True) as cursor:
            cursor.execute(query, where_values)
            rows_affected = cursor.rowcount
            
            await log_operation("delete", operation.table, auth_data, request, details={
                "where": operation.where,
                "rows_affected": rows_affected
            })
            
            return {"success": True, "rows_affected": rows_affected}
    except Exception as e:
        await log_operation("delete", operation.table, auth_data, request, 
                     details={"where": operation.where},
                     status="error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error executing delete: {str(e)}")

@router.get("/audit-log", summary="Get audit log")
async def get_audit_log(
    request: Request,
    limit: int = 100,
    offset: int = 0,
    table_filter: Optional[str] = None,
    operation_filter: Optional[str] = None,
    auth_data: Dict[str, Any] = Depends(check_permission("admin"))
):
    """Get the audit log (admin only)"""
    try:
        params = []
        query = "SELECT * FROM audit_logs WHERE 1=1"
        
        if table_filter:
            query += " AND table_name = %s"
            params.append(table_filter)
            
        if operation_filter:
            query += " AND operation = %s"
            params.append(operation_filter)
            
        query += " ORDER BY timestamp DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        with get_db_cursor(use_transaction_pool=False) as cursor:
            # Get total count first
            count_query = query.replace("SELECT *", "SELECT COUNT(*)")
            count_query = count_query.split("ORDER BY")[0]
            cursor.execute(count_query, params[:-2])
            total = cursor.fetchone()[0]
            
            # Get actual results
            cursor.execute(query, params)
            columns = [desc[0] for desc in cursor.description]
            logs = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            # Make UUID JSON serializable
            for log in logs:
                log['id'] = str(log['id'])
                log['timestamp'] = log['timestamp'].isoformat() if log['timestamp'] else None
            
            await log_operation("read", "audit_logs", auth_data, request)
            
            return {
                "logs": logs,
                "total": total
            }
    except Exception as e:
        await log_operation("read", "audit_logs", auth_data, request, status="error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error getting audit log: {str(e)}")

@router.post("/keys/generate", summary="Generate a new API key")
async def generate_api_key(
    request: Request,
    role: str = Body(...),
    description: str = Body(None),
    days_valid: int = Body(365),
    auth_data: Dict[str, Any] = Depends(check_permission("admin"))
):
    """Generate a new API key (admin only)"""
    try:
        # Validate role
        if role not in ["read_only", "read_write", "admin"]:
            raise HTTPException(status_code=400, detail="Invalid role. Must be read_only, read_write, or admin")
        
        with get_db_cursor(commit=True, use_transaction_pool=True) as cursor:
            cursor.execute("""
                SELECT generate_api_key(%s, %s, %s)
            """, (role, description, days_valid))
            
            key = cursor.fetchone()[0]
            
            await log_operation("generate", "api_keys", auth_data, request, details={
                "role": role,
                "days_valid": days_valid
            })
            
            return {"api_key": key, "role": role, "expires_in_days": days_valid}
    except HTTPException:
        raise
    except Exception as e:
        await log_operation("generate", "api_keys", auth_data, request, status="error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error generating API key: {str(e)}")

@router.get("/keys", summary="List all API keys")
async def list_api_keys(
    request: Request,
    auth_data: Dict[str, Any] = Depends(check_permission("admin"))
):
    """List all API keys without showing the actual keys (admin only)"""
    try:
        with get_db_cursor(use_transaction_pool=False) as cursor:
            cursor.execute("""
                SELECT id, role, description, created_at, expires_at, last_used_at, active
                FROM api_keys
                ORDER BY created_at DESC
            """)
            
            columns = [desc[0] for desc in cursor.description]
            keys = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            # Make UUID and timestamps JSON serializable
            for key in keys:
                key['id'] = str(key['id'])
                key['created_at'] = key['created_at'].isoformat() if key['created_at'] else None
                key['expires_at'] = key['expires_at'].isoformat() if key['expires_at'] else None
                key['last_used_at'] = key['last_used_at'].isoformat() if key['last_used_at'] else None
            
            await log_operation("list", "api_keys", auth_data, request)
            
            return {"keys": keys}
    except Exception as e:
        await log_operation("list", "api_keys", auth_data, request, status="error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error listing API keys: {str(e)}")

@router.post("/keys/{key_id}/revoke", summary="Revoke an API key")
async def revoke_api_key(
    key_id: str,
    request: Request,
    auth_data: Dict[str, Any] = Depends(check_permission("admin"))
):
    """Revoke an API key (admin only)"""
    try:
        with get_db_cursor(commit=True, use_transaction_pool=True) as cursor:
            cursor.execute("""
                UPDATE api_keys
                SET active = FALSE
                WHERE id = %s
                RETURNING id
            """, (key_id,))
            
            result = cursor.fetchone()
            
            if not result:
                raise HTTPException(status_code=404, detail="API key not found")
            
            await log_operation("revoke", "api_keys", auth_data, request, details={"key_id": key_id})
            
            return {"success": True, "message": "API key revoked"}
    except HTTPException:
        raise
    except Exception as e:
        await log_operation("revoke", "api_keys", auth_data, request, status="error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error revoking API key: {str(e)}")

# Admin operations - require admin permission
@router.post("/admin/execute", summary="Execute custom admin query")
async def execute_admin_query(
    request: Request,
    query: str = Body(...),
    params: List[Any] = Body(default=[]),
    auth_data: Dict[str, Any] = Depends(check_rate_limit("admin")),
    _: Dict[str, Any] = Depends(check_permission("admin"))
):
    """Execute a custom query with admin privileges (use with caution)"""
    # Extra validation for admin queries
    if query.strip().upper().startswith(("DROP", "TRUNCATE")):
        raise HTTPException(
            status_code=403,
            detail="Destructive operations are not allowed through the API"
        )
    
    try:
        with get_db_cursor(commit=True, use_direct=True) as cursor:
            cursor.execute(query, params)
            
            # Handle different query types
            if query.strip().upper().startswith("SELECT"):
                columns = [desc[0] for desc in cursor.description]
                results = [dict(zip(columns, row)) for row in cursor.fetchall()]
                response = {"data": results, "count": len(results)}
            else:
                response = {"rows_affected": cursor.rowcount}
            
            await log_operation("admin", "custom_query", auth_data, request, details={
                "query": query,
                "params": params
            })
            
            return response
    except Exception as e:
        await log_operation("admin", "custom_query", auth_data, request, 
                     details={"query": query, "params": params},
                     status="error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error executing query: {str(e)}")

# Add import for json
import json 