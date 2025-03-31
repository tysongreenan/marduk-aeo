import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Interface for source influence request
interface SourceInfluenceRequest {
  method: string;
  body: {
    source_id?: string;
    topic_id?: string;
    query_text?: string;
    llm_type?: string;
    llm_version?: string;
    source_name?: string;
    source_url?: string;
    source_type?: string;
  };
}

// Interface for source and topic data
interface Source {
  id: string;
  name: string;
  url?: string;
  source_type: string;
  created_at?: string;
}

interface Topic {
  id: string;
  name: string;
  relevance_score: number;
  brand_id: string;
}

// Interface for source influence score
interface SourceInfluenceScore {
  influence_score: number;
  sources: Source;
}

// Interface for source mention
interface SourceMention {
  source_id: string;
  total_mentions: number;
  avg_position: number;
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

    const { method, body }: SourceInfluenceRequest = await req.json()

    if (method === 'track_mention') {
      const { 
        source_id, 
        topic_id, 
        query_text = '', 
        llm_type = 'openai', 
        llm_version = 'gpt-4' 
      } = body
      
      if (!source_id || !topic_id) {
        throw new Error('source_id and topic_id are required')
      }
      
      // Check if source and topic exist
      const { data: source, error: sourceError } = await supabaseClient
        .from('sources')
        .select('*')
        .eq('id', source_id)
        .single()
      
      if (sourceError) throw sourceError
      
      const { data: topic, error: topicError } = await supabaseClient
        .from('topics')
        .select('*')
        .eq('id', topic_id)
        .single()
      
      if (topicError) throw topicError
      
      // Record the mention
      const mention_count = 1 // In a real app, we'd count actual mentions
      const position_score = 0.8 // In a real app, we'd calculate based on position
      
      const { data: mention, error: mentionError } = await supabaseClient
        .from('source_mentions')
        .insert([
          {
            source_id,
            topic_id,
            llm_type,
            llm_version,
            query_text,
            mention_count,
            position_score
          }
        ])
        .select()
      
      if (mentionError) throw mentionError
      
      // Update influence score
      const influence_score = 0.75 // In a real app, we'd calculate based on data
      
      const { data: influence, error: influenceError } = await supabaseClient
        .from('source_influence_scores')
        .upsert([
          {
            source_id,
            topic_id,
            influence_score
          }
        ])
        .select()
      
      if (influenceError) throw influenceError
      
      return new Response(JSON.stringify({
        success: true,
        mention: mention[0],
        influence: influence[0]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
      
    } else if (method === 'create_source') {
      const { source_name, source_url, source_type } = body
      
      if (!source_name || !source_type) {
        throw new Error('source_name and source_type are required')
      }
      
      const { data: source, error: sourceError } = await supabaseClient
        .from('sources')
        .insert([
          {
            name: source_name,
            url: source_url,
            source_type
          }
        ])
        .select()
      
      if (sourceError) throw sourceError
      
      return new Response(JSON.stringify({
        success: true,
        source: source[0]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
      
    } else if (method === 'analyze_sources') {
      const { topic_id } = body
      
      if (!topic_id) {
        throw new Error('topic_id is required')
      }
      
      // Get topic details
      const { data: topic, error: topicError } = await supabaseClient
        .from('topics')
        .select('*, brands:brand_id(name)')
        .eq('id', topic_id)
        .single()
      
      if (topicError) throw topicError
      
      // Get influence scores for the topic
      const { data: scores, error: scoresError } = await supabaseClient
        .from('source_influence_scores')
        .select(`
          influence_score,
          sources:source_id(id, name, url, source_type)
        `)
        .eq('topic_id', topic_id)
        .order('influence_score', { ascending: false })
        .limit(10)
      
      if (scoresError) throw scoresError
      
      // Get mention counts
      const { data: mentions, error: mentionsError } = await supabaseClient
        .from('source_mentions')
        .select(`
          source_id,
          COUNT(*) as total_mentions,
          AVG(position_score) as avg_position
        `)
        .eq('topic_id', topic_id)
        .group('source_id')
      
      if (mentionsError) throw mentionsError
      
      // Combine data
      const sources = (scores as SourceInfluenceScore[]).map(score => {
        const source = score.sources
        const mention = (mentions as SourceMention[]).find(m => m.source_id === source.id)
        
        return {
          ...source,
          influence_score: score.influence_score,
          total_mentions: mention ? mention.total_mentions : 0,
          avg_position: mention ? mention.avg_position : 0
        }
      })
      
      return new Response(JSON.stringify({
        success: true,
        topic,
        sources
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