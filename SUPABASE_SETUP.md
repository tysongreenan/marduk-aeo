# Setting Up Real Supabase Authentication

Follow these steps to set up a real Supabase project for authentication:

## 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up or log in
2. Click "New Project"
3. Enter a name for your project (e.g., "marduk-aeo")
4. Choose a database password (save this somewhere secure)
5. Select a region close to your users
6. Click "Create new project"

## 2. Get Your API Keys

1. In your new Supabase project, go to Project Settings → API
2. You'll find two important keys:
   - **URL**: `https://[your-project-id].supabase.co`
   - **anon key**: Starting with "eyJ..."

## 3. Set Up Authentication

1. In the Supabase dashboard, go to Authentication → Providers
2. Email/Password authentication is enabled by default
3. If desired, you can also enable other methods (Google, GitHub, etc.)

## 4. Configure the Frontend

1. Update the `.env` file in the frontend directory:
   ```
   VITE_API_URL=https://al-rank-booster-backend.onrender.com
   VITE_SUPABASE_URL=https://[your-project-id].supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   VITE_BYPASS_ENV_CHECK=false
   ```

2. Redeploy your frontend application to Render with these environment variables

## 5. Create Initial User Account

1. In your Supabase dashboard, go to Authentication → Users
2. Click "Create User"
3. Enter the email and password for your test user
4. You can optionally add user metadata like:
   ```json
   {
     "organization_id": "Your Company",
     "role": "Admin"
   }
   ```

## 6. Test Your Authentication

1. Visit your deployed frontend app
2. Log in with the credentials you created
3. You should now be able to access the app with your real user account

## Database Setup

For real data storage, you'll need to create the necessary tables in your Supabase database:

1. Go to Table Editor in your Supabase dashboard
2. Create a new table for brands:
   ```sql
   CREATE TABLE brands (
     id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
     name TEXT NOT NULL,
     user_id UUID REFERENCES auth.users(id) NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

3. Create a table for monitoring keywords:
   ```sql
   CREATE TABLE keywords (
     id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
     brand_id UUID REFERENCES brands(id) NOT NULL,
     keyword TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

4. Create a table for tracking search results:
   ```sql
   CREATE TABLE search_results (
     id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
     keyword_id UUID REFERENCES keywords(id) NOT NULL,
     rank INTEGER,
     content TEXT,
     source TEXT,
     search_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

## Row-Level Security (RLS)

To ensure data security, enable Row-Level Security:

1. Go to Table Editor → Select your table → "Policies"
2. Create policies that only allow users to see and manipulate their own data

Example policy for brands table:
```sql
CREATE POLICY "Users can only access their own brands"
ON brands FOR ALL
USING (auth.uid() = user_id);
```

For complete database setup, refer to the `migrate_to_supabase.py` script in the project. 