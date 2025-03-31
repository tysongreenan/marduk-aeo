import { supabase } from './supabase';
import { Stripe, loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with the publishable key
let stripePromise: Promise<Stripe | null>;

// Get the Stripe publishable key from environment variables
const getStripeJs = () => {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  
  if (!key) {
    console.error('Stripe publishable key is missing. Please set VITE_STRIPE_PUBLISHABLE_KEY environment variable.');
    return null;
  }

  if (!stripePromise) {
    stripePromise = loadStripe(key);
  }
  
  return stripePromise;
};

/**
 * Create a Stripe checkout session for a subscription
 * @param priceId The Stripe Price ID for the subscription
 * @param successUrl The URL to redirect to after successful payment
 * @param cancelUrl The URL to redirect to if payment is cancelled
 */
export const createCheckoutSession = async (
  priceId: string,
  successUrl = window.location.origin + '/account',
  cancelUrl = window.location.origin + '/pricing'
) => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create a checkout session');
    }
    
    // Create a checkout session via the Supabase function
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        price_id: priceId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: user.email
      }
    });
    
    if (error) {
      throw error;
    }
    
    // Redirect to Stripe checkout
    const stripe = await getStripeJs();
    if (!stripe) {
      throw new Error('Failed to load Stripe');
    }
    
    const { error: stripeError } = await stripe.redirectToCheckout({
      sessionId: data.sessionId
    });
    
    if (stripeError) {
      throw stripeError;
    }
    
    return { sessionId: data.sessionId };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

/**
 * Create a Stripe portal session for managing billing
 * @param returnUrl The URL to redirect to after the customer leaves the portal
 */
export const createPortalSession = async (
  returnUrl = window.location.origin + '/account'
) => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to access the billing portal');
    }
    
    // Create a portal session via the Supabase function
    const { data, error } = await supabase.functions.invoke('create-portal-session', {
      body: {
        return_url: returnUrl
      }
    });
    
    if (error) {
      throw error;
    }
    
    // Redirect to the portal
    window.location.href = data.url;
    
    return { url: data.url };
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
};

/**
 * Get the current subscription for the user
 */
export const getSubscription = async () => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, prices(*, products(*))')
      .in('status', ['trialing', 'active'])
      .maybeSingle();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
};

/**
 * Get all available products and prices
 */
export const getProductsWithPrices = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, prices(*)')
      .eq('active', true)
      .eq('prices.active', true)
      .order('metadata->index')
      .order('unit_amount', { foreignTable: 'prices' });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}; 