# Setting Up Stripe Payments with Supabase

This document provides a step-by-step guide to set up Stripe payments for subscriptions using Supabase.

## Prerequisites

- A Supabase project (https://app.supabase.com)
- A Stripe account (https://dashboard.stripe.com/register)
- Node.js and npm installed on your machine

## Step 1: Set up Stripe

1. Create a Stripe account if you don't already have one.
2. In your Stripe Dashboard, go to Developers > API keys.
3. Note your **Publishable key** and **Secret key** for later use.

## Step 2: Set up Supabase Functions

Supabase Edge Functions are serverless functions that allow you to run custom code without managing servers.

1. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Initialize Supabase in your project (if not already done):
   ```bash
   supabase init
   ```

3. Create Supabase Edge Functions for Stripe:

   a. Create a function for handling Stripe Checkout:
   ```bash
   supabase functions new create-checkout-session
   ```

   b. Edit the function at `supabase/functions/create-checkout-session/index.ts`:
   ```typescript
   import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
   import Stripe from 'https://esm.sh/stripe@12.0.0'

   const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
   const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
   const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') as string

   const stripe = new Stripe(stripeKey, {
     apiVersion: '2022-11-15',
     httpClient: Stripe.createFetchHttpClient(),
   })

   const supabase = createClient(supabaseUrl, supabaseKey)

   serve(async (req) => {
     const { price_id, success_url, cancel_url, customer_email } = await req.json()

     // Get the user from Supabase auth
     const authHeader = req.headers.get('Authorization')!
     const token = authHeader.replace('Bearer ', '')
     
     const { data: { user }, error: userError } = await supabase.auth.getUser(token)
     
     if (userError || !user) {
       return new Response(
         JSON.stringify({ error: 'Unauthorized' }),
         { status: 401, headers: { 'Content-Type': 'application/json' } }
       )
     }

     // Get customer ID if it exists
     const { data: customerData } = await supabase
       .from('customers')
       .select('stripe_customer_id')
       .eq('id', user.id)
       .single()

     let customer_id = customerData?.stripe_customer_id

     // If customer doesn't exist, create one
     if (!customer_id) {
       const customer = await stripe.customers.create({
         email: customer_email || user.email,
         metadata: {
           supabase_id: user.id,
         },
       })
       
       customer_id = customer.id
       
       // Save the customer ID
       await supabase
         .from('customers')
         .insert([{ id: user.id, stripe_customer_id: customer_id }])
     }

     // Create checkout session
     const session = await stripe.checkout.sessions.create({
       customer: customer_id,
       line_items: [
         {
           price: price_id,
           quantity: 1,
         },
       ],
       mode: 'subscription',
       success_url: success_url || `${req.headers.get('origin')}/account`,
       cancel_url: cancel_url || `${req.headers.get('origin')}/pricing`,
       subscription_data: {
         metadata: {
           user_id: user.id,
         },
       },
     })

     return new Response(
       JSON.stringify({ sessionId: session.id }),
       { status: 200, headers: { 'Content-Type': 'application/json' } }
     )
   })
   ```

   c. Create a function for the customer portal:
   ```bash
   supabase functions new create-portal-session
   ```

   d. Edit the function at `supabase/functions/create-portal-session/index.ts`:
   ```typescript
   import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
   import Stripe from 'https://esm.sh/stripe@12.0.0'

   const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
   const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
   const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') as string

   const stripe = new Stripe(stripeKey, {
     apiVersion: '2022-11-15',
     httpClient: Stripe.createFetchHttpClient(),
   })

   const supabase = createClient(supabaseUrl, supabaseKey)

   serve(async (req) => {
     const { return_url } = await req.json()

     // Get the user from Supabase auth
     const authHeader = req.headers.get('Authorization')!
     const token = authHeader.replace('Bearer ', '')
     
     const { data: { user }, error: userError } = await supabase.auth.getUser(token)
     
     if (userError || !user) {
       return new Response(
         JSON.stringify({ error: 'Unauthorized' }),
         { status: 401, headers: { 'Content-Type': 'application/json' } }
       )
     }

     // Get the customer ID
     const { data: customerData } = await supabase
       .from('customers')
       .select('stripe_customer_id')
       .eq('id', user.id)
       .single()

     if (!customerData?.stripe_customer_id) {
       return new Response(
         JSON.stringify({ error: 'Customer not found' }),
         { status: 404, headers: { 'Content-Type': 'application/json' } }
       )
     }

     // Create portal session
     const session = await stripe.billingPortal.sessions.create({
       customer: customerData.stripe_customer_id,
       return_url: return_url || `${req.headers.get('origin')}/account`,
     })

     return new Response(
       JSON.stringify({ url: session.url }),
       { status: 200, headers: { 'Content-Type': 'application/json' } }
     )
   })
   ```

4. Set up Stripe webhooks:
   ```bash
   supabase functions new stripe-webhook
   ```
   
   Edit the function at `supabase/functions/stripe-webhook/index.ts`:
   ```typescript
   import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
   import Stripe from 'https://esm.sh/stripe@12.0.0'

   const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
   const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
   const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') as string
   const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string

   const stripe = new Stripe(stripeKey, {
     apiVersion: '2022-11-15',
     httpClient: Stripe.createFetchHttpClient(),
   })

   const supabase = createClient(supabaseUrl, supabaseKey)

   serve(async (req) => {
     const signature = req.headers.get('Stripe-Signature')
     if (!signature) {
       return new Response(
         JSON.stringify({ error: 'Stripe signature missing' }),
         { status: 400, headers: { 'Content-Type': 'application/json' } }
       )
     }

     const body = await req.text()
     let event

     try {
       event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
     } catch (err) {
       return new Response(
         JSON.stringify({ error: `Webhook Error: ${err.message}` }),
         { status: 400, headers: { 'Content-Type': 'application/json' } }
       )
     }

     // Handle the event
     switch (event.type) {
       case 'customer.subscription.created':
       case 'customer.subscription.updated':
         const subscription = event.data.object
         await handleSubscriptionChange(subscription)
         break
       case 'customer.subscription.deleted':
         const deletedSubscription = event.data.object
         await handleSubscriptionDeletion(deletedSubscription)
         break
       case 'product.created':
       case 'product.updated':
         const product = event.data.object
         await upsertProduct(product)
         break
       case 'price.created':
       case 'price.updated':
         const price = event.data.object
         await upsertPrice(price)
         break
     }

     return new Response(JSON.stringify({ received: true }), {
       headers: { 'Content-Type': 'application/json' },
     })
   })

   // Utility functions
   async function handleSubscriptionChange(subscription) {
     // Get user ID from subscription metadata
     const userId = subscription.metadata.user_id

     // If we can't find a user ID in metadata, try to look up by customer
     if (!userId) {
       const { data: customerData } = await supabase
         .from('customers')
         .select('id')
         .eq('stripe_customer_id', subscription.customer)
         .single()
       
       if (!customerData) return
     }

     // Update or insert subscription
     await supabase
       .from('subscriptions')
       .upsert({
         id: subscription.id,
         user_id: userId,
         status: subscription.status,
         price_id: subscription.items.data[0].price.id,
         quantity: subscription.items.data[0].quantity,
         cancel_at_period_end: subscription.cancel_at_period_end,
         created: new Date(subscription.created * 1000).toISOString(),
         current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
         current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
         ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
         cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
         canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
         trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
         trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
       })
   }

   async function handleSubscriptionDeletion(subscription) {
     // Mark the subscription as canceled in your database
     await supabase
       .from('subscriptions')
       .update({
         status: 'canceled',
         ended_at: new Date(subscription.ended_at * 1000).toISOString(),
       })
       .eq('id', subscription.id)
   }

   async function upsertProduct(product) {
     // Upsert product data
     await supabase
       .from('products')
       .upsert({
         id: product.id,
         active: product.active,
         name: product.name,
         description: product.description,
         image: product.images?.[0] ?? null,
         metadata: product.metadata,
       })
   }

   async function upsertPrice(price) {
     // Upsert price data
     await supabase
       .from('prices')
       .upsert({
         id: price.id,
         product_id: price.product,
         active: price.active,
         currency: price.currency,
         description: price.nickname,
         type: price.type,
         unit_amount: price.unit_amount,
         interval: price.recurring?.interval ?? null,
         interval_count: price.recurring?.interval_count ?? null,
         trial_period_days: price.recurring?.trial_period_days ?? null,
         metadata: price.metadata,
       })
   }
   ```

5. Deploy the functions:
   ```bash
   supabase functions deploy --no-verify-jwt create-checkout-session
   supabase functions deploy --no-verify-jwt create-portal-session
   supabase functions deploy --no-verify-jwt stripe-webhook
   ```

6. Set environment variables for the functions:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=your_stripe_secret_key
   supabase secrets set STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   ```

## Step 3: Set up Supabase Database Schema

1. Create the necessary tables in your Supabase database:

   ```sql
   -- Create customers table
   CREATE TABLE customers (
     id UUID REFERENCES auth.users(id) PRIMARY KEY,
     stripe_customer_id TEXT UNIQUE
   );

   -- Create subscriptions table
   CREATE TABLE subscriptions (
     id TEXT PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id) NOT NULL,
     status TEXT,
     metadata JSONB,
     price_id TEXT,
     quantity INT,
     cancel_at_period_end BOOLEAN,
     created TIMESTAMP WITH TIME ZONE,
     current_period_start TIMESTAMP WITH TIME ZONE,
     current_period_end TIMESTAMP WITH TIME ZONE,
     ended_at TIMESTAMP WITH TIME ZONE,
     cancel_at TIMESTAMP WITH TIME ZONE,
     canceled_at TIMESTAMP WITH TIME ZONE,
     trial_start TIMESTAMP WITH TIME ZONE,
     trial_end TIMESTAMP WITH TIME ZONE
   );

   -- Create products table
   CREATE TABLE products (
     id TEXT PRIMARY KEY,
     active BOOLEAN,
     name TEXT,
     description TEXT,
     image TEXT,
     metadata JSONB
   );

   -- Create prices table
   CREATE TABLE prices (
     id TEXT PRIMARY KEY,
     product_id TEXT REFERENCES products(id),
     active BOOLEAN,
     description TEXT,
     unit_amount INT,
     currency TEXT,
     type TEXT,
     interval TEXT,
     interval_count INT,
     trial_period_days INT,
     metadata JSONB
   );
   ```

2. Set up Row Level Security (RLS) policies:

   ```sql
   -- Allow users to read their own subscription data
   CREATE POLICY "Users can view their own subscriptions"
   ON subscriptions FOR SELECT
   USING (auth.uid() = user_id);

   -- Allow users to read product and price data
   CREATE POLICY "Products are viewable by everyone"
   ON products FOR SELECT
   USING (true);

   CREATE POLICY "Prices are viewable by everyone"
   ON prices FOR SELECT
   USING (true);
   ```

## Step 4: Set up Stripe Webhook

1. In your Stripe Dashboard, go to Developers > Webhooks.
2. Click "Add endpoint" and enter your Supabase function URL:
   ```
   https://your-project-ref.supabase.co/functions/v1/stripe-webhook
   ```
3. For "Events to send", select:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - product.created
   - product.updated
   - price.created
   - price.updated

4. After creating the webhook, click "Reveal" to see the signing secret. Copy this value and set it as the `STRIPE_WEBHOOK_SECRET` environment variable in your Supabase project.

## Step 5: Configure the Frontend

1. Update your environment variables in `.env.local`:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   ```

2. Install the Stripe client library:
   ```bash
   npm install @stripe/stripe-js
   ```

## Step 6: Create Stripe Products and Prices

1. In your Stripe Dashboard, go to Products.
2. Create subscription products with different pricing tiers.
3. Add metadata to your products to enhance the UI. For example:
   - `features`: A JSON array of features (e.g., `["Feature 1", "Feature 2"]`)
   - `isPopular`: Set to `true` for the recommended plan
   - `index`: Use numbers to control the display order

## Step 7: Test the Integration

1. Start your application
2. Test the subscription flow with Stripe test cards
3. Verify that webhooks are working properly by checking your Stripe Dashboard and Supabase Database

## Troubleshooting

- **Webhook Errors**: Check the Stripe Dashboard for webhook delivery attempts and errors.
- **Function Logs**: Check Supabase function logs for errors.
- **Test Mode**: Make sure you're using test mode in Stripe during development.

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Stripe Test Cards](https://stripe.com/docs/testing#cards) 