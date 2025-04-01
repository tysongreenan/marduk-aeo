# Marduk AEO Frontend

This is the main dashboard application for the Marduk AEO platform.

## Real Authentication Setup

By default, the application runs in mock mode with fake data. To use real authentication and data:

1. Create a [Supabase](https://supabase.com) account and project
2. Get your project URL and anonymous key from the Supabase dashboard
3. Edit the `.env` file in this directory:

```
VITE_SUPABASE_URL=https://your-actual-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
VITE_BYPASS_ENV_CHECK=true
```

## Development Mode

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

## Using Test Credentials

When using mock mode, you can log in with these test credentials:

- Email: `test@example.com` 
- Password: `password123`

You can change these in the `.env` file.

## Project Structure

- `/src` - Source code
  - `/components` - UI components
  - `/utils` - Utility functions including Supabase client
  - `/contexts` - React context providers

## Deployment

```bash
# Build for production
npm run build

# Preview the build
npm run preview
```
