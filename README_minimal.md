# Marduk AEO - Minimal Backend

This minimal backend approach for Marduk AEO focuses on simplicity and leveraging Supabase's built-in features directly.

## Architecture

The architecture consists of:

1. **Minimal FastAPI Backend**: Only handling essential endpoints that can't be handled directly by Supabase
2. **Supabase Direct Access**: Most database operations handled directly by the frontend through Supabase client
3. **Simplified Deployment**: Optimized for reliable deployment on Render

## Key Benefits

- **Simplified Code Base**: Reduced complexity makes maintenance easier
- **Improved Reliability**: Fewer moving parts means fewer things can break
- **Direct Database Access**: Leveraging Supabase's Row-Level Security for direct frontend access
- **Lower Resource Usage**: Minimal backend needs fewer resources to run

## Setup and Deployment

1. Set required environment variables in your Render dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FRONTEND_DOMAIN`

2. Deploy to Render using the `render.yaml` configuration

## Local Development

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Create a `.env` file with the required environment variables

3. Run the backend:
   ```
   python backend_minimal.py
   ```

## Frontend Integration

The frontend should:

1. Use Supabase client for most database operations (auth, querying, etc.)
2. Only call the backend API for operations that need server-side logic

## API Endpoints

- `/health` - Health check endpoint for Render
- `/api/store-ranking` - Store a ranking analysis result
- `/api/ranking-summary/{user_id}` - Get summary of ranking performance

## Migration Notes

If you need more functionality, you can gradually add it to this minimal backend rather than trying to use the complex version with Redis queues, background workers, etc. 