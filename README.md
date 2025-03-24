# Marduk AEO

Marduk AEO is an AI-enhanced SEO tool that helps brands monitor and optimize their presence in AI search results.

## Features

- Brand management
- Competitor tracking
- Keyword query monitoring
- Source influence analysis
- Prompt template management
- AI visibility optimization recommendations

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Database, Auth, Edge Functions)
- Recharts for data visualization

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
