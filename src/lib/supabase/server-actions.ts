/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
'use server'

import { createServerClient } from './client'
// Only importing types used in function return types
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from './database.types'
import { Brand, KeywordQuery, Topic, Competitor, Source, SourceMention, NarrativeInsight } from './types'

// Type for Supabase database tables
type SourceId = string;
type Tables = Database['public']['Tables'];
type DbResult<T> = T extends PromiseLike<infer U> ? U : never;
type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never;

/**
 * Get all brands for an organization
 * @param organizationId The organization ID to filter brands by
 * @returns Array of brand objects
 */
export async function getBrands(organizationId: string) {
  const supabase = createServerClient()
  
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name')
  
  if (error) {
    console.error('Error fetching brands:', error)
    return []
  }
  
  return data || []
}

/**
 * Get a single brand by ID
 * @param brandId The brand ID to fetch
 * @returns Brand object or null if not found
 */
export async function getBrandById(brandId: string) {
  const supabase = createServerClient()
  
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single()
  
  if (error) {
    console.error('Error fetching brand:', error)
    return null
  }
  
  return data
}

/**
 * Get all keyword queries for a brand
 * @param brandId The brand ID to filter queries by
 * @param limit Optional limit of results (default 50)
 * @returns Array of keyword query objects
 */
export async function getKeywordQueries(brandId: string, limit = 50) {
  const supabase = createServerClient()
  
  const { data, error } = await supabase
    .from('keyword_queries')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching keyword queries:', error)
    return []
  }
  
  return data || []
}

/**
 * Get all competitors for a brand
 * @param brandId The brand ID to filter competitors by
 * @returns Array of competitor objects
 */
export async function getCompetitors(brandId: string) {
  const supabase = createServerClient()
  
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('brand_id', brandId)
    .order('name')
  
  if (error) {
    console.error('Error fetching competitors:', error)
    return []
  }
  
  return data || []
}

/**
 * Get all topics
 * @param category Optional category to filter topics by
 * @returns Array of topic objects
 */
export async function getTopics(category?: string) {
  const supabase = createServerClient()
  
  let query = supabase
    .from('topics')
    .select('*')
    .order('name')
  
  if (category) {
    query = query.eq('category', category)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching topics:', error)
    return []
  }
  
  return data || []
}

/**
 * Get sources that mention a brand
 * @param brandId The brand ID to filter sources by
 * @param limit Optional limit of results (default 20)
 * @returns Array of source objects with their mentions
 */
export async function getBrandSources(brandId: string, limit = 20) {
  const supabase = createServerClient()
  
  // First get source mentions for this brand
  const { data: mentions, error: mentionsError } = await supabase
    .from('source_mentions')
    .select('source_id')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (mentionsError || !mentions?.length) {
    console.error('Error fetching source mentions:', mentionsError)
    return []
  }
  
  // Get the unique source IDs
  // Use proper typing for source_id
  const sourceIds = [...new Set(mentions.map(m => m.source_id as SourceId))]
  
  // Then get the actual sources
  const { data: sources, error: sourcesError } = await supabase
    .from('sources')
    .select('*')
    .in('id', sourceIds)
  
  if (sourcesError) {
    console.error('Error fetching sources:', sourcesError)
    return []
  }
  
  return sources || []
}

/**
 * Get narrative insights for a brand
 * @param brandId The brand ID to filter insights by
 * @param topicId Optional topic ID to filter by
 * @param limit Optional limit of results (default 10)
 * @returns Array of narrative insight objects
 */
export async function getNarrativeInsights(
  brandId: string, 
  topicId?: string, 
  limit = 10
) {
  const supabase = createServerClient()
  
  let query = supabase
    .from('narrative_insights')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (topicId) {
    query = query.eq('topic_id', topicId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching narrative insights:', error)
    return []
  }
  
  return data || []
}

/**
 * Track a keyword query and record the results
 * @param brandId The brand ID associated with the query
 * @param queryText The query text to send to the LLM
 * @param topicId Optional topic ID to associate with the query
 * @param competitorId Optional competitor ID to compare against
 * @returns The created keyword query record or null if error
 */
export async function trackKeywordQuery(
  brandId: string,
  queryText: string,
  topicId?: string,
  competitorId?: string
) {
  // Call the keyword-tracking Edge Function
  const supabase = createServerClient()
  
  const { data, error } = await supabase.functions.invoke('keyword-tracking', {
    body: {
      method: 'track',
      body: {
        brand_id: brandId,
        topic_id: topicId,
        competitor_id: competitorId,
        query_text: queryText
      }
    }
  })
  
  if (error) {
    console.error('Error tracking keyword query:', error)
    return null
  }
  
  return data?.query || null
} 