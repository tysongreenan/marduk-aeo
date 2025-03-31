import { Database as DatabaseGenerated } from './database.types'

export type Database = DatabaseGenerated

export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row']

export type Enums<T extends keyof Database['public']['Enums']> = 
  Database['public']['Enums'][T]

// Define common table types for convenience
export type Brand = Tables<'brands'>
export type Competitor = Tables<'competitors'>
export type Topic = Tables<'topics'>
export type PromptTemplate = Tables<'prompt_templates'>
export type KeywordQuery = Tables<'keyword_queries'>
export type RankingHistory = Tables<'ranking_history'>
export type Source = Tables<'sources'>
export type SourceMention = Tables<'source_mentions'>
export type SourceInfluence = Tables<'source_influence_scores'>
export type NarrativeTrend = Tables<'narrative_trends'>
export type NarrativeInsight = Tables<'narrative_insights'> 