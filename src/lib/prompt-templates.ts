import { createClient } from '@supabase/supabase-js';

// Types for prompt templates
export interface PromptVariable {
  type: string;
  required: boolean;
  description?: string;
}

export interface PromptTemplate {
  id?: string;
  name: string;
  version: string;
  template_text: string;
  purpose: string;
  variables?: Record<string, PromptVariable>;
  metadata?: Record<string, string | number | boolean | object>;
  created_at?: string;
}

export interface TestCase {
  [key: string]: string | number | boolean | object;
}

// Define response types for better type safety
export interface TemplateTestResult {
  templateId: string;
  testCaseId: string;
  result: string;
  tokens: number;
  latency: number;
  success: boolean;
  error?: string;
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Prompt template service for managing and testing templates
 */
export const promptTemplateService = {
  /**
   * Create a new prompt template
   */
  async createTemplate(template: PromptTemplate): Promise<PromptTemplate> {
    try {
      const { data, error } = await supabase.functions.invoke('prompt-templates', {
        body: {
          method: 'create',
          body: template
        }
      });
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error creating prompt template:', error);
      throw error;
    }
  },

  /**
   * Test a prompt template with specific test cases
   */
  async testTemplate(templateId: string, testCases: TestCase[], llmType: string = 'openai'): Promise<TemplateTestResult[]> {
    try {
      const { data, error } = await supabase.functions.invoke('prompt-templates', {
        body: {
          method: 'test',
          body: {
            template_id: templateId,
            test_cases: testCases,
            llm_type: llmType
          }
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error testing prompt template:', error);
      throw error;
    }
  },

  /**
   * List all prompt templates
   */
  async listTemplates(): Promise<PromptTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error listing prompt templates:', error);
      throw error;
    }
  },

  /**
   * Get a specific prompt template by ID
   */
  async getTemplate(id: string): Promise<PromptTemplate> {
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting prompt template:', error);
      throw error;
    }
  },

  /**
   * Update an existing prompt template
   */
  async updateTemplate(id: string, updates: Partial<PromptTemplate>): Promise<PromptTemplate> {
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating prompt template:', error);
      throw error;
    }
  },

  /**
   * Delete a prompt template
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('prompt_templates')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting prompt template:', error);
      throw error;
    }
  }
};

/**
 * Process a template with variables
 */
export function processTemplate(template: string, variables: Record<string, string | number | boolean>): string {
  let processedTemplate = template;
  
  // Replace each variable placeholder with its value
  Object.entries(variables).forEach(([key, value]) => {
    processedTemplate = processedTemplate.replace(new RegExp(`{${key}}`, 'g'), String(value));
  });
  
  return processedTemplate;
} 