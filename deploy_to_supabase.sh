#!/bin/bash

# Deploy to Supabase Script
# This script handles the migration from SQLite to Supabase and prepares deployment

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Starting Supabase Migration and Deployment Process ===${NC}"

# Check for .env.prod file
if [ ! -f .env.prod ]; then
    echo -e "${YELLOW}No .env.prod file found. Creating from template...${NC}"
    cp monitoring/.env.example .env.prod
    echo -e "${YELLOW}Please edit .env.prod with your production Supabase credentials before continuing.${NC}"
    exit 1
fi

# Source the environment variables
echo -e "${GREEN}Loading environment variables from .env.prod...${NC}"
export $(grep -v '^#' .env.prod | xargs)

# Verify Supabase credentials
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env.prod${NC}"
    exit 1
fi

# Check for database connections
CONNECTION_TYPE="Supabase API only"
CONNECTION_FLAGS=""

if [ ! -z "$DATABASE_URL" ]; then
    CONNECTION_TYPE="Direct connection"
    CONNECTION_FLAGS="--use-direct"
    echo -e "${GREEN}Using direct database connection for setup and migration.${NC}"
elif [ ! -z "$DB_SESSION_POOLER_URL" ] || [ ! -z "$DB_TRANSACTION_POOLER_URL" ]; then
    CONNECTION_TYPE="Connection poolers"
    echo -e "${YELLOW}Using connection poolers for setup and migration.${NC}"
    echo -e "${YELLOW}For better performance, consider adding DATABASE_URL for direct connection.${NC}"
else
    echo -e "${YELLOW}Warning: No database connection URLs found in .env.prod.${NC}"
    echo -e "${YELLOW}Will proceed with Supabase API only, which may be slower.${NC}"
fi

# Install required dependencies
echo -e "${GREEN}Installing required Python dependencies...${NC}"
pip install -r requirements.txt
pip install gunicorn

# Set up Supabase tables
echo -e "${GREEN}Setting up Supabase tables (${CONNECTION_TYPE})...${NC}"
python setup_supabase.py --env .env.prod ${CONNECTION_FLAGS}

# Check if setup was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to set up Supabase tables. Check the logs above.${NC}"
    exit 1
fi

# Migrate data from SQLite to Supabase
echo -e "${GREEN}Migrating data from SQLite to Supabase...${NC}"
python migrate_to_supabase.py

# Check if migration was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Data migration failed. Check the logs above.${NC}"
    exit 1
fi

# Update CORS settings for production
echo -e "${GREEN}Updating CORS settings for production...${NC}"
# Extract frontend domain from the environment
FRONTEND_DOMAIN=${FRONTEND_DOMAIN:-"*"}

# Update main.py with production CORS settings
# This is a simple replacement; you might want to use a more robust method
sed -i.bak "s/allow_origins=\[\"*\"\]/allow_origins=\[\"$FRONTEND_DOMAIN\"\]/" monitoring/main.py

# Test the backend with Supabase
echo -e "${GREEN}Testing backend with Supabase connection...${NC}"
cd monitoring
python -c "
from database import get_db
supabase = get_db()
result = supabase.table('brands').select('count', count='exact').execute()
print(f'Connection successful. Found {result.count} brands.')
"

# Check if test was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Backend test failed. Check the logs above.${NC}"
    exit 1
fi

# Test direct database connection if available
if [ ! -z "$DATABASE_URL" ]; then
    echo -e "${GREEN}Testing direct database connection...${NC}"
    python -c "
from database import get_db_cursor
with get_db_cursor(use_direct=True) as cursor:
    cursor.execute('SELECT COUNT(*) FROM brands')
    count = cursor.fetchone()[0]
    print(f'Direct connection successful. Found {count} brands.')
"
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}Warning: Direct database connection test failed. Will use other connection methods.${NC}"
    else
        echo -e "${GREEN}Direct database connection is working correctly.${NC}"
    fi
# Test pooler connection if available
elif [ ! -z "$DB_SESSION_POOLER_URL" ]; then
    echo -e "${GREEN}Testing connection pooler...${NC}"
    python -c "
from database import get_db_cursor
with get_db_cursor() as cursor:
    cursor.execute('SELECT COUNT(*) FROM brands')
    count = cursor.fetchone()[0]
    print(f'Connection pooler successful. Found {count} brands.')
"
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}Warning: Connection pooler test failed. Will use Supabase API only.${NC}"
    else
        echo -e "${GREEN}Connection pooler is working correctly.${NC}"
    fi
fi

cd ..

echo -e "${GREEN}=== Migration and deployment preparation complete ===${NC}"
echo -e "${GREEN}You can now deploy your application to a cloud provider.${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Deploy the backend using: ${GREEN}gunicorn monitoring.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8080${NC}"
echo -e "2. Update your frontend API URL configuration to point to your deployed backend"
echo -e "3. Deploy your frontend to a static hosting service"

echo -e "${GREEN}See DEPLOYMENT.md for more detailed instructions.${NC}" 