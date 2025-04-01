#!/bin/bash
# Minimal startup script for Render

echo "Starting minimal backend script..."

# Check if PORT environment variable is set (for Render)
if [ -z "$PORT" ]; then
    # Default port if not set
    export PORT=8080
    echo "PORT not set, using default: $PORT"
else
    echo "Using PORT: $PORT"
fi

# Start the application with gunicorn using the wsgi entry point
echo "Starting the application with gunicorn..."
exec gunicorn wsgi:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT 