# Render and Vercel Deployment Guide

This guide provides step-by-step instructions for deploying the application to Render (backend) and Vercel (frontend). 

## Backend Deployment (Render)

### 1. Create a Render Account

If you don't already have one, sign up for a [Render account](https://render.com/).

### 2. Create a New Web Service

In your Render dashboard:

1. Click **New** and select **Web Service**.
2. Connect your GitHub repository.
3. Enter the following configuration details:
   - **Name**: `ai-rank-booster-backend`
   - **Environment**: `Python 3`
   - **Region**: Choose the region closest to your users
   - **Branch**: `main` (or your deployment branch)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd monitoring && gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
   - **Plan**: Select according to your needs (at least Starter for production workloads)
   - **Auto-Deploy**: Enable if you want automatic deployments on push

### 3. Configure Environment Variables

Under the **Environment** tab, add the following environment variables:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DATABASE_URL=your_direct_db_connection_string
DB_SESSION_POOLER_URL=your_session_pooler_url
DB_TRANSACTION_POOLER_URL=your_transaction_pooler_url
OPENAI_API_KEY=your_openai_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key
SENDGRID_API_KEY=your_sendgrid_api_key
JWT_SECRET=your_jwt_secret_key
REDIS_URL=your_redis_url
FRONTEND_DOMAIN=https://your-frontend-domain.vercel.app
```

### 4. Setup Redis on Render

1. Click **New** and select **Redis**.
2. Configure your Redis instance:
   - **Name**: `ai-rank-booster-redis`
   - **Plan**: Select according to your needs
   
3. Once created, copy the Redis URL and update the `REDIS_URL` environment variable in your web service.

### 5. Configure Auto-scaling

Under the **Scaling** tab:
1. Set a minimum of 1 instance
2. Set a maximum of 5 instances
3. Configure scaling metrics (CPU usage, memory, or request count)

### 6. Setup Celery Worker

Create a separate Background Worker service on Render:

1. Click **New** and select **Background Worker**.
2. Connect your GitHub repository.
3. Enter the following configuration details:
   - **Name**: `ai-rank-booster-worker`
   - **Environment**: `Python 3`
   - **Region**: Same as your web service
   - **Branch**: `main` (or your deployment branch)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `celery -A celery_worker.celery_app worker --loglevel=info`
   - **Plan**: Select according to your needs

4. Configure the same environment variables as your web service.

### 7. Setup Celery Beat Scheduler

Create another Background Worker service for the scheduler:

1. Click **New** and select **Background Worker**.
2. Connect your GitHub repository.
3. Enter the following configuration details:
   - **Name**: `ai-rank-booster-scheduler`
   - **Environment**: `Python 3`
   - **Region**: Same as your web service
   - **Branch**: `main` (or your deployment branch)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `celery -A celery_worker.celery_app beat --loglevel=info`
   - **Plan**: Select according to your needs

4. Configure the same environment variables as your web service.

## Frontend Deployment (Vercel)

### 1. Create a Vercel Account

If you don't already have one, sign up for a [Vercel account](https://vercel.com/).

### 2. Import Your Repository

1. Click **Add New** and select **Project**.
2. Import your GitHub repository.
3. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend` (if your frontend is in a subdirectory)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### 3. Configure Environment Variables

Under the **Environment Variables** tab, add:

```
NEXT_PUBLIC_API_URL=https://ai-rank-booster-backend.onrender.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Deploy

Click **Deploy** to start the deployment process.

## Post-Deployment Testing

### 1. Sign In

1. Open your frontend application (e.g. https://ai-rank-booster.vercel.app)
2. Sign in with test credentials:
   - Email: jane@janessbakery.com
   - Password: (use your test password)

### 2. End-to-End Test

1. Add a new brand
2. Run several monitoring queries
3. Check the dashboard for results
4. Generate a report
5. Verify that an email is sent via SendGrid

### 3. Check Logs

1. Check Render logs for any backend errors
2. Verify logs in the Supabase database logs table
3. Check log files via Render's shell access: `cat logs/app.log`

### 4. Monitor Performance

1. Monitor response times and error rates in Render dashboard
2. Check CPU and memory usage
3. Monitor Redis memory usage and connection count

## Troubleshooting

### Common Issues

1. **Redis Connection Errors**:
   - Verify Redis URL is correctly set
   - Check if Redis service is running
   - Ensure proper network access between web service and Redis

2. **Celery Worker Issues**:
   - Check celery worker logs for errors
   - Verify Redis connection from worker
   - Ensure all environment variables are set

3. **API Connection Issues**:
   - Verify CORS settings in the backend
   - Check if frontend is using the correct API URL
   - Ensure proper network access between frontend and backend

4. **Database Connection Issues**:
   - Check Supabase connection details
   - Verify service role key permissions
   - Check for database connection limits or throttling

### Scaling Tips

1. Increase maximum instances as traffic grows
2. Monitor Redis memory and consider upgrading as queue size increases
3. Adjust Celery worker count based on task volume
4. Use Render's metrics to identify bottlenecks

## Maintenance

### Regular Updates

1. Update dependencies monthly
2. Schedule database maintenance during off-peak hours
3. Rotate API keys quarterly
4. Review security settings periodically

### Backups

1. Ensure Supabase automated backups are enabled
2. Download periodic local backups of critical data
3. Test restore procedures quarterly

## Production Readiness Checklist

Before promoting to production:

- [ ] SSL/TLS properly configured
- [ ] Rate limiting implemented
- [ ] Authentication and authorization tested
- [ ] Database indexes optimized
- [ ] Error logging and monitoring setup
- [ ] Load testing performed
- [ ] Security scanning completed
- [ ] Data backup procedures tested
- [ ] Disaster recovery plan documented 