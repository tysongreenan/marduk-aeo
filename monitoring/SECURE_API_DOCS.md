# Secure Data API Documentation

This document provides detailed information about the Secure Data API, a controlled access layer for database operations.

## Overview

The Secure Data API provides controlled, authenticated access to database operations with these key features:

- **Authentication**: API key-based authentication with role-based permissions
- **Input Validation**: Strong data validation for all operations
- **Rate Limiting**: Protection against abuse through rate limiting
- **Audit Logging**: Complete history of all operations
- **SQL Injection Protection**: Parameterized queries and validation
- **Limited Exposure**: Controlled endpoints instead of direct SQL access

## Database Tables

The API relies on these database tables:

### `api_keys`

Stores API keys and their permissions:

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_value TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('read_only', 'read_write', 'admin')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    active BOOLEAN DEFAULT TRUE
);
```

### `audit_logs`

Records all API operations for accountability:

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    operation TEXT NOT NULL,
    table_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL,
    error TEXT,
    ip_address TEXT
);
```

## API Key Management

API keys are securely stored in the database and managed through dedicated endpoints. Each key has:

- A role that determines its permissions
- An expiration date
- A tracking of when it was last used
- An active flag that can be used to revoke access

## API Endpoints

### Authentication

All endpoints require an API key in the `X-API-Key` header.

### Available Endpoints

#### `GET /api/data/tables`

Lists all available tables.

**Required permission**: `read`

**Response**:
```json
{
  "tables": ["users", "products", "orders"]
}
```

#### `POST /api/data/query/select`

Executes a SELECT query.

**Required permission**: `read`

**Request body**:
```json
{
  "table": "users",
  "columns": ["id", "name", "email"],
  "where": {"active": true},
  "limit": 10,
  "offset": 0
}
```

**Response**:
```json
{
  "data": [
    {"id": 1, "name": "User One", "email": "user1@example.com"},
    {"id": 2, "name": "User Two", "email": "user2@example.com"}
  ],
  "count": 2
}
```

#### `POST /api/data/query/insert`

Executes an INSERT query.

**Required permission**: `write`

**Request body**:
```json
{
  "table": "users",
  "data": {
    "name": "New User",
    "email": "new@example.com",
    "active": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "id": 123
}
```

#### `POST /api/data/query/update`

Executes an UPDATE query.

**Required permission**: `write`

**Request body**:
```json
{
  "table": "users",
  "data": {
    "active": false
  },
  "where": {
    "id": 123
  }
}
```

**Response**:
```json
{
  "success": true,
  "rows_affected": 1
}
```

#### `POST /api/data/query/delete`

Executes a DELETE query.

**Required permission**: `write`

**Request body**:
```json
{
  "table": "users",
  "where": {
    "id": 123
  }
}
```

**Response**:
```json
{
  "success": true,
  "rows_affected": 1
}
```

#### `GET /api/data/audit-log`

Gets the audit log with optional filtering.

**Required permission**: `admin`

**Query parameters**:
- `limit` (default: 100): Number of logs to return
- `offset` (default: 0): Number of logs to skip
- `table_filter` (optional): Filter by table name
- `operation_filter` (optional): Filter by operation type

**Response**:
```json
{
  "logs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2023-03-10T12:34:56.789Z",
      "operation": "insert",
      "table_name": "users",
      "user_id": "read_write",
      "details": {"data": {"name": "New User"}},
      "status": "success",
      "ip_address": "192.168.1.1"
    }
  ],
  "total": 1
}
```

#### `POST /api/data/keys/generate`

Generates a new API key.

**Required permission**: `admin`

**Request body**:
```json
{
  "role": "read_only",
  "description": "Client API key",
  "days_valid": 365
}
```

**Response**:
```json
{
  "api_key": "abc123...",
  "role": "read_only",
  "expires_in_days": 365
}
```

#### `GET /api/data/keys`

Lists all API keys (without showing the actual key values).

**Required permission**: `admin`

**Response**:
```json
{
  "keys": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "role": "read_only",
      "description": "Client API key",
      "created_at": "2023-03-10T12:34:56.789Z",
      "expires_at": "2024-03-10T12:34:56.789Z",
      "last_used_at": "2023-03-11T08:15:30.123Z",
      "active": true
    }
  ]
}
```

#### `POST /api/data/keys/{key_id}/revoke`

Revokes an API key.

**Required permission**: `admin`

**Response**:
```json
{
  "success": true,
  "message": "API key revoked"
}
```

#### `POST /api/data/admin/execute`

Executes a custom admin query.

**Required permission**: `admin`

**Request body**:
```json
{
  "query": "SELECT COUNT(*) FROM users WHERE created_at > %s",
  "params": ["2023-01-01"]
}
```

**Response**:
```json
{
  "data": [{"count": 42}],
  "count": 1
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- **200 OK**: Successful operation
- **400 Bad Request**: Invalid input
- **401 Unauthorized**: Invalid API key
- **403 Forbidden**: Insufficient permissions
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server-side error

Error responses include a detail message:

```json
{
  "detail": "Error message"
}
```

Rate limit responses include a `Retry-After` header indicating how many seconds to wait before retrying.

## Client Implementation

See the `client_example.py` file for a complete Python client implementation that handles:

- Authentication
- Request formatting
- Error handling
- Rate limit retries
- API key management

## Security Features

1. **API Key Validation**: Keys are validated against the database, checking for expiration and active status
2. **Automatic Tracking**: Last usage time is tracked for each key
3. **Key Rotation**: Keys can be generated with expiration dates
4. **Audit Logging**: All operations are logged to a database table
5. **IP Tracking**: Client IP addresses are recorded in the audit log
6. **Input Validation**: All inputs are validated to prevent SQL injection
7. **Controlled Schema Access**: Operations are restricted to valid tables and columns
8. **Parameterized Queries**: All SQL is constructed using parameterized queries
9. **Transaction Support**: Write operations use the transaction pooler for atomicity
10. **Rate Limiting**: All endpoints have rate limits to prevent abuse

## Production Usage

This API is ready for production use with these security features:

1. **Database-Backed Authentication**: API keys stored securely in the database
2. **Persistent Audit Logging**: Complete history stored in database
3. **Key Lifecycle Management**: Generate, list, and revoke keys via API
4. **IP Address Logging**: Track IP addresses of all requests
5. **Role-Based Permissions**: Granular control based on roles
6. **Connection Pooling**: Optimized database connections based on operation type

## Security Recommendations

1. **TLS/SSL**: Always use HTTPS in production
2. **Key Management**: Rotate API keys regularly
3. **Monitoring**: Monitor the audit log for suspicious activity
4. **IP Restrictions**: Consider restricting API access by IP address
5. **Principle of Least Privilege**: Grant minimal necessary permissions

## Production Considerations

For production use, improve this implementation by:

1. **Storing API Keys in Database**: Move from in-memory to database storage
2. **Persistent Audit Log**: Save audit log to database
3. **Key Management Interface**: Add admin UI for key management
4. **Additional Validation**: Add business-specific validation rules
5. **Enhanced Monitoring**: Add alerts for suspicious activity
6. **Connection Pooling**: Configure connection pools for optimal performance 