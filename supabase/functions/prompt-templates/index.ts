// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @deno-types="https://esm.sh/@supabase/supabase-js@2"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestPayload {
  method: string;
  body: any;
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // These will be available in Deno environment, so we ignore the TypeScript errors
    // @ts-ignore
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { method, body }: RequestPayload = await req.json()

    if (method === 'create') {
      const { name, version, template_text, purpose, variables, metadata } = body
      
      const { data, error } = await supabaseClient
        .from('prompt_templates')
        .insert([
          { name, version, template_text, purpose, variables, metadata }
        ])
        .select()
        
      if (error) throw error
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
      
    } else if (method === 'test') {
      const { template_id, test_cases, llm_type } = body
      
      // Get the template
      const { data: template, error } = await supabaseClient
        .from('prompt_templates')
        .select('*')
        .eq('id', template_id)
        .single()
        
      if (error) throw error
      
      // Test code would go here - in a real implementation
      // this would call OpenAI, Anthropic, etc. with the template
      
      return new Response(JSON.stringify({ success: true }), {
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