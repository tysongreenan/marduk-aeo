import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Interface for keyword query requests
interface KeywordQueryRequest {
  method: string;
  body: {
    brand_id?: string;
    competitor_id?: string;
    topic_id?: string;
    query_text?: string;
    llm_type?: string;
    llm_version?: string;
    timeframe?: string;
  };
}

// Interface for the query response structure
interface QueryResponse {
  id: string;
  query_text: string;
  llm_response: string;
  brand_mentioned: boolean;
  sentiment_score: number;
  ranking_position: number;
  created_at: string;
}

// Interface for query analytics
interface QueryAnalytics {
  total_queries: number;
  mention_rate: number;
  avg_position: number;
  avg_sentiment: number;
  position_trend: 'up' | 'down' | 'stable';
  queries_by_day: { date: string; count: number }[];
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

    const { method, body }: KeywordQueryRequest = await req.json()

    if (method === 'track') {
      const { 
        brand_id, 
        competitor_id, 
        topic_id, 
        query_text = '', 
        llm_type = 'openai', 
        llm_version = 'gpt-4' 
      } = body
      
      if (!brand_id || !query_text) {
        throw new Error('brand_id and query_text are required')
      }
      
      // Check if brand exists
      const { data: brand, error: brandError } = await supabaseClient
        .from('brands')
        .select('*')
        .eq('id', brand_id)
        .single()
      
      if (brandError) throw brandError
      
      // Simulate LLM response - in real app, we'd call actual LLM API
      const llmResponse = `The ${brand.name} product offers excellent features. It has good reviews overall.`
      
      // Calculate simple metrics (would be more sophisticated in real app)
      const brandMentioned = llmResponse.toLowerCase().includes(brand.name.toLowerCase())
      const sentimentScore = 0.75 // would come from actual sentiment analysis
      const rankingPosition = brandMentioned ? 2 : 0 // would be calculated from actual response
      
      // Record the query and response
      const { data: query, error: queryError } = await supabaseClient
        .from('keyword_queries')
        .insert([
          {
            brand_id,
            competitor_id: competitor_id || null,
            topic_id: topic_id || null,
            query_text,
            llm_type,
            llm_version,
            llm_response: llmResponse,
            brand_mentioned: brandMentioned,
            sentiment_score: sentimentScore,
            ranking_position: rankingPosition
          }
        ])
        .select()
      
      if (queryError) throw queryError
      
      // Record ranking history
      const { data: ranking, error: rankingError } = await supabaseClient
        .from('ranking_history')
        .insert([
          {
            brand_id,
            topic_id: topic_id || null,
            query_id: query[0].id,
            position: rankingPosition,
            sentiment_score: sentimentScore
          }
        ])
        .select()
      
      if (rankingError) throw rankingError
      
      return new Response(JSON.stringify({
        success: true,
        query: query[0],
        ranking: ranking[0],
        llm_response: llmResponse
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
      
    } else if (method === 'analyze') {
      const { brand_id, timeframe = '30d', topic_id } = body
      
      if (!brand_id) {
        throw new Error('brand_id is required')
      }
      
      // Get recent queries for the brand
      let queryBuilder = supabaseClient
        .from('keyword_queries')
        .select('*')
        .eq('brand_id', brand_id)
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (topic_id) {
        queryBuilder = queryBuilder.eq('topic_id', topic_id)
      }
      
      const { data: queries, error: queriesError } = await queryBuilder
      
      if (queriesError) throw queriesError
      
      // Simple analytics (would be more sophisticated in real app)
      const totalQueries = queries ? queries.length : 0
      const mentionedQueries = queries ? queries.filter(q => q.brand_mentioned).length : 0
      const mentionRate = totalQueries > 0 ? mentionedQueries / totalQueries : 0
      
      // Calculate average position and sentiment
      let avgPosition = 0
      let avgSentiment = 0
      
      if (totalQueries > 0) {
        const positionSum = queries.reduce((sum: number, q: QueryResponse) => sum + (q.ranking_position || 0), 0)
        avgPosition = positionSum / totalQueries
        
        const sentimentSum = queries.reduce((sum: number, q: QueryResponse) => sum + (q.sentiment_score || 0), 0)
        avgSentiment = sentimentSum / totalQueries
      }
      
      // Group queries by day for trending
      const queriesByDay: { [key: string]: number } = {}
      queries?.forEach((q: QueryResponse) => {
        const date = new Date(q.created_at).toISOString().split('T')[0]
        queriesByDay[date] = (queriesByDay[date] || 0) + 1
      })
      
      const queriesByDayArray = Object.entries(queriesByDay).map(([date, count]) => ({ 
        date, 
        count 
      }))
      
      // Determine position trend (simple version)
      let positionTrend: 'up' | 'down' | 'stable' = 'stable'
      if (queries && queries.length >= 2) {
        const recentAvg = queries.slice(0, 5).reduce((sum: number, q: QueryResponse) => sum + (q.ranking_position || 0), 0) / 5
        const olderAvg = queries.slice(-5).reduce((sum: number, q: QueryResponse) => sum + (q.ranking_position || 0), 0) / 5
        
        if (recentAvg < olderAvg) positionTrend = 'up' // Lower position number is better
        else if (recentAvg > olderAvg) positionTrend = 'down'
      }
      
      const analytics: QueryAnalytics = {
        total_queries: totalQueries,
        mention_rate: mentionRate,
        avg_position: avgPosition,
        avg_sentiment: avgSentiment,
        position_trend: positionTrend,
        queries_by_day: queriesByDayArray
      }
      
      return new Response(JSON.stringify({
        success: true,
        analytics,
        recent_queries: queries?.slice(0, 10)
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