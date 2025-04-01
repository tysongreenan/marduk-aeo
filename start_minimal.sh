#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

# Function to log messages with timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting Marduk AEO minimal health check service..."

# Check if PORT environment variable is set (for Render)
if [ -z "$PORT" ]; then
    # Default port if not set
    export PORT=8080
    log "PORT not set, using default: $PORT"
else
    log "Using PORT: $PORT"
fi

# Print application info
log "Starting minimal health check API on port: $PORT"

# Change to monitoring directory
cd monitoring
log "Changed to monitoring directory"

# Start the minimal health check application
log "Starting the minimal health check application..."
exec python -c "
import uvicorn
from health import app
import os
port = int(os.environ.get('PORT', 8080))
print(f'Starting health check server on port {port}')
uvicorn.run(app, host='0.0.0.0', port=port)
" 