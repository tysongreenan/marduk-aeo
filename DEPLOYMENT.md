# Deployment Guide

## Backend Deployment

1. **Environment Setup**
   ```bash
   # Create a production .env file
   cp .env .env.prod
   # Edit .env.prod with production values
   nano .env.prod
   ```

2. **Configure Supabase Connection**
   
   Set up multiple connection types in your `.env.prod` for different use cases:
   ```
   # Supabase API connection
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Direct database connection - for admin operations and migrations (lowest latency)
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.bmzmvnaiqyqvxqfuoory.supabase.co:5432/postgres
   
   # Connection poolers
   # Session pooler - for general read queries (high concurrency)
   DB_SESSION_POOLER_URL=postgresql://postgres.yourproject:[YOUR-PASSWORD]@aws-0-us-east-2.pooler.supabase.com:5432/postgres
   # Transaction pooler - for write operations and transactions (short-lived)
   DB_TRANSACTION_POOLER_URL=postgresql://postgres.yourproject:[YOUR-PASSWORD]@aws-0-us-east-2.pooler.supabase.com:6543/postgres
   ```

3. **Install Production Dependencies**
   ```bash
   pip install gunicorn psycopg2-binary
   pip freeze > requirements.txt
   ```

4. **Run Migration Script**
   ```bash
   # Set up Supabase tables and migrate data
   ./deploy_to_supabase.sh
   ```

5. **Deploy to a Cloud Provider (e.g., DigitalOcean App Platform)**
   - Create a new app
   - Choose Python environment
   - Set environment variables from .env.prod
   - Deploy from your Git repository
   - Configure the following environment variables:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `DATABASE_URL` (direct connection)
     - `DB_SESSION_POOLER_URL` (session pooler)
     - `DB_TRANSACTION_POOLER_URL` (transaction pooler)
     - `SENDGRID_API_KEY` (if using email notifications)
     - `FRONTEND_DOMAIN` (for CORS)

6. **Configure CORS**
   The deployment script will update CORS settings in `main.py` with your frontend domain:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://your-frontend-domain.com"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

## Database Connection Options

Our application now supports three different connection methods to Supabase, each optimized for specific use cases:

1. **Supabase API** - The standard REST API
   - **Connection**: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - **Use cases**: Simple queries, general purpose access
   - **Advantages**: Easy to use, automatic retries, good for low-volume operations
   - **Limitations**: Higher latency, limited batch operations

2. **Direct Database Connection** - Direct PostgreSQL connection
   - **Connection**: `DATABASE_URL` (`postgresql://postgres:[PASSWORD]@db.bmzmvnaiqyqvxqfuoory.supabase.co:5432/postgres`)
   - **Use cases**: Admin operations, schema migrations, database maintenance
   - **Advantages**: Lowest latency, full SQL support, best for migrations
   - **Limitations**: Limited concurrent connections, no automatic scaling

3. **Connection Poolers** - Managed connection pools 
   - **Session Pooler** (`DB_SESSION_POOLER_URL`):
     - For read-heavy operations and queries
     - Supports high concurrency
     - Uses port 5432
   
   - **Transaction Pooler** (`DB_TRANSACTION_POOLER_URL`):
     - For write operations and transactions
     - Best for short-lived connections
     - Uses port 6543

The application automatically selects the most appropriate connection method based on the operation:
- Administrative tasks use direct connection
- Bulk data operations use transaction pooler
- General queries use session pooler
- If preferred connections fail, the system falls back to the next best option

## Connection Selection Priority

1. For admin operations (migrations, schema changes):
   - Direct connection → Transaction pooler → Supabase API

2. For bulk operations (data imports, exports):
   - Transaction pooler → Direct connection → Supabase API
   
3. For read operations (queries, reports):
   - Session pooler → Supabase API → Direct connection

## Frontend Deployment

1. **Build the Frontend**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Deploy to Vercel**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

   Or deploy to Netlify:
   ```bash
   npm install -g netlify-cli
   netlify login
   netlify deploy
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the frontend directory:
   ```
   VITE_API_URL=https://your-backend-domain.com
   ```

4. **Update API URLs**
   Update all API URLs in the frontend components to use the environment variable:
   ```typescript
   const API_URL = import.meta.env.VITE_API_URL
   // Use ${API_URL} instead of http://localhost:8080
   ```

## Running in Production

1. **Start the Backend**
   ```bash
   gunicorn monitoring.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8080
   ```

2. **Start the Frontend**
   ```bash
   cd frontend
   npm run start
   ```

## Health Checks

1. **Backend Health Check**
   ```bash
   curl https://your-backend-domain.com/health
   ```

2. **Frontend Health Check**
   Visit https://your-frontend-domain.com in a browser

## Monitoring

1. **Set Up Application Monitoring**
   - Use DataDog or New Relic for application monitoring
   - Set up alerts for high usage or errors
   - Monitor WebSocket connections

2. **Database Monitoring**
   - Monitor Supabase usage and performance
   - Set up database backups
   - Monitor query performance

## Database Performance

1. **Connection Pooling**
   - Direct connection for admin operations
   - Session pooler for general read queries
   - Transaction pooler for write operations
   - Connection pools are automatically managed by the application

2. **Bulk Operations**
   - For large data migrations, direct database connections are used
   - Batch processing is implemented with `psycopg2.extras.execute_values`
   - Fallback mechanisms ensure operations complete even if preferred connections fail

## Security Considerations

1. **API Security**
   - Use HTTPS for all connections
   - Implement rate limiting
   - Use secure headers
   - Consider implementing JWT authentication instead of basic auth

2. **Database Security**
   - Use row-level security in Supabase
   - Regularly rotate API keys
   - Monitor for suspicious activity
   - Store connection strings securely
   - Use least-privilege database roles for each connection type

## Scaling

1. **Backend Scaling**
   - Use multiple workers with gunicorn
   - Use connection pooling for database connections
   - Use Redis for caching and distributed locking

2. **Frontend Scaling**
   - Use a CDN for static assets
   - Implement caching strategies
   - Use code splitting for better performance

## Troubleshooting

1. **Common Issues**
   - CORS errors: Check CORS configuration
   - WebSocket connection issues: Check firewall settings
   - Database connection issues: Test each connection method separately
   - Connection errors: Verify credentials and network access

2. **Logs**
   - Backend logs: `gunicorn` and application logs
   - Frontend logs: Browser console and network tab
   - Database logs: Supabase dashboard

## Backup and Recovery

1. **Database Backups**
   - Set up automated Supabase backups
   - Store backups in a secure location
   - Test recovery procedures regularly

2. **Application State**
   - Document all environment variables
   - Keep configuration in version control
   - Document deployment procedures 