/**
 * Utility for tracking API usage and enforcing limits
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface UsageData {
  user_id: string;
  organization_id: string;
  function_name: string;
  tokens_used: number;
  llm_provider?: string;
  llm_model?: string;
  cost_estimate?: number; // in USD
}

export interface UsageLimits {
  limitReached: boolean;
  currentUsage: number;
  limit: number;
  usagePercentage: number;
}

/**
 * Track API usage for a specific operation
 */
export async function trackApiUsage(
  supabaseClient: SupabaseClient,
  data: UsageData
): Promise<boolean> {
  try {
    // Calculate cost estimate if not provided
    let costEstimate = data.cost_estimate;
    if (!costEstimate && data.tokens_used) {
      costEstimate = estimateCost(data.tokens_used, data.llm_provider, data.llm_model);
    }

    // Insert usage record
    const { error } = await supabaseClient
      .from('api_usage')
      .insert([{
        user_id: data.user_id,
        organization_id: data.organization_id,
        function_name: data.function_name,
        tokens_used: data.tokens_used || 0,
        llm_provider: data.llm_provider,
        llm_model: data.llm_model,
        cost_estimate: costEstimate,
        timestamp: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error tracking API usage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in trackApiUsage:', error);
    return false;
  }
}

/**
 * Check if an organization has reached its usage limits
 */
export async function checkUsageLimit(
  supabaseClient: SupabaseClient,
  organization_id: string
): Promise<UsageLimits> {
  try {
    // Get organization's plan and limits
    const { data: orgData, error: orgError } = await supabaseClient
      .from('organizations')
      .select('plan, monthly_query_limit')
      .eq('id', organization_id)
      .single();

    if (orgError) {
      throw orgError;
    }

    // Get current month's usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error: usageError } = await supabaseClient
      .from('api_usage')
      .select('id', { count: 'exact' })
      .eq('organization_id', organization_id)
      .gte('timestamp', startOfMonth.toISOString());

    if (usageError) {
      throw usageError;
    }

    const currentUsage = count || 0;
    const limit = orgData.monthly_query_limit;
    const usagePercentage = (currentUsage / limit) * 100;

    return {
      limitReached: currentUsage >= limit,
      currentUsage,
      limit,
      usagePercentage
    };
  } catch (error) {
    console.error('Error in checkUsageLimit:', error);
    throw error;
  }
}

/**
 * Get a summary of organization's API usage
 */
export async function getUsageSummary(
  supabaseClient: SupabaseClient,
  organization_id: string,
  timeframe: 'day' | 'week' | 'month' = 'month'
): Promise<{
  total_tokens: number;
  total_cost: number;
  usage_by_function: Record<string, { tokens: number; cost: number }>;
  usage_by_provider: Record<string, { tokens: number; cost: number }>;
  usage_by_date: Array<{ date: string; tokens: number; cost: number }>;
}> {
  try {
    // Determine start date based on timeframe
    const startDate = new Date();
    if (timeframe === 'day') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'week') {
      startDate.setDate(startDate.getDate() - startDate.getDay());
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'month') {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    }

    // Get usage data
    const { data, error } = await supabaseClient
      .from('api_usage')
      .select('*')
      .eq('organization_id', organization_id)
      .gte('timestamp', startDate.toISOString());

    if (error) {
      throw error;
    }

    // Initialize results
    let total_tokens = 0;
    let total_cost = 0;
    const usage_by_function: Record<string, { tokens: number; cost: number }> = {};
    const usage_by_provider: Record<string, { tokens: number; cost: number }> = {};
    const usage_by_date_map: Record<string, { tokens: number; cost: number }> = {};

    // Process usage data
    data.forEach(record => {
      const tokens = record.tokens_used || 0;
      const cost = record.cost_estimate || 0;
      const func = record.function_name;
      const provider = record.llm_provider || 'unknown';
      const date = new Date(record.timestamp).toISOString().split('T')[0];

      // Add to totals
      total_tokens += tokens;
      total_cost += cost;

      // Add to function breakdown
      if (!usage_by_function[func]) {
        usage_by_function[func] = { tokens: 0, cost: 0 };
      }
      usage_by_function[func].tokens += tokens;
      usage_by_function[func].cost += cost;

      // Add to provider breakdown
      if (!usage_by_provider[provider]) {
        usage_by_provider[provider] = { tokens: 0, cost: 0 };
      }
      usage_by_provider[provider].tokens += tokens;
      usage_by_provider[provider].cost += cost;

      // Add to date breakdown
      if (!usage_by_date_map[date]) {
        usage_by_date_map[date] = { tokens: 0, cost: 0 };
      }
      usage_by_date_map[date].tokens += tokens;
      usage_by_date_map[date].cost += cost;
    });

    // Convert date map to sorted array
    const usage_by_date = Object.entries(usage_by_date_map)
      .map(([date, usage]) => ({ date, ...usage }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total_tokens,
      total_cost,
      usage_by_function,
      usage_by_provider,
      usage_by_date
    };
  } catch (error) {
    console.error('Error in getUsageSummary:', error);
    throw error;
  }
}

/**
 * Estimate cost based on token usage and provider/model
 */
function estimateCost(tokens: number, provider?: string, model?: string): number {
  // Default cost per 1000 tokens (in USD)
  let costPer1000 = 0.002; // Default base rate

  if (provider && model) {
    // OpenAI pricing (approximate as of early 2024)
    if (provider.toLowerCase() === 'openai') {
      if (model.includes('gpt-4')) {
        costPer1000 = 0.03; // GPT-4 rate (simplified)
      } else if (model.includes('gpt-3.5')) {
        costPer1000 = 0.002; // GPT-3.5 rate
      }
    }
    // Anthropic pricing (approximate)
    else if (provider.toLowerCase() === 'anthropic') {
      if (model.includes('claude-3')) {
        costPer1000 = 0.025; // Claude rate (simplified)
      } else if (model.includes('claude-2')) {
        costPer1000 = 0.015;
      }
    }
    // Google pricing (approximate)
    else if (provider.toLowerCase() === 'google') {
      if (model.includes('gemini-1.5')) {
        costPer1000 = 0.0035; // Gemini rate (simplified)
      }
    }
  }

  // Calculate final cost
  return (tokens / 1000) * costPer1000;
} 