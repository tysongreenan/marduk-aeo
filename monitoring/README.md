# Marduk AEO Monitoring Service

A FastAPI-based service for monitoring brand mentions in LLM responses and tracking AEO performance metrics.

## Features

- **Periodic LLM Querying**: Automatically queries LLMs to check for brand mentions
- **Brand Mention Analysis**: Tracks mentions, sentiment, and position of brands in LLM responses
- **Scheduling System**: Configurable monitoring intervals for different queries
- **Analytics**: Time-series analytics of brand performance in AI responses
- **API Limit Management**: Prevents exceeding rate limits of LLM providers
- **Supabase Integration**: Stores results in your existing Supabase database

## Setup

1. **Install dependencies**

```bash
pip install -r requirements.txt
```

2. **Set up environment variables**

Copy the example .env file and add your credentials:

```bash
cp .env.example .env
```

Edit the `.env` file to add:
- Your Supabase URL and service role key
- LLM API keys (OpenAI, Anthropic, Google)
- Rate limiting preferences

3. **Database setup**

The service uses your existing Supabase database. Make sure you have the following table in your database:

```sql
-- You might need to create a monitoring_tasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS monitoring_tasks (
  id UUID PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id),
  query_text TEXT NOT NULL,
  topic_id UUID REFERENCES topics(id),
  frequency_minutes INTEGER NOT NULL DEFAULT 60,
  llm_type VARCHAR NOT NULL DEFAULT 'openai',
  llm_version VARCHAR NOT NULL DEFAULT 'gpt-4',
  active BOOLEAN NOT NULL DEFAULT true,
  last_run TIMESTAMP WITH TIME ZONE,
  next_run TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Usage

### Start the service

```bash
cd monitoring
uvicorn main:app --reload
```

The service will start on http://localhost:8000

### API Endpoints

- **POST /tasks/**: Create a new monitoring task
- **GET /tasks/**: List all monitoring tasks
- **GET /tasks/{task_id}**: Get a specific task
- **PATCH /tasks/{task_id}**: Update a task
- **DELETE /tasks/{task_id}**: Delete a task
- **GET /results/**: Get query results
- **GET /analytics/{brand_id}**: Get analytics for a brand
- **GET /health**: Health check endpoint

### Example: Create a Monitoring Task

```bash
curl -X POST http://localhost:8000/tasks/ \
  -H "Content-Type: application/json" \
  -d '{
    "brand_id": "a7e8aeb4-5927-4d30-a74a-1eacc52c3b6f",
    "query_text": "What are the best AI-powered advertising platforms?",
    "topic_id": "6290f874-7ba8-4d0c-9eba-5a7ff2aa580f",
    "frequency_minutes": 60,
    "llm_type": "openai",
    "llm_version": "gpt-4",
    "active": true
  }'
```

## Integration with Marduk AEO Platform

This monitoring service is designed to work with your existing Marduk AEO platform:

1. It uses the same Supabase database for data storage
2. Results are stored in your existing tables (keyword_queries, ranking_history)
3. It uses your existing brands, topics, and other data models
4. Analytics align with your platform's metrics and visualization

## Monitoring and Maintenance

- Check the `/health` endpoint for service status
- Monitor your LLM API usage and costs
- Adjust frequency_minutes for tasks based on your needs and API limits
- Review logs for any errors or rate limiting issues 