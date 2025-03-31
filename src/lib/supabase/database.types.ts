/**
 * This type is used to define the schema of our database.
 * It is recommended to use the Supabase CLI to generate these types:
 * https://supabase.com/docs/guides/api/generating-types
 */

export type Database = {
  public: {
    Tables: {
      brands: {
        Row: {
          id: string
          name: string
          organization_id: string
          website?: string | null
          description?: string | null
          industry?: string | null
          business_model?: string | null
          target_audience?: string | null
          unique_value_props?: Record<string, string | number | boolean> | null
          created_at?: string | null
        }
        Insert: {
          id?: string
          name: string
          organization_id: string
          website?: string | null
          description?: string | null
          industry?: string | null
          business_model?: string | null
          target_audience?: string | null
          unique_value_props?: Record<string, string | number | boolean> | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          organization_id?: string
          website?: string | null
          description?: string | null
          industry?: string | null
          business_model?: string | null
          target_audience?: string | null
          unique_value_props?: Record<string, string | number | boolean> | null
          created_at?: string | null
        }
      }
      competitors: {
        Row: {
          id: string
          brand_id: string
          name: string
          website?: string | null
          description?: string | null
          strengths?: string[] | null
          weaknesses?: string[] | null
          created_at?: string | null
        }
        Insert: {
          id?: string
          brand_id: string
          name: string
          website?: string | null
          description?: string | null
          strengths?: string[] | null
          weaknesses?: string[] | null
          created_at?: string | null
        }
        Update: {
          id?: string
          brand_id?: string
          name?: string
          website?: string | null
          description?: string | null
          strengths?: string[] | null
          weaknesses?: string[] | null
          created_at?: string | null
        }
      }
      topics: {
        Row: {
          id: string
          name: string
          description?: string | null
          keywords?: string[] | null
          category?: string | null
          created_at?: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          keywords?: string[] | null
          category?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          keywords?: string[] | null
          category?: string | null
          created_at?: string | null
        }
      }
      prompt_templates: {
        Row: {
          id: string
          name: string
          version: string
          template_text: string
          purpose: string
          variables?: Record<string, unknown> | null
          metadata?: Record<string, string | number | boolean | object> | null
          created_at?: string | null
        }
        Insert: {
          id?: string
          name: string
          version: string
          template_text: string
          purpose: string
          variables?: Record<string, unknown> | null
          metadata?: Record<string, string | number | boolean | object> | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          version?: string
          template_text?: string
          purpose?: string
          variables?: Record<string, unknown> | null
          metadata?: Record<string, string | number | boolean | object> | null
          created_at?: string | null
        }
      }
      keyword_queries: {
        Row: {
          id: string
          brand_id: string
          competitor_id?: string | null
          topic_id?: string | null
          query_text: string
          llm_type: string
          llm_version: string
          llm_response: string
          brand_mentioned: boolean
          sentiment_score: number
          ranking_position: number
          created_at?: string | null
        }
        Insert: {
          id?: string
          brand_id: string
          competitor_id?: string | null
          topic_id?: string | null
          query_text: string
          llm_type: string
          llm_version: string
          llm_response: string
          brand_mentioned: boolean
          sentiment_score: number
          ranking_position: number
          created_at?: string | null
        }
        Update: {
          id?: string
          brand_id?: string
          competitor_id?: string | null
          topic_id?: string | null
          query_text?: string
          llm_type?: string
          llm_version?: string
          llm_response?: string
          brand_mentioned?: boolean
          sentiment_score?: number
          ranking_position?: number
          created_at?: string | null
        }
      }
      ranking_history: {
        Row: {
          id: string
          brand_id: string
          topic_id?: string | null
          query_id: string
          position: number
          sentiment_score: number
          created_at?: string | null
        }
        Insert: {
          id?: string
          brand_id: string
          topic_id?: string | null
          query_id: string
          position: number
          sentiment_score: number
          created_at?: string | null
        }
        Update: {
          id?: string
          brand_id?: string
          topic_id?: string | null
          query_id?: string
          position?: number
          sentiment_score?: number
          created_at?: string | null
        }
      }
      sources: {
        Row: {
          id: string
          url: string
          title: string
          type: string
          domain: string
          author?: string | null
          published_date?: string | null
          content_snippet?: string | null
          authority_score?: number | null
          created_at?: string | null
        }
        Insert: {
          id?: string
          url: string
          title: string
          type: string
          domain: string
          author?: string | null
          published_date?: string | null
          content_snippet?: string | null
          authority_score?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          url?: string
          title?: string
          type?: string
          domain?: string
          author?: string | null
          published_date?: string | null
          content_snippet?: string | null
          authority_score?: number | null
          created_at?: string | null
        }
      }
      source_mentions: {
        Row: {
          id: string
          source_id: string
          brand_id: string
          topic_id?: string | null
          mention_text: string
          sentiment_score: number
          created_at?: string | null
        }
        Insert: {
          id?: string
          source_id: string
          brand_id: string
          topic_id?: string | null
          mention_text: string
          sentiment_score: number
          created_at?: string | null
        }
        Update: {
          id?: string
          source_id?: string
          brand_id?: string
          topic_id?: string | null
          mention_text?: string
          sentiment_score?: number
          created_at?: string | null
        }
      }
      source_influence_scores: {
        Row: {
          id: string
          source_id: string
          brand_id: string
          topic_id?: string | null
          influence_score: number
          mention_count: number
          avg_sentiment: number
          created_at?: string | null
        }
        Insert: {
          id?: string
          source_id: string
          brand_id: string
          topic_id?: string | null
          influence_score: number
          mention_count: number
          avg_sentiment: number
          created_at?: string | null
        }
        Update: {
          id?: string
          source_id?: string
          brand_id?: string
          topic_id?: string | null
          influence_score?: number
          mention_count?: number
          avg_sentiment?: number
          created_at?: string | null
        }
      }
      narrative_trends: {
        Row: {
          id: string
          brand_id: string
          topic_id?: string | null
          timeframe: string
          mention_count: number
          avg_sentiment: number
          key_themes: string[]
          trend_direction: string
          created_at?: string | null
        }
        Insert: {
          id?: string
          brand_id: string
          topic_id?: string | null
          timeframe: string
          mention_count: number
          avg_sentiment: number
          key_themes: string[]
          trend_direction: string
          created_at?: string | null
        }
        Update: {
          id?: string
          brand_id?: string
          topic_id?: string | null
          timeframe?: string
          mention_count?: number
          avg_sentiment?: number
          key_themes?: string[]
          trend_direction?: string
          created_at?: string | null
        }
      }
      narrative_insights: {
        Row: {
          id: string
          brand_id: string
          topic_id?: string | null
          insight_title: string
          insight_text: string
          confidence_score: number
          supporting_data?: Record<string, unknown> | null
          created_at?: string | null
        }
        Insert: {
          id?: string
          brand_id: string
          topic_id?: string | null
          insight_title: string
          insight_text: string
          confidence_score: number
          supporting_data?: Record<string, unknown> | null
          created_at?: string | null
        }
        Update: {
          id?: string
          brand_id?: string
          topic_id?: string | null
          insight_title?: string
          insight_text?: string
          confidence_score?: number
          supporting_data?: Record<string, unknown> | null
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 