// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @deno-types="https://esm.sh/@supabase/supabase-js@2"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Define template properties
interface PromptVariable {
  type: string;
  required: boolean;
  description?: string;
}

interface PromptTemplate {
  name: string;
  version: string;
  template_text: string;
  purpose: string;
  variables?: Record<string, PromptVariable>;
  metadata?: Record<string, string | number | boolean | object>;
}

interface TestCase {
  [key: string]: string | number | boolean | object;
}

// Define specific request types
interface CreateTemplateRequest {
  method: 'create';
  body: PromptTemplate;
}

interface TestTemplateRequest {
  method: 'test';
  body: {
    template_id: string;
    test_cases: TestCase[];
    llm_type?: string;
  };
}

// Combined request type
type RequestPayload = CreateTemplateRequest | TestTemplateRequest;

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

    const payload = await req.json() as RequestPayload;
    const { method, body } = payload;

    if (method === 'create') {
      const { name, version, template_text, purpose, variables, metadata } = body;
      
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
      const { template_id, test_cases, llm_type = 'openai' } = body;
      
      // Get the template
      const { data: template, error } = await supabaseClient
        .from('prompt_templates')
        .select('*')
        .eq('id', template_id)
        .single()
        
      if (error) throw error
      
      // Test code would go here - in a real implementation
      // this would call OpenAI, Anthropic, etc. with the template
      // For now, just return mock results
      const results = test_cases.map((testCase, index) => ({
        templateId: template_id,
        testCaseId: `test-${index}`,
        result: `Mock response for test case ${index}`,
        tokens: 150,
        latency: 500,
        success: true
      }));
      
      return new Response(JSON.stringify({ results }), {
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