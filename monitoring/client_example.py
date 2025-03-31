"""
Client Example - Demonstrates how to use the Secure Data API

This example shows how to:
1. Connect to the secure API with proper authentication
2. Make read requests to fetch data
3. Make write requests to insert, update, and delete data
4. Handle errors and rate limiting
5. Generate, list, and revoke API keys (admin only)
"""

import httpx
import json
import time
import asyncio
from typing import Dict, Any, List, Optional

class SecureAPIClient:
    """Client for interacting with the Secure Data API"""
    
    def __init__(self, base_url: str, api_key: str):
        """
        Initialize the API client
        
        Args:
            base_url: Base URL for the API (e.g., http://localhost:8000)
            api_key: API key for authentication
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.headers = {
            "X-API-Key": api_key,
            "Content-Type": "application/json"
        }
    
    async def list_tables(self) -> List[str]:
        """List all available tables"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/data/tables",
                headers=self.headers
            )
            
            if response.status_code == 200:
                return response.json()["tables"]
            else:
                self._handle_error(response)
    
    async def select(self, table: str, columns: List[str] = None, where: Dict[str, Any] = None, 
                    limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """
        Execute a SELECT query
        
        Args:
            table: Table name
            columns: List of columns to select (default: ["*"])
            where: WHERE conditions as dict (e.g., {"id": 123})
            limit: Maximum number of rows to return
            offset: Number of rows to skip
            
        Returns:
            Dict with "data" (list of rows) and "count" (number of rows)
        """
        data = {
            "table": table,
            "operation": "select",
            "columns": columns or ["*"],
            "limit": limit,
            "offset": offset
        }
        
        if where:
            data["where"] = where
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/data/query/select",
                headers=self.headers,
                json=data
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 429:
                # Handle rate limiting
                retry_after = int(response.headers.get("Retry-After", "5"))
                print(f"Rate limited. Retrying after {retry_after} seconds...")
                time.sleep(retry_after)
                return await self.select(table, columns, where, limit, offset)
            else:
                self._handle_error(response)
    
    async def insert(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an INSERT query
        
        Args:
            table: Table name
            data: Data to insert as dict
            
        Returns:
            Dict with "success" and "id" of the inserted row
        """
        payload = {
            "table": table,
            "operation": "insert",
            "data": data
        }
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/data/query/insert",
                headers=self.headers,
                json=payload
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 429:
                # Handle rate limiting
                retry_after = int(response.headers.get("Retry-After", "5"))
                print(f"Rate limited. Retrying after {retry_after} seconds...")
                time.sleep(retry_after)
                return await self.insert(table, data)
            else:
                self._handle_error(response)
    
    async def update(self, table: str, data: Dict[str, Any], where: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an UPDATE query
        
        Args:
            table: Table name
            data: Data to update as dict
            where: WHERE conditions as dict
            
        Returns:
            Dict with "success" and "rows_affected"
        """
        payload = {
            "table": table,
            "operation": "update",
            "data": data,
            "where": where
        }
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/data/query/update",
                headers=self.headers,
                json=payload
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 429:
                # Handle rate limiting
                retry_after = int(response.headers.get("Retry-After", "5"))
                print(f"Rate limited. Retrying after {retry_after} seconds...")
                time.sleep(retry_after)
                return await self.update(table, data, where)
            else:
                self._handle_error(response)
    
    async def delete(self, table: str, where: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a DELETE query
        
        Args:
            table: Table name
            where: WHERE conditions as dict
            
        Returns:
            Dict with "success" and "rows_affected"
        """
        payload = {
            "table": table,
            "operation": "delete",
            "where": where
        }
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/data/query/delete",
                headers=self.headers,
                json=payload
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 429:
                # Handle rate limiting
                retry_after = int(response.headers.get("Retry-After", "5"))
                print(f"Rate limited. Retrying after {retry_after} seconds...")
                time.sleep(retry_after)
                return await self.delete(table, where)
            else:
                self._handle_error(response)
    
    # API Key Management (Admin only)
    async def generate_api_key(self, role: str, description: str = None, days_valid: int = 365) -> Dict[str, Any]:
        """
        Generate a new API key (admin only)
        
        Args:
            role: Role for the new key ('read_only', 'read_write', or 'admin')
            description: Optional description for the key
            days_valid: Number of days before the key expires
            
        Returns:
            Dict with "api_key", "role", and "expires_in_days"
        """
        payload = {
            "role": role,
            "description": description,
            "days_valid": days_valid
        }
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/data/keys/generate",
                headers=self.headers,
                json=payload
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                self._handle_error(response)
    
    async def list_api_keys(self) -> Dict[str, Any]:
        """
        List all API keys (admin only)
        
        Returns:
            Dict with "keys" (list of API key info without the actual key values)
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/data/keys",
                headers=self.headers
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                self._handle_error(response)
    
    async def revoke_api_key(self, key_id: str) -> Dict[str, Any]:
        """
        Revoke an API key (admin only)
        
        Args:
            key_id: ID of the key to revoke
            
        Returns:
            Dict with "success" and "message"
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/data/keys/{key_id}/revoke",
                headers=self.headers
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                self._handle_error(response)
    
    async def get_audit_log(self, limit: int = 100, offset: int = 0, table_filter: str = None, operation_filter: str = None) -> Dict[str, Any]:
        """
        Get the audit log (admin only)
        
        Args:
            limit: Maximum number of log entries to return
            offset: Number of log entries to skip
            table_filter: Filter logs by table name
            operation_filter: Filter logs by operation type
            
        Returns:
            Dict with "logs" and "total"
        """
        params = {
            "limit": limit,
            "offset": offset
        }
        
        if table_filter:
            params["table_filter"] = table_filter
            
        if operation_filter:
            params["operation_filter"] = operation_filter
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/data/audit-log",
                headers=self.headers,
                params=params
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                self._handle_error(response)
    
    def _handle_error(self, response):
        """Handle API error responses"""
        try:
            error_data = response.json()
            error_message = error_data.get("detail", "Unknown error")
        except:
            error_message = f"Error: HTTP {response.status_code}"
            
        raise Exception(f"API Error ({response.status_code}): {error_message}")


# Example usage
async def main():
    """Example of using the Secure API Client"""
    # Replace with your API URL and key
    base_url = "http://localhost:8000"
    admin_api_key = "YOUR_ADMIN_API_KEY"  # Replace with your admin API key
    
    client = SecureAPIClient(base_url, admin_api_key)
    
    try:
        print("===== API Key Management (Admin Only) =====")
        
        # Generate new API keys
        print("\nGenerating new API keys...")
        
        read_only_key = await client.generate_api_key(
            role="read_only",
            description="Test read-only key",
            days_valid=30
        )
        print(f"Read-only key: {read_only_key['api_key']}")
        
        read_write_key = await client.generate_api_key(
            role="read_write",
            description="Test read-write key",
            days_valid=30
        )
        print(f"Read-write key: {read_write_key['api_key']}")
        
        # List all API keys
        print("\nListing all API keys...")
        keys_result = await client.list_api_keys()
        print(f"Found {len(keys_result['keys'])} API keys:")
        for key in keys_result['keys']:
            print(f"  - {key['id']}: {key['role']} ({key['description']})")
        
        print("\n===== Basic Data Operations =====")
        
        # Create read-only client
        read_client = SecureAPIClient(base_url, read_only_key['api_key'])
        
        # Create read-write client
        write_client = SecureAPIClient(base_url, read_write_key['api_key'])
        
        # List available tables with read-only client
        print("\nListing available tables with read-only client...")
        tables = await read_client.list_tables()
        print(f"Available tables: {tables}")
        
        # Select data example with read-only client
        print("\nSelecting data with read-only client...")
        users_result = await read_client.select(
            table="api_keys",
            columns=["id", "role", "description"],
            limit=5
        )
        print(f"Found {users_result['count']} API keys:")
        for user in users_result["data"]:
            print(f"  - {user['role']} ({user['description']})")
        
        # Insert data example with read-write client
        print("\nInserting data with read-write client...")
        try:
            insert_result = await write_client.insert(
                table="audit_logs",
                data={
                    "operation": "test",
                    "table_name": "test_table",
                    "user_id": "test_user",
                    "status": "success"
                }
            )
            print(f"Inserted log with ID: {insert_result['id']}")
            
            # Try to insert with read-only client (should fail)
            print("\nTrying to insert with read-only client (should fail)...")
            try:
                await read_client.insert(
                    table="audit_logs",
                    data={
                        "operation": "test",
                        "table_name": "test_table",
                        "user_id": "test_user",
                        "status": "success"
                    }
                )
                print("This should have failed!")
            except Exception as e:
                print(f"Expected error: {e}")
            
            # Get audit log
            print("\nGetting audit log...")
            audit_result = await client.get_audit_log(limit=5)
            print(f"Recent audit log entries ({audit_result['total']} total):")
            for log in audit_result["logs"]:
                print(f"  - {log['timestamp']}: {log['operation']} on {log['table_name']} by {log['user_id']}")
            
            # Revoke the read-only key
            print("\nRevoking read-only API key...")
            # Find the key ID
            for key in keys_result['keys']:
                if key['description'] == "Test read-only key":
                    revoke_result = await client.revoke_api_key(key['id'])
                    print(f"Revoke result: {revoke_result['message']}")
                    break
            
            # Try to use revoked key
            print("\nTrying to use revoked key (should fail)...")
            try:
                await read_client.list_tables()
                print("This should have failed!")
            except Exception as e:
                print(f"Expected error: {e}")
                
        except Exception as e:
            print(f"Error during write operations: {e}")
        
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(main()) 