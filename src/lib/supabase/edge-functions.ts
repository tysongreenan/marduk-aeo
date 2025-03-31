import { createBrowserClient, getEdgeFunctionUrl } from './client'

/**
 * Generic type for Edge Function requests
 */
export interface EdgeFunctionRequest<T = Record<string, unknown>> {
  method: string;
  body: T;
}

/**
 * Generic type for Edge Function responses
 */
export interface EdgeFunctionResponse<T = Record<string, unknown>> {
  data: T | null;
  error: string | null;
}

/**
 * Call a Supabase Edge Function from the browser using the Supabase client
 * @param functionName The name of the Edge Function to call
 * @param payload Request payload to send to the Edge Function
 * @returns Response from the Edge Function
 */
export const callEdgeFunction = async <TRequest, TResponse>(
  functionName: string,
  payload: EdgeFunctionRequest<TRequest>
): Promise<EdgeFunctionResponse<TResponse>> => {
  try {
    const supabase = createBrowserClient()
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload
    })

    if (error) {
      console.error(`Error calling ${functionName} Edge Function:`, error)
      return { data: null, error: error.message }
    }

    return { data: data as TResponse, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Error calling ${functionName} Edge Function:`, err)
    return { data: null, error: message }
  }
}

/**
 * Call a Supabase Edge Function directly using fetch
 * Useful for server-side calls or when you need more control
 * @param functionName The name of the Edge Function to call
 * @param payload Request payload to send to the Edge Function
 * @param headers Optional additional headers to include
 * @returns Response from the Edge Function
 */
export const fetchEdgeFunction = async <TRequest, TResponse>(
  functionName: string,
  payload: EdgeFunctionRequest<TRequest>,
  headers: HeadersInit = {}
): Promise<EdgeFunctionResponse<TResponse>> => {
  try {
    const url = `${getEdgeFunctionUrl()}/${functionName}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { 
        data: null, 
        error: `HTTP error ${response.status}: ${errorText}` 
      }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Error fetching ${functionName} Edge Function:`, err)
    return { data: null, error: message }
  }
} 