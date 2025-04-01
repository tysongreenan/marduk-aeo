#!/bin/bash

# Load environment variables
if [ -f .env.prod ]; then
  echo "Loading production environment variables from .env.prod"
  export $(grep -v '^#' .env.prod | xargs)
else
  echo "No .env.prod file found, using existing environment variables"
fi

# Check if PORT environment variable is set (for Render)
if [ -z "$PORT" ]; then
  # Default port if not set
  export PORT=8080
  echo "PORT not set, using default: $PORT"
else
  echo "Using PORT: $PORT"
fi

# Print application info
echo "Starting backend API with the following configuration:"
echo "- SUPABASE_URL: ${SUPABASE_URL:0:25}..." # Only show beginning for security
echo "- FRONTEND_DOMAIN: $FRONTEND_DOMAIN"

# Start the application
cd monitoring
exec gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120 --log-level info 