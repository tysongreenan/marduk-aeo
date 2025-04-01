# Marduk AEO Platform

Answer Engine Optimization Platform for tracking brand visibility in AI-powered search results.

## Features

- **Brand Management**: Track brands and competitors
- **Keyword Tracking**: Monitor keywords and phrases in AI search results
- **Source Influence**: Analyze source influence on AI-generated answers
- **Narrative Analysis**: Identify and shape narratives about your brand

## Investor Demo Mode

The application is configured for easy demonstration:

1. Visit the landing page: https://marduk-aeo.vercel.app/
2. Click "Login" to access the dashboard
3. Use the pre-filled demo credentials:
   - Email: `demo@example.com`
   - Password: `password123`

No account creation required - just click "Sign in" with the pre-filled credentials.

## Technology Stack

- Next.js for the landing page
- Vite/React for the dashboard
- TypeScript for type safety
- ChakraUI for components
- Backend API for data processing

## Project Structure

This project uses a dual-app architecture:

1. **Next.js App (Root Directory)**: Landing page and public-facing content
2. **Vite App (`/frontend` Directory)**: Main dashboard and authenticated functionality

## Deployment

The application is deployed to:
- Landing Page: https://marduk-aeo.vercel.app/ (Vercel)
- Dashboard: https://marduk-aeo-dashboard.vercel.app/ (Vercel)
- Backend API: https://al-rank-booster-backend.onrender.com/ (Render)

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
# Create a .env.local file with your Supabase credentials

# Start the development server
npm run dev
```

## Deployment on Vercel

### 1. Connect to Vercel

1. Create a Vercel account if you don't have one
2. Install the Vercel CLI: `npm i -g vercel`
3. Login to Vercel: `vercel login`

### 2. Set Environment Variables

In your Vercel project settings, add the following environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_AI_API_KEY=your-google-ai-key
```

### 3. Deploy

```bash
# Deploy to Vercel
vercel

# For production deployment
vercel --prod
```

### Supabase Edge Functions

For Supabase Edge Functions, you can deploy them directly from the Supabase CLI:

```bash
# Login to Supabase
npx supabase login

# Link your project
npx supabase link --project-ref your-project-ref

# Deploy an edge function
npx supabase functions deploy prompt-templates
```

## Database Setup

The project uses Supabase for the database. The schema is defined in the migrations folder.

```bash
# Apply migrations
npx supabase db push
```

## Project Structure

This project uses a dual-app architecture:

1. **Next.js App (Root Directory)**: Landing page and public-facing content
2. **Vite App (`/frontend` Directory)**: Main dashboard and authenticated functionality

### Starting Both Applications

To start both applications concurrently:

```bash
# Make the start script executable (first time only)
chmod +x start-dev.sh

# Start both apps
./start-dev.sh
```

This will run:
- Next.js on http://localhost:3000 (landing page)
- Vite on http://localhost:5173 (dashboard and authenticated views)

### Environment Configuration

Both applications require proper environment variables to be set:

1. Create `.env` in the root directory (for Next.js)
2. Create `.env` in the `/frontend` directory (for Vite)

See the `.env.example` file for required variables.

## Using Mock vs. Real Data

This project has two modes:

### Mock Mode (Default)

By default, the frontend app runs in mock mode with fake test data. This is useful for:
- Development without requiring a Supabase account
- Quickly testing UI changes
- Demos and presentations

In mock mode:
- Any email/password combination will work for login
- All data is simulated and not persisted
- You'll see a "MOCK MODE" indicator on the login screen

### Real Authentication Mode

To use real authentication and data:

1. Create a [Supabase](https://supabase.com) account and project
2. Get your Supabase URL and anonymous key from your project dashboard
3. Set up your environment variables:

```bash
# In frontend/.env
VITE_SUPABASE_URL=https://your-actual-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
VITE_BYPASS_ENV_CHECK=true

# In root .env
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
```

4. Restart the development server

Now the app will connect to your real Supabase project for authentication and data storage.
