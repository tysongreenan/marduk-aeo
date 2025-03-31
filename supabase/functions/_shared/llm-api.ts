// Utility for interacting with various LLM APIs

export interface LLMQueryOptions {
  llm_type: string;
  llm_version: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  json_mode?: boolean;
}

export interface LLMResponse {
  text: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  provider: string;
  model: string;
}

/**
 * Query an LLM provider with a prompt
 */
export async function queryLLM(prompt: string, options: LLMQueryOptions): Promise<LLMResponse> {
  // Default options
  const defaultOptions = {
    temperature: 0.7,
    max_tokens: 1000,
    top_p: 1,
    json_mode: false,
    ...options
  };

  // Select provider based on options
  switch (defaultOptions.llm_type.toLowerCase()) {
    case 'openai':
      return queryOpenAI(prompt, defaultOptions);
    case 'anthropic':
      return queryAnthropic(prompt, defaultOptions);
    case 'google':
      return queryGoogle(prompt, defaultOptions);
    default:
      throw new Error(`Unsupported LLM provider: ${defaultOptions.llm_type}`);
  }
}

/**
 * Query the OpenAI API
 */
async function queryOpenAI(prompt: string, options: LLMQueryOptions): Promise<LLMResponse> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OpenAI API key not found in environment variables');
  }

  const url = 'https://api.openai.com/v1/chat/completions';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: options.llm_version,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      top_p: options.top_p,
      response_format: options.json_mode ? { type: 'json_object' } : undefined
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  return {
    text: data.choices[0].message.content,
    usage: {
      prompt_tokens: data.usage.prompt_tokens,
      completion_tokens: data.usage.completion_tokens,
      total_tokens: data.usage.total_tokens
    },
    provider: 'openai',
    model: options.llm_version
  };
}

/**
 * Query the Anthropic API
 */
async function queryAnthropic(prompt: string, options: LLMQueryOptions): Promise<LLMResponse> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('Anthropic API key not found in environment variables');
  }

  const url = 'https://api.anthropic.com/v1/messages';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: options.llm_version,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      top_p: options.top_p
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Anthropic doesn't provide token usage in the same format, so we estimate
  const estimatedPromptTokens = Math.floor(prompt.length / 4);
  const estimatedCompletionTokens = Math.floor(data.content[0].text.length / 4);
  
  return {
    text: data.content[0].text,
    usage: {
      prompt_tokens: estimatedPromptTokens,
      completion_tokens: estimatedCompletionTokens,
      total_tokens: estimatedPromptTokens + estimatedCompletionTokens
    },
    provider: 'anthropic',
    model: options.llm_version
  };
}

/**
 * Query the Google (Gemini) API
 */
async function queryGoogle(prompt: string, options: LLMQueryOptions): Promise<LLMResponse> {
  const apiKey = Deno.env.get('GOOGLE_API_KEY');
  if (!apiKey) {
    throw new Error('Google API key not found in environment variables');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.llm_version}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.max_tokens,
        topP: options.top_p
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Google doesn't provide token usage in the same format, so we estimate
  const estimatedPromptTokens = Math.floor(prompt.length / 4);
  const estimatedCompletionTokens = Math.floor(data.candidates[0].content.parts[0].text.length / 4);
  
  return {
    text: data.candidates[0].content.parts[0].text,
    usage: {
      prompt_tokens: estimatedPromptTokens,
      completion_tokens: estimatedCompletionTokens,
      total_tokens: estimatedPromptTokens + estimatedCompletionTokens
    },
    provider: 'google',
    model: options.llm_version
  };
}

/**
 * Generate keyword variations for a given seed keyword
 */
export async function generateKeywordVariations(seedKeyword: string, options: {
  types?: string[]; // 'questions', 'negations', 'alternatives', 'longtail'
  count?: number;
  llm_options?: LLMQueryOptions;
}): Promise<{ variations: string[], usage: LLMResponse['usage'] }> {
  const defaultOptions = {
    types: ['questions', 'negations', 'alternatives', 'longtail'],
    count: 10,
    llm_options: {
      llm_type: 'openai',
      llm_version: 'gpt-4',
      temperature: 0.7,
      max_tokens: 1000,
      json_mode: true
    },
    ...options
  };
  
  // Create a prompt to generate variations
  let prompt = `Generate ${defaultOptions.count} keyword variations for "${seedKeyword}" in the following categories: ${defaultOptions.types.join(', ')}. 
  
Format the response as a JSON object with an array of variations, each with a "text" field and a "type" field.
Example:
{
  "variations": [
    {"text": "how to find best SEO tools", "type": "questions"},
    {"text": "SEO tools that don't require technical skills", "type": "negations"},
    {"text": "top marketing automation platforms", "type": "alternatives"},
    {"text": "enterprise SEO platforms with competitor analysis", "type": "longtail"}
  ]
}`;

  // Get the variations from the LLM
  const response = await queryLLM(prompt, defaultOptions.llm_options);
  
  try {
    // Parse the response as JSON
    const parsedResponse = JSON.parse(response.text);
    
    if (!parsedResponse.variations || !Array.isArray(parsedResponse.variations)) {
      throw new Error('Invalid response format: missing variations array');
    }
    
    return {
      variations: parsedResponse.variations.map((v: any) => v.text),
      usage: response.usage
    };
  } catch (error) {
    console.error('Error parsing LLM response:', error);
    throw new Error(`Failed to parse keyword variations: ${error.message}`);
  }
}

/**
 * Analyze content gaps by comparing brand's content with top competitors
 */
export async function analyzeContentGaps(brandName: string, topic: string, competitors: string[], options: {
  llm_options?: LLMQueryOptions;
}): Promise<{ gaps: Array<{ topic: string, description: string }>, usage: LLMResponse['usage'] }> {
  const defaultOptions = {
    llm_options: {
      llm_type: 'openai',
      llm_version: 'gpt-4',
      temperature: 0.5,
      max_tokens: 1500,
      json_mode: true
    },
    ...options
  };
  
  // Create a prompt to analyze content gaps
  let prompt = `Analyze potential content gaps for ${brandName} in the ${topic} industry compared to these competitors: ${competitors.join(', ')}.
  
Identify specific subtopics or content areas where the brand should create content to compete effectively.

Format the response as a JSON object with an array of gap areas, each with a "topic" field and a "description" field explaining why this represents a gap.
Example:
{
  "gaps": [
    {
      "topic": "Technical SEO tutorials for e-commerce",
      "description": "Competitors X and Y have extensive guides on technical SEO specifically for e-commerce platforms, while Brand Z lacks this content."
    },
    {
      "topic": "AI applications in content optimization",
      "description": "As AI tools become more prevalent in content creation, Brand Z needs content explaining how to use these tools effectively."
    }
  ]
}`;

  // Get the content gaps from the LLM
  const response = await queryLLM(prompt, defaultOptions.llm_options);
  
  try {
    // Parse the response as JSON
    const parsedResponse = JSON.parse(response.text);
    
    if (!parsedResponse.gaps || !Array.isArray(parsedResponse.gaps)) {
      throw new Error('Invalid response format: missing gaps array');
    }
    
    return {
      gaps: parsedResponse.gaps,
      usage: response.usage
    };
  } catch (error) {
    console.error('Error parsing LLM response:', error);
    throw new Error(`Failed to analyze content gaps: ${error.message}`);
  }
} 