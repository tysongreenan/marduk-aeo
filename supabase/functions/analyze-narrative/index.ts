import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Interface for narrative analysis request
interface NarrativeRequest {
  method: string;
  body: {
    brand_id?: string;
    competitor_id?: string;
    topic_id?: string;
    timeframe?: string;
    query_text?: string;
    llm_response?: string;
  };
}

// Interfaces for data structures
interface NarrativeTrend {
  id: string;
  brand_id: string;
  topic_id?: string;
  trend_name: string;
  sentiment_score: number;
  trending_direction: 'up' | 'down' | 'stable';
  created_at: string;
}

interface NarrativeInsight {
  id: string;
  brand_id: string;
  topic_id?: string;
  insight_text: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // @ts-ignore
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { method, body }: NarrativeRequest = await req.json()

    if (method === 'analyze_brand_narrative') {
      const { brand_id, timeframe = '30d', topic_id } = body
      
      if (!brand_id) {
        throw new Error('brand_id is required')
      }
      
      // Check if brand exists
      const { data: brand, error: brandError } = await supabaseClient
        .from('brands')
        .select('*')
        .eq('id', brand_id)
        .single()
      
      if (brandError) throw brandError
      
      // Get query history for narrative analysis
      let queryBuilder = supabaseClient
        .from('keyword_queries')
        .select(`
          id,
          query_text,
          llm_response,
          sentiment_score,
          ranking_position,
          created_at
        `)
        .eq('brand_id', brand_id)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (topic_id) {
        queryBuilder = queryBuilder.eq('topic_id', topic_id)
      }
      
      const { data: queries, error: queriesError } = await queryBuilder
      
      if (queriesError) throw queriesError
      
      // Simple narrative analysis based on query history
      // In a real implementation, this would use more sophisticated NLP/ML
      interface QueryResult {
        created_at: string;
        sentiment_score: number | null;
        ranking_position: number | null;
      }
      
      const sentimentOverTime = Array.isArray(queries) ? queries.map((q: QueryResult) => ({
        date: new Date(q.created_at).toISOString().split('T')[0],
        sentiment: q.sentiment_score || 0,
        position: q.ranking_position || 0,
      })) : []
      
      // Find trending narrative themes
      const narrativeThemes = [
        {
          theme: "Brand Authority",
          sentiment: 0.75,
          trending: "up",
          evidence: "Consistently mentioned as expert in the field"
        },
        {
          theme: "Product Quality",
          sentiment: 0.82,
          trending: "stable",
          evidence: "Positive mentions of product reliability and features"
        }
      ]
      
      // Generate narrative insights
      const narrativeInsights = [
        {
          insight: "Brand visibility is increasing in AI search results, with more prominent positions.",
          priority: "high",
          recommendation: "Capitalize on momentum with additional content targeting key topics."
        },
        {
          insight: "Competitors are gaining traction in the 'affordability' narrative.",
          priority: "medium",
          recommendation: "Address value proposition more directly in marketing materials."
        }
      ]
      
      // Record trends in the database
      for (const theme of narrativeThemes) {
        await supabaseClient
          .from('narrative_trends')
          .insert([{
            brand_id,
            topic_id: topic_id || null,
            trend_name: theme.theme,
            sentiment_score: theme.sentiment,
            trending_direction: theme.trending,
          }])
          .select()
      }
      
      // Record insights in the database
      for (const insight of narrativeInsights) {
        await supabaseClient
          .from('narrative_insights')
          .insert([{
            brand_id,
            topic_id: topic_id || null,
            insight_text: `${insight.insight} ${insight.recommendation}`,
            priority: insight.priority,
          }])
          .select()
      }
      
      return new Response(JSON.stringify({
        success: true,
        brand,
        sentiment_over_time: sentimentOverTime,
        narrative_themes: narrativeThemes,
        narrative_insights: narrativeInsights
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
      
    } else if (method === 'compare_narratives') {
      const { brand_id, competitor_id, timeframe = '30d' } = body
      
      if (!brand_id || !competitor_id) {
        throw new Error('brand_id and competitor_id are required')
      }
      
      // Get trends for both brand and competitor
      const { data: brandTrends, error: brandError } = await supabaseClient
        .from('narrative_trends')
        .select('*')
        .eq('brand_id', brand_id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (brandError) throw brandError
      
      // Get competitor info and trends
      const { data: competitor, error: competitorError } = await supabaseClient
        .from('competitors')
        .select('*')
        .eq('id', competitor_id)
        .single()
      
      if (competitorError) throw competitorError
      
      const { data: competitorTrends, error: compTrendsError } = await supabaseClient
        .from('narrative_trends')
        .select('*')
        .eq('brand_id', competitor_id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      // Simple comparison (would be more sophisticated in real implementation)
      interface Trend {
        sentiment_score: number;
      }
      
      const brandSentiment = brandTrends && brandTrends.length > 0 
        ? brandTrends.reduce((sum: number, t: Trend) => sum + t.sentiment_score, 0) / brandTrends.length 
        : 0
        
      const competitorSentiment = competitorTrends && competitorTrends.length > 0 
        ? competitorTrends.reduce((sum: number, t: Trend) => sum + t.sentiment_score, 0) / competitorTrends.length 
        : 0
      
      // Generate narrative comparison insights
      const narrativeComparison = {
        brand_sentiment: brandSentiment,
        competitor_sentiment: competitorSentiment,
        sentiment_difference: brandSentiment - competitorSentiment,
        comparative_strengths: [
          "Brand shows stronger authority positioning",
          "Competitor has better affordability perception"
        ],
        action_items: [
          "Strengthen value messaging to counter competitor affordability advantage",
          "Maintain focus on expertise content that reinforces authority"
        ]
      }
      
      return new Response(JSON.stringify({
        success: true,
        brand_trends: brandTrends,
        competitor_trends: competitorTrends,
        competitor,
        narrative_comparison: narrativeComparison
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
      
    } else if (method === 'get_narrative_insights') {
      const { brand_id, topic_id } = body
      
      if (!brand_id) {
        throw new Error('brand_id is required')
      }
      
      // Get narrative insights
      let insightQuery = supabaseClient
        .from('narrative_insights')
        .select(`
          id,
          brand_id,
          topic_id,
          insight_text,
          priority,
          created_at,
          brands:brand_id(name)
        `)
        .eq('brand_id', brand_id)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (topic_id) {
        insightQuery = insightQuery.eq('topic_id', topic_id)
      }
      
      const { data: insights, error: insightsError } = await insightQuery
      
      if (insightsError) throw insightsError
      
      return new Response(JSON.stringify({
        success: true,
        insights
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
    
    throw new Error(`Unsupported method: ${method}`)
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
}) 