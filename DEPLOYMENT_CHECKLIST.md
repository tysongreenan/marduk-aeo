# Deployment Checklist

## Prerequisites

- [ ] Supabase project is set up and configured
- [ ] Required API keys (OpenAI, Google AI, Perplexity, SendGrid) are obtained
- [ ] GitHub repository is connected to Render and Vercel
- [ ] Environment variables are prepared

## Backend Deployment Steps (Render)

### Database Setup

- [ ] Run `python setup_supabase.py` to set up initial Supabase tables
- [ ] Run `python setup_logs_table.py` to create logs and reports tables
- [ ] Verify tables are created correctly in Supabase dashboard

### Web Service

- [ ] Create a new Web Service on Render
- [ ] Set repository, branch, and build settings as per RENDER_DEPLOYMENT.md
- [ ] Configure all environment variables (SUPABASE_URL, SUPABASE_KEY, etc.)
- [ ] Deploy the service
- [ ] Verify deployment with health check endpoint `/health`
- [ ] Set custom domain if needed

### Redis Setup

- [ ] Create a new Redis instance on Render
- [ ] Note the Redis URL for use in environment variables
- [ ] Update the Web Service environment variables with REDIS_URL

### Celery Workers

- [ ] Create a Background Worker for Celery worker
- [ ] Set start command to `celery -A celery_worker.celery_app worker --loglevel=info`
- [ ] Configure same environment variables as Web Service
- [ ] Deploy the worker
- [ ] Create a Background Worker for Celery beat
- [ ] Set start command to `celery -A celery_worker.celery_app beat --loglevel=info`
- [ ] Configure same environment variables as Web Service
- [ ] Deploy the scheduler

### Scaling

- [ ] Configure auto-scaling for Web Service (min 1, max 5 instances)
- [ ] Set scaling triggers (CPU, memory, or request count)
- [ ] Monitor initial scaling behavior

## Frontend Deployment Steps (Vercel)

- [ ] Create a new project on Vercel
- [ ] Connect GitHub repository
- [ ] Set frontend directory as root directory if needed
- [ ] Configure environment variables:
  - [ ] NEXT_PUBLIC_API_URL=https://ai-rank-booster-backend.onrender.com
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] Deploy the frontend
- [ ] Verify deployment by accessing frontend URL
- [ ] Set custom domain if needed

## Post-Deployment Testing

### Backend Testing

- [ ] Health check endpoint responds with status 200
- [ ] API key test endpoint validates Supabase connection
- [ ] LLM models endpoint returns available models

### Frontend Testing

- [ ] Login page loads correctly
- [ ] Test login with credentials
- [ ] Dashboard loads with all components

### End-to-End Testing

- [ ] Sign in as "jane@janessbakery.com"
- [ ] Add a new brand
- [ ] Create monitoring tasks
- [ ] Run queries
- [ ] Check dashboard results
- [ ] Generate a report
- [ ] Verify email notification (if SendGrid is configured)

### Performance Testing

- [ ] Check response times for API endpoints
- [ ] Verify Celery tasks are processing
- [ ] Check Redis for any connection issues
- [ ] Monitor CPU and memory usage

## Security Checks

- [ ] All sensitive environment variables are properly set
- [ ] CORS is properly configured (not using wildcard in production)
- [ ] API endpoints are protected with authentication
- [ ] SSL/TLS is enabled for all services
- [ ] Rate limiting is implemented

## Monitoring Setup

- [ ] Log collection is properly configured
- [ ] Error monitoring is set up
- [ ] Performance monitoring is set up
- [ ] Alerts are configured for critical issues

## Production Readiness

- [ ] Documentation is updated with deployment details
- [ ] Team is informed about the new staging environment
- [ ] Rollback plan is documented
- [ ] Backup procedures are in place
- [ ] Monitoring and alerting are configured 