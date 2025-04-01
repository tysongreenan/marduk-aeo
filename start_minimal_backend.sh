#!/bin/bash
# Simple startup script for minimal Marduk AEO backend

echo "Starting minimal Marduk AEO backend..."

# Check if PORT environment variable is set (for Render)
if [ -z "$PORT" ]; then
    # Default port if not set
    export PORT=8080
    echo "PORT not set, using default: $PORT"
else
    echo "Using PORT: $PORT"
fi

# Start with gunicorn
echo "Starting the application with gunicorn..."
exec gunicorn backend_minimal:app \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:$PORT \
    --timeout 60 