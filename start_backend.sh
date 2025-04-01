#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

# Function to log messages with timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting Marduk AEO backend service..."

# Load environment variables
if [ -f .env.prod ]; then
    log "Loading production environment variables from .env.prod"
    set -o allexport
    source .env.prod
    set +o allexport
else
    log "No .env.prod file found, using existing environment variables"
fi

# Check critical environment variables
log "Checking environment variables..."
REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY" "FRONTEND_DOMAIN")
MISSING_VARS=()

for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        MISSING_VARS+=("$VAR")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    log "ERROR: The following required environment variables are missing: ${MISSING_VARS[*]}"
    # Don't exit - we'll still try to start, but log the warning
fi

# Check if PORT environment variable is set (for Render)
if [ -z "$PORT" ]; then
    # Default port if not set
    export PORT=8080
    log "PORT not set, using default: $PORT"
else
    log "Using PORT: $PORT"
fi

# Print application info (only show partial values for security)
log "Starting backend API with the following configuration:"
if [ -n "$SUPABASE_URL" ]; then
    PARTIAL_URL="${SUPABASE_URL:0:15}..."
    log "- SUPABASE_URL: $PARTIAL_URL"
else
    log "- SUPABASE_URL: NOT SET"
fi

if [ -n "$FRONTEND_DOMAIN" ]; then
    log "- FRONTEND_DOMAIN: $FRONTEND_DOMAIN"
else
    log "- FRONTEND_DOMAIN: NOT SET"
fi

# Change to monitoring directory
cd monitoring
log "Changed to monitoring directory"

# Start the application with proper error handling
log "Starting the application with gunicorn..."
exec gunicorn main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:$PORT \
    --timeout 120 \
    --log-level info \
    --access-logfile - \
    --error-logfile - 