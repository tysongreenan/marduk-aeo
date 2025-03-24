# Marduk AEO Platform

Answer Engine Optimization Platform for tracking brand visibility in AI-powered search results.

## Features

- **Brand Management**: Track brands and competitors
- **Keyword Tracking**: Monitor keywords and phrases in AI search results
- **Source Influence**: Analyze source influence on AI-generated answers
- **Narrative Analysis**: Identify and shape narratives about your brand

## Getting Started

### Environment Variables

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Update the values in `.env.local` with your Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anon key from Supabase
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key for server operations (keep secret!)

You can find these credentials in your Supabase dashboard under Project Settings > API.

### Installation

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

### Deployment

For deployment on Vercel, add the environment variables to your project settings.

## Technology Stack

- Next.js for the frontend and API routes
- Supabase for database, auth, and edge functions
- TypeScript for type safety
- Tailwind CSS for styling

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
