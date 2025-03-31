# Prompt Templates Edge Function

This Supabase Edge Function provides an API for managing prompt templates in the AI Brand Analytics application.

## Features

- Create new prompt templates
- Test prompt templates with different LLM providers

## Deployment Requirements

- Docker Desktop installed and running
- Supabase CLI logged in
- Project linked to your Supabase project

## How to Deploy

```bash
# Make sure Docker Desktop is running
npx supabase functions deploy prompt-templates
```

## Environment Variables

Make sure your Supabase project has these environment variables set:

```
SUPABASE_URL
SUPABASE_ANON_KEY
```

## API Usage

### Create a Prompt Template

```typescript
const response = await fetch(
  'https://bmzmvnaiqyqvxqfuoory.supabase.co/functions/v1/prompt-templates',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAccessToken}`
    },
    body: JSON.stringify({
      method: 'create',
      body: {
        name: 'Brand Analysis Template',
        version: '1.0',
        template_text: 'Analyze the brand {brand_name} in the context of {industry}',
        purpose: 'brand_analysis',
        variables: {
          brand_name: { type: 'string', required: true },
          industry: { type: 'string', required: true }
        },
        metadata: {
          author: 'AI Team',
          tags: ['brand', 'analysis']
        }
      }
    })
  }
);

const data = await response.json();
```

### Test a Prompt Template

```typescript
const response = await fetch(
  'https://bmzmvnaiqyqvxqfuoory.supabase.co/functions/v1/prompt-templates',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAccessToken}`
    },
    body: JSON.stringify({
      method: 'test',
      body: {
        template_id: '123e4567-e89b-12d3-a456-426614174000',
        test_cases: [
          { 
            brand_name: 'Example Corp',
            industry: 'Technology'
          }
        ],
        llm_type: 'openai'
      }
    })
  }
);

const data = await response.json();
```

## Future Enhancements

- Add support for more LLM providers (Anthropic, Google AI)
- Implement metrics collection for template performance
- Add batch testing capability 