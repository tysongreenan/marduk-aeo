import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { UsageTrend, Alert, CostProjection, UsageSettings, AuthResponse, LoginFormData, SignupFormData, User, UsageTrendResponse, BrandKeywords, RankingPerformanceResponse, RankingInsightsResponse, RankingAlert } from './types';
import { supabase } from './utils/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Create axios instance with base URL and security headers
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // Helps prevent CSRF
  },
  withCredentials: true, // Send cookies with cross-origin requests
  timeout: 10000, // 10 second timeout
});

// Request interceptor for adding auth token and validation
api.interceptors.request.use(
  async (config) => {
    // Get Supabase session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    // Add the token from Supabase session if available
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    
    // Add CSRF protection
    const csrfToken = localStorage.getItem('csrf_token');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    
    // Add request timestamp for replay protection
    config.headers['X-Request-Timestamp'] = Date.now().toString();
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Store CSRF token if present in response
    const csrfToken = response.headers['x-csrf-token'];
    if (csrfToken) {
      localStorage.setItem('csrf_token', csrfToken);
    }
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      // Handle authentication errors
      if (error.response.status === 401) {
        // Clear any stored tokens and redirect to login
        supabase.auth.signOut();
        window.location.href = '/login';
      }
      
      // Handle rate limiting
      if (error.response.status === 429) {
        console.error('Rate limit exceeded. Please try again later.');
      }
      
      // Log security-related errors but don't expose details to console
      if (error.response.status === 403) {
        console.error('Authorization error. Access denied.');
      }
    } else if (error.request) {
      // Network error
      console.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

// Input validation helper
const validateInput = (data: any, constraints: Record<string, (val: any) => boolean>) => {
  const errors: Record<string, string> = {};
  
  Object.entries(constraints).forEach(([field, validator]) => {
    if (data[field] !== undefined && !validator(data[field])) {
      errors[field] = `Invalid ${field}`;
    }
  });
  
  if (Object.keys(errors).length > 0) {
    throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
  }
  
  return data;
};

// Validators
const validators = {
  nonEmptyString: (val: any) => typeof val === 'string' && val.trim().length > 0,
  email: (val: any) => typeof val === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
  positiveNumber: (val: any) => typeof val === 'number' && val > 0,
  userId: (val: any) => typeof val === 'string' && val.trim().length > 0,
};

// Authentication functions (now using Supabase)
export const login = async (email: string, password: string): Promise<boolean> => {
  try {
    // Validate inputs
    validateInput(
      { email, password },
      { email: validators.email, password: validators.nonEmptyString }
    );
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Login error:', error.message);
      return false;
    }
    
    return !!data.session;
  } catch (error: any) {
    console.error('Login error:', error.message);
    return false;
  }
};

export const signup = async (userData: SignupFormData): Promise<AuthResponse> => {
  try {
    // Validate inputs
    validateInput(
      userData,
      { 
        email: validators.email, 
        password: validators.nonEmptyString,
        organization_name: validators.nonEmptyString
      }
    );
    
    // Extract metadata for Supabase
    const { confirmPassword, ...signupData } = userData;
    
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          organization_name: userData.organization_name,
          role: 'user', // Default role
        }
      }
    });
    
    if (error) throw error;
    
    // Convert Supabase response to our AuthResponse format
    return {
      access_token: data.session?.access_token || '',
      token_type: 'bearer',
      expires_at: data.session?.expires_at || 0,
      user: {
        id: data.user?.id || '',
        email: data.user?.email || '',
        organization_id: data.user?.user_metadata?.organization_name || '',
        role: data.user?.user_metadata?.role || 'user',
      }
    };
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<User> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      throw error;
    }
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Convert Supabase user to our User format
    return {
      id: user.id,
      email: user.email || '',
      organization_id: user.user_metadata?.organization_name || '',
      role: user.user_metadata?.role || 'user',
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  await supabase.auth.signOut();
};

export const isAuthenticated = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

// Dashboard data fetching
export const getUsageTrends = async (): Promise<UsageTrendResponse> => {
  try {
    const response = await api.get('/analytics/usage-trends');
    return response.data;
  } catch (error) {
    console.error('Error fetching usage trends:', error);
    return {
      daily_usage: {},
      total_usage_percent: 0,
      days_analyzed: 30
    };
  }
};

export const getAlertHistory = async (): Promise<Alert[]> => {
  try {
    const response = await api.get('/dashboard/alert-history');
    return response.data;
  } catch (error) {
    console.error('Error fetching alert history:', error);
    return [];
  }
};

export const getCostProjection = async (): Promise<CostProjection> => {
  try {
    const response = await api.get('/dashboard/cost-projection');
    return response.data;
  } catch (error) {
    console.error('Error fetching cost projection:', error);
    // Return default data in case of error
    return {
      plan_cost: 50,
      current_value: 0,
      projected_cost: 50,
      projected_date: new Date().toISOString(),
      projected_percentage: 0
    };
  }
};

export const updateAlertSettings = async (settings: UsageSettings): Promise<UsageSettings> => {
  try {
    const response = await api.post('/dashboard/update-alerts', settings);
    return response.data.settings;
  } catch (error) {
    console.error('Error updating alert settings:', error);
    throw error;
  }
};

// Ranking API endpoints
export const getRankingPerformance = async (userId: string, days = 30): Promise<RankingPerformanceResponse> => {
  try {
    // Use mock data based on the user's stored brands/keywords
    const brandData = JSON.parse(localStorage.getItem('mockBrands') || '[]');
    
    if (brandData.length === 0) {
      return { keywords: [] };
    }
    
    // Create mock performance data based on actual saved keywords
    const keywords = [];
    const latestBrand = brandData[brandData.length - 1];
    
    if (latestBrand && latestBrand.keywords) {
      // Split comma-separated keywords
      const keywordList = latestBrand.keywords.split(',').map((k: string) => k.trim());
      
      for (const keyword of keywordList) {
        // Generate random performance metrics
        const searches = Math.floor(Math.random() * 20) + 5; // 5-25 searches
        const appearances = Math.floor(Math.random() * (searches + 1)); // 0 to searches
        const percentage = searches > 0 ? Math.round((appearances / searches) * 100) : 0;
        
        keywords.push({
          keyword,
          brand_name: latestBrand.brand_name,
          searches,
          appearances,
          percentage,
          position: appearances > 0 ? Math.floor(Math.random() * 5) + 1 : 0,
          potential_impressions: searches * 1000
        });
      }
    }
    
    return { keywords };
  } catch (error) {
    console.error('Error fetching ranking performance data:', error);
    return { keywords: [] };
  }
};

export const getRankingInsights = async (userId: string, days: number = 7): Promise<RankingInsightsResponse> => {
  try {
    // Use mock data based on the user's stored brands/keywords
    const brandData = JSON.parse(localStorage.getItem('mockBrands') || '[]');
    
    if (brandData.length === 0) {
      return { insights: [] };
    }
    
    // Create mock insights based on actual saved keywords
    const insights = [];
    const latestBrand = brandData[brandData.length - 1];
    
    if (latestBrand && latestBrand.keywords) {
      // Split comma-separated keywords
      const keywordList = latestBrand.keywords.split(',').map((k: string) => k.trim());
      
      // Common insights templates
      const insightTemplates = [
        "Top results mentioned '{topic}' frequently",
        "Competitors are highlighting '{topic}' in their content",
        "AI prefers answers that include '{topic}' details",
        "Top-ranked results address '{topic}' clearly"
      ];
      
      // Action templates
      const actionTemplates = [
        "Add a blog post: '{topic} - What You Need to Know'",
        "Update your website to highlight your '{topic}' offerings",
        "Create content that addresses '{topic}' specifically",
        "Add testimonials related to '{topic}' on your website"
      ];
      
      // Topics related to various industries
      const topics = [
        "pricing transparency", "customer testimonials", "service guarantees",
        "local experience", "quick response times", "expertise details",
        "product variety", "satisfaction guarantee", "eco-friendly options",
        "delivery options", "technical specifications", "case studies"
      ];
      
      for (const keyword of keywordList) {
        // Generate 1-2 insights per keyword
        const insightsCount = Math.floor(Math.random() * 2) + 1;
        
        for (let i = 0; i < insightsCount; i++) {
          const topic = topics[Math.floor(Math.random() * topics.length)];
          const insightTemplate = insightTemplates[Math.floor(Math.random() * insightTemplates.length)];
          const actionTemplate = actionTemplates[Math.floor(Math.random() * actionTemplates.length)];
          
          insights.push({
            keyword,
            brand_name: latestBrand.brand_name,
            insight: insightTemplate.replace('{topic}', topic),
            action: actionTemplate.replace('{topic}', topic),
            priority: Math.floor(Math.random() * 3) + 1, // 1-3 priority
            id: `insight-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
          });
        }
      }
    }
    
    return { insights };
  } catch (error) {
    console.error('Error fetching ranking insights:', error);
    return { insights: [] };
  }
};

export const checkRankingAlerts = async (userId: string, days: number = 7): Promise<{ alerts: RankingAlert[] }> => {
  try {
    // Use mock data based on the user's stored brands/keywords
    const brandData = JSON.parse(localStorage.getItem('mockBrands') || '[]');
    
    if (brandData.length === 0) {
      return { alerts: [] };
    }
    
    // Create mock alerts based on actual saved brand info
    const alerts: RankingAlert[] = [];
    const latestBrand = brandData[brandData.length - 1];
    
    if (latestBrand) {
      // Alert templates
      const alertTemplates = [
        "Your brand was not found for keyword '{keyword}'",
        "Your ranking dropped for '{keyword}' by {num}%",
        "Competitors gaining visibility for '{keyword}'",
        "New opportunity detected for '{keyword}'"
      ];
      
      // Generate 1-3 alerts
      const alertsCount = Math.floor(Math.random() * 3) + 1;
      
      // Split comma-separated keywords
      const keywordList = latestBrand.keywords.split(',').map((k: string) => k.trim());
      
      for (let i = 0; i < Math.min(alertsCount, keywordList.length); i++) {
        const keyword = keywordList[i];
        const template = alertTemplates[Math.floor(Math.random() * alertTemplates.length)];
        const changePercent = Math.floor(Math.random() * 30) + 5;
        
        // Create properly typed RankingAlert objects
        alerts.push({
          keyword,
          percentage: Math.floor(Math.random() * 100),
          threshold: 50, // Default threshold
          message: template
            .replace('{keyword}', keyword)
            .replace('{num}', changePercent.toString())
        });
      }
    }
    
    return { alerts };
  } catch (error) {
    console.error('Error checking ranking alerts:', error);
    return { alerts: [] };
  }
};

export const updateRankingAlertSettings = async (userId: string, alertType: string, rankingThreshold: number): Promise<{ message: string, id: string }> => {
  try {
    // Validate inputs
    validateInput(
      { userId, alertType, rankingThreshold },
      { 
        userId: validators.userId, 
        alertType: validators.nonEmptyString,
        rankingThreshold: validators.positiveNumber
      }
    );
    
    const response = await api.post('/dashboard/update-alerts', {
      user_id: userId,
      alert_type: alertType,
      ranking_threshold: rankingThreshold
    });
    return response.data;
  } catch (error) {
    console.error('Error updating ranking alert settings:', error);
    throw error;
  }
};

export const storeSearchResult = async (searchData: {
  user_id: string,
  keyword: string,
  brand_name: string,
  found: boolean,
  response_text: string,
  rank?: number,
  confidence?: number
}): Promise<{ message: string, id: string }> => {
  try {
    const response = await api.post('/dashboard/store-search-result', searchData);
    return response.data;
  } catch (error) {
    console.error('Error storing search result:', error);
    throw error;
  }
};

// Secure WebSocket connection
export const connectToWebSocket = (onMessage: (data: any) => void): WebSocket => {
  const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  const ws = new WebSocket(`${protocol}${API_URL.replace('http://', '').replace('https://', '')}/ws`);
  
  ws.onopen = () => {
    console.log('WebSocket connection established');
    // Add authentication to WebSocket
    const token = localStorage.getItem('auth_token');
    if (token) {
      ws.send(JSON.stringify({ token }));
    }
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      // Validate data structure before processing
      if (data && typeof data === 'object') {
        onMessage(data);
      } else {
        console.error('Invalid WebSocket data format');
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  ws.onclose = () => {
    console.log('WebSocket connection closed');
  };
  
  return ws;
};

// Add brand and keywords
export const addBrand = async (brandData: BrandKeywords): Promise<{ success: boolean; message: string; brand_id?: string }> => {
  try {
    console.log('Mock adding brand:', brandData);
    
    // Generate a unique ID for the brand
    const brandId = `mock-brand-${Date.now()}`;
    
    // Save brand data to localStorage for persistence in the session
    const existingBrands = localStorage.getItem('mockBrands') 
      ? JSON.parse(localStorage.getItem('mockBrands') || '[]') 
      : [];
      
    const newBrand = {
      id: brandId,
      brand_name: brandData.brand_name,
      keywords: brandData.keywords,
      created_at: new Date().toISOString()
    };
    
    existingBrands.push(newBrand);
    localStorage.setItem('mockBrands', JSON.stringify(existingBrands));
    
    // Generate mock search results data for the last 30 days
    generateMockSearchResults(brandData.brand_name, brandData.keywords);
    
    console.log('Brand saved to localStorage:', newBrand);
    
    // Mock successful response
    return {
      success: true,
      message: "Brand added successfully (mock)",
      brand_id: brandId
    };
  } catch (error: any) {
    if (error.response) {
      console.error('Add brand error response:', {
        data: error.response.data,
        status: error.response.status,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error('Add brand request error (no response):', error.request);
    } else {
      console.error('Add brand error message:', error.message);
    }
    throw error;
  }
};

// Helper function to generate mock search results data
function generateMockSearchResults(brandName: string, keywordsStr: string) {
  const keywordList = keywordsStr.split(',').map((k: string) => k.trim());
  const llmTypes = ['gpt-3.5-turbo', 'gemini', 'perplexity', 'claude', 'chatgpt'];
  const sentimentTypes = ['positive', 'neutral', 'negative'];
  const aviImpactTypes = ['low', 'medium', 'high'];
  
  // Generate data for the past 30 days
  const searchResults = [];
  const now = new Date();
  
  for (let day = 0; day < 30; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    const dateStr = date.toISOString().split('T')[0];
    
    // Generate multiple results per day for each keyword
    for (const keyword of keywordList) {
      // Create 2-5 search results per keyword per day
      const resultsCount = Math.floor(Math.random() * 4) + 2;
      
      for (let i = 0; i < resultsCount; i++) {
        // Increasing probability of finding the brand as we get closer to today
        const recencyBoost = day / 30; // 0 for today, almost 1 for 30 days ago
        const foundProbability = 0.3 + (0.5 * (1 - recencyBoost));
        const found = Math.random() < foundProbability;
        
        // Get a random LLM
        const llm = llmTypes[Math.floor(Math.random() * llmTypes.length)];
        
        // More likely to have positive sentiment if found
        const sentimentProbabilities = found 
          ? [0.7, 0.2, 0.1]  // 70% positive if found
          : [0.3, 0.4, 0.3]; // 30% positive if not found
        
        let sentimentIndex = 0;
        const sentimentRoll = Math.random();
        let cumulativeProbability = 0;
        
        for (let j = 0; j < sentimentProbabilities.length; j++) {
          cumulativeProbability += sentimentProbabilities[j];
          if (sentimentRoll <= cumulativeProbability) {
            sentimentIndex = j;
            break;
          }
        }
        
        const sentiment = sentimentTypes[sentimentIndex];
        
        // AVI impact based on frequency of appearance
        let aviImpact: string;
        const appearanceRate = found ? (Math.random() * 100) : (Math.random() * 30);
        
        if (appearanceRate < 30) {
          aviImpact = 'low';
        } else if (appearanceRate < 60) {
          aviImpact = 'medium';
        } else {
          aviImpact = 'high';
        }
        
        // Generate mock response text with some content
        let responseText = `Here's what I found about ${keyword}:\n`;
        
        if (found) {
          responseText += `${brandName} is one of the notable options for ${keyword}. `;
          responseText += sentiment === 'positive' 
            ? `Many customers praise their excellent service and quality.` 
            : sentiment === 'neutral' 
              ? `They provide standard service in this category.` 
              : `Some customers have reported issues with their service.`;
        } else {
          responseText += `Several options are available including `;
          // Generate some competitor names
          const competitors = ['Top Choice', 'Premier Services', 'Elite Options', 'Best Solutions', 'First Class'];
          for (let c = 0; c < 3; c++) {
            responseText += competitors[Math.floor(Math.random() * competitors.length)];
            if (c < 2) responseText += ', ';
          }
          responseText += '.';
        }
        
        // Entity recognition - more likely if found
        const entityRecognized = found || Math.random() < 0.3;
        
        searchResults.push({
          id: `search-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          keyword,
          brand_name: brandName,
          found,
          response_text: responseText,
          timestamp: new Date(date).toISOString(),
          llm,
          sentiment,
          avi_impact: aviImpact,
          entity_recognized: entityRecognized
        });
      }
    }
  }
  
  // Store in localStorage
  localStorage.setItem('mockSearchResults', JSON.stringify(searchResults));
  
  return searchResults;
}

// Ranking Trends API
export const getRankingTrends = async (userId: string, days = 30) => {
  try {
    const response = await api.get(`/dashboard/ranking-trends?user_id=${userId}&days=${days}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching ranking trends data:', error);
    return { trends: [] };
  }
};

// Keyword Insights API
export const getKeywordInsights = async (userId: string, limit = 10) => {
  try {
    const response = await api.get(`/dashboard/keyword-insights?user_id=${userId}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching keyword insights data:', error);
    return { insights: [] };
  }
};

// Check if user has set up any brands
export const checkUserHasBrands = async (): Promise<boolean> => {
  try {
    // Check localStorage instead of making an API call
    const brands = localStorage.getItem('mockBrands');
    const parsedBrands = brands ? JSON.parse(brands) : [];
    return parsedBrands.length > 0;
    
    // Original code commented out
    // const response = await api.get('/dashboard/check-user-brands');
    // return response.data.has_brands || false;
  } catch (error) {
    console.error('Error checking if user has brands:', error);
    // For now, assume user has no brands if there's an error
    return false;
  }
};

// Manually run LLM queries for the user's keywords
export const runQueriesManually = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    // Simulate running queries by updating localStorage with "results"
    const brandData = JSON.parse(localStorage.getItem('mockBrands') || '[]');
    
    if (brandData.length === 0) {
      return { 
        success: false, 
        message: 'No brands or keywords found to run queries for' 
      };
    }
    
    const latestBrand = brandData[brandData.length - 1];
    
    // Store the fact that queries were run
    const now = new Date();
    localStorage.setItem('lastQueriesRun', now.toISOString());
    localStorage.setItem('lastQueriesBrand', latestBrand.brand_name);
    
    // Return success
    return { 
      success: true, 
      message: `Queries successfully run for "${latestBrand.brand_name}" at ${now.toLocaleTimeString()}`
    };
  } catch (error: any) {
    console.error('Error running queries manually:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to run queries'
    };
  }
};

// Visibility trends over time
export const getVisibilityTrends = async (): Promise<{ dates: string[], rates: number[] }> => {
  try {
    // Read mock search results
    const searchResults = JSON.parse(localStorage.getItem('mockSearchResults') || '[]');
    
    // Group by date and calculate rates
    const dateRates: Record<string, { total: number, found: number }> = {};
    
    // Initialize last 30 days
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dateRates[dateStr] = { total: 0, found: 0 };
    }
    
    // Calculate appearances per day
    searchResults.forEach((result: any) => {
      const dateStr = new Date(result.timestamp).toISOString().split('T')[0];
      if (dateRates[dateStr]) {
        dateRates[dateStr].total += 1;
        if (result.found) dateRates[dateStr].found += 1;
      }
    });
    
    // Convert to arrays
    const dates: string[] = [];
    const rates: number[] = [];
    
    // Sort dates
    const sortedDates = Object.keys(dateRates).sort();
    
    for (const date of sortedDates) {
      const stats = dateRates[date];
      dates.push(date);
      rates.push(stats.total > 0 ? Math.round((stats.found / stats.total) * 100) : 0);
    }
    
    return { dates, rates };
  } catch (error) {
    console.error('Error fetching visibility trends:', error);
    return { dates: [], rates: [] };
  }
};

// Sentiment trends over time
export const getSentimentTrends = async (): Promise<{ dates: string[], positiveRates: number[] }> => {
  try {
    // Read mock search results
    const searchResults = JSON.parse(localStorage.getItem('mockSearchResults') || '[]');
    
    // Group by date and calculate sentiment rates
    const dateSentiment: Record<string, { total: number, positive: number }> = {};
    
    // Initialize last 30 days
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dateSentiment[dateStr] = { total: 0, positive: 0 };
    }
    
    // Calculate positive sentiment per day
    searchResults.forEach((result: any) => {
      const dateStr = new Date(result.timestamp).toISOString().split('T')[0];
      if (dateSentiment[dateStr]) {
        dateSentiment[dateStr].total += 1;
        if (result.sentiment === 'positive') dateSentiment[dateStr].positive += 1;
      }
    });
    
    // Convert to arrays
    const dates: string[] = [];
    const positiveRates: number[] = [];
    
    // Sort dates
    const sortedDates = Object.keys(dateSentiment).sort();
    
    for (const date of sortedDates) {
      const stats = dateSentiment[date];
      dates.push(date);
      positiveRates.push(stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0);
    }
    
    return { dates, positiveRates };
  } catch (error) {
    console.error('Error fetching sentiment trends:', error);
    return { dates: [], positiveRates: [] };
  }
};

// LLM-specific visibility metrics
export const getLlmVisibility = async (): Promise<Array<{ llm: string, rate: number, count: number, total: number }>> => {
  try {
    // Read mock search results
    const searchResults = JSON.parse(localStorage.getItem('mockSearchResults') || '[]');
    
    // Group by LLM and calculate rates
    const llmStats: Record<string, { total: number, found: number }> = {};
    
    searchResults.forEach((result: any) => {
      if (!llmStats[result.llm]) {
        llmStats[result.llm] = { total: 0, found: 0 };
      }
      
      llmStats[result.llm].total += 1;
      if (result.found) llmStats[result.llm].found += 1;
    });
    
    // Convert to array
    const llmVisibility = Object.entries(llmStats).map(([llm, stats]) => ({
      llm,
      rate: stats.total > 0 ? Math.round((stats.found / stats.total) * 100) : 0,
      count: stats.found,
      total: stats.total
    }));
    
    // Sort by rate (descending)
    llmVisibility.sort((a, b) => b.rate - a.rate);
    
    return llmVisibility;
  } catch (error) {
    console.error('Error fetching LLM visibility:', error);
    return [];
  }
};

// Top-ranking keywords
export const getTopRankingKeywords = async (): Promise<Array<{ keyword: string, rate: number, count: number, total: number }>> => {
  try {
    // Read mock search results
    const searchResults = JSON.parse(localStorage.getItem('mockSearchResults') || '[]');
    
    // Group by keyword and calculate rates
    const keywordStats: Record<string, { total: number, found: number }> = {};
    
    searchResults.forEach((result: any) => {
      if (!keywordStats[result.keyword]) {
        keywordStats[result.keyword] = { total: 0, found: 0 };
      }
      
      keywordStats[result.keyword].total += 1;
      if (result.found) keywordStats[result.keyword].found += 1;
    });
    
    // Convert to array
    const keywordRanking = Object.entries(keywordStats).map(([keyword, stats]) => ({
      keyword,
      rate: stats.total > 0 ? Math.round((stats.found / stats.total) * 100) : 0,
      count: stats.found,
      total: stats.total
    }));
    
    // Sort by rate (descending)
    keywordRanking.sort((a, b) => b.rate - a.rate);
    
    // Return top 5
    return keywordRanking.slice(0, 5);
  } catch (error) {
    console.error('Error fetching top-ranking keywords:', error);
    return [];
  }
};

// AI Visibility Impact (AVI) assessment
export const getAviAssessment = async (): Promise<{ 
  low: number, 
  low_change: number, 
  medium: number, 
  medium_change: number, 
  high: number, 
  high_change: number, 
  overall: string 
}> => {
  try {
    // Read mock search results
    const searchResults = JSON.parse(localStorage.getItem('mockSearchResults') || '[]');
    
    // Count keywords in each AVI category
    const aviCounts = {
      low: 0,
      medium: 0,
      high: 0
    };
    
    // Previous period (8-14 days ago) for comparison
    const aviPreviousCounts = {
      low: 0,
      medium: 0,
      high: 0
    };
    
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    searchResults.forEach((result: any) => {
      const timestamp = new Date(result.timestamp);
      if (timestamp >= oneWeekAgo) {
        // Current period
        if (result.avi_impact === 'low' || result.avi_impact === 'medium' || result.avi_impact === 'high') {
          aviCounts[result.avi_impact as keyof typeof aviCounts] += 1;
        }
      } else if (timestamp >= twoWeeksAgo) {
        // Previous period
        if (result.avi_impact === 'low' || result.avi_impact === 'medium' || result.avi_impact === 'high') {
          aviPreviousCounts[result.avi_impact as keyof typeof aviPreviousCounts] += 1;
        }
      }
    });
    
    // Calculate changes
    const lowChange = aviCounts.low - aviPreviousCounts.low;
    const mediumChange = aviCounts.medium - aviPreviousCounts.medium;
    const highChange = aviCounts.high - aviPreviousCounts.high;
    
    // Determine overall impact
    const total = aviCounts.low + aviCounts.medium + aviCounts.high;
    let overall = "Medium";
    
    if (total > 0) {
      if ((aviCounts.high / total) > 0.5) {
        overall = "High";
      } else if ((aviCounts.low / total) > 0.5) {
        overall = "Low";
      }
    }
    
    return {
      low: aviCounts.low,
      low_change: lowChange,
      medium: aviCounts.medium,
      medium_change: mediumChange,
      high: aviCounts.high,
      high_change: highChange,
      overall
    };
  } catch (error) {
    console.error('Error fetching AVI assessment:', error);
    return {
      low: 0,
      low_change: 0,
      medium: 0,
      medium_change: 0,
      high: 0,
      high_change: 0,
      overall: "Medium"
    };
  }
};

// Add a competitor
export const addCompetitor = async (competitorName: string): Promise<{ success: boolean, message: string }> => {
  try {
    // Get existing competitors
    const competitors = JSON.parse(localStorage.getItem('mockCompetitors') || '[]');
    
    // Check if competitor already exists
    if (competitors.some((c: any) => c.competitor_name === competitorName)) {
      return {
        success: false,
        message: `Competitor "${competitorName}" already exists`
      };
    }
    
    // Add new competitor
    const newCompetitor = {
      id: `competitor-${Date.now()}`,
      competitor_name: competitorName,
      created_at: new Date().toISOString()
    };
    
    competitors.push(newCompetitor);
    
    // Save to localStorage
    localStorage.setItem('mockCompetitors', JSON.stringify(competitors));
    
    return {
      success: true,
      message: `Competitor "${competitorName}" added successfully`
    };
  } catch (error) {
    console.error('Error adding competitor:', error);
    return {
      success: false,
      message: 'Failed to add competitor'
    };
  }
};

// Get competitors
export const getCompetitors = async (): Promise<Array<{ id: string, competitor_name: string, created_at: string }>> => {
  try {
    const competitors = JSON.parse(localStorage.getItem('mockCompetitors') || '[]');
    return competitors;
  } catch (error) {
    console.error('Error fetching competitors:', error);
    return [];
  }
};

// Get competitor analysis
export const getCompetitorAnalysis = async (): Promise<Array<{ 
  competitor_name: string, 
  metrics: { 
    seo_optimization: number, 
    content_freshness: number, 
    site_authority: number, 
    ai_visibility: number 
  } 
}>> => {
  try {
    // Get competitors
    const competitors = JSON.parse(localStorage.getItem('mockCompetitors') || '[]');
    
    // Generate metrics for each competitor
    const analysis = competitors.map((competitor: any) => {
      return {
        competitor_name: competitor.competitor_name,
        metrics: {
          seo_optimization: Math.floor(Math.random() * 40) + 60, // 60-100
          content_freshness: Math.floor(Math.random() * 40) + 60, // 60-100
          site_authority: Math.floor(Math.random() * 40) + 60, // 60-100
          ai_visibility: Math.floor(Math.random() * 40) + 60 // 60-100
        }
      };
    });
    
    // Also generate metrics for user's brand
    const brandData = JSON.parse(localStorage.getItem('mockBrands') || '[]');
    
    if (brandData.length > 0) {
      const latestBrand = brandData[brandData.length - 1];
      
      analysis.unshift({
        competitor_name: latestBrand.brand_name + " (Your Brand)",
        metrics: {
          seo_optimization: Math.floor(Math.random() * 20) + 50, // 50-70 (slightly lower than competitors)
          content_freshness: Math.floor(Math.random() * 20) + 50, // 50-70
          site_authority: Math.floor(Math.random() * 20) + 50, // 50-70
          ai_visibility: Math.floor(Math.random() * 20) + 50 // 50-70
        }
      });
    }
    
    return analysis;
  } catch (error) {
    console.error('Error fetching competitor analysis:', error);
    return [];
  }
};

// Get sentiment analysis
export const getSentimentAnalysis = async (): Promise<{ positive: number, neutral: number, negative: number }> => {
  try {
    // Read mock search results
    const searchResults = JSON.parse(localStorage.getItem('mockSearchResults') || '[]');
    
    // Count sentiment types
    const sentimentCounts = {
      positive: 0,
      neutral: 0,
      negative: 0
    };
    
    searchResults.forEach((result: any) => {
      if (result.sentiment === 'positive' || result.sentiment === 'neutral' || result.sentiment === 'negative') {
        sentimentCounts[result.sentiment as keyof typeof sentimentCounts] += 1;
      }
    });
    
    // Calculate percentages
    const total = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative;
    
    if (total > 0) {
      return {
        positive: Math.round((sentimentCounts.positive / total) * 100),
        neutral: Math.round((sentimentCounts.neutral / total) * 100),
        negative: Math.round((sentimentCounts.negative / total) * 100)
      };
    }
    
    return { positive: 0, neutral: 0, negative: 0 };
  } catch (error) {
    console.error('Error fetching sentiment analysis:', error);
    return { positive: 0, neutral: 0, negative: 0 };
  }
};

// Get entity recognition
export const getEntityRecognition = async (): Promise<{ recognized: boolean, recognition_rate: number }> => {
  try {
    // Read mock search results
    const searchResults = JSON.parse(localStorage.getItem('mockSearchResults') || '[]');
    
    let recognizedCount = 0;
    let total = 0;
    
    searchResults.forEach((result: any) => {
      total += 1;
      if (result.entity_recognized) {
        recognizedCount += 1;
      }
    });
    
    const recognitionRate = total > 0 ? Math.round((recognizedCount / total) * 100) : 0;
    
    return {
      recognized: recognitionRate > 50,
      recognition_rate: recognitionRate
    };
  } catch (error) {
    console.error('Error fetching entity recognition:', error);
    return { recognized: false, recognition_rate: 0 };
  }
};

// Get ranking insights (SEO, content freshness, etc.)
export const getDetailedInsights = async (): Promise<Array<{ 
  metric: string, 
  score: number, 
  recommendation: string 
}>> => {
  try {
    // Generate mock insights
    const metrics = [
      {
        metric: "SEO Optimization",
        score: Math.floor(Math.random() * 30) + 50, // 50-80
        recommendation: "Add more structured data to your website"
      },
      {
        metric: "Content Freshness",
        score: Math.floor(Math.random() * 30) + 50, // 50-80
        recommendation: "Update your blog with new content at least once a week"
      },
      {
        metric: "Site Authority Signals",
        score: Math.floor(Math.random() * 30) + 50, // 50-80
        recommendation: "Get more high-quality backlinks from industry publications"
      },
      {
        metric: "AI Visibility Potential",
        score: Math.floor(Math.random() * 30) + 50, // 50-80
        recommendation: "Add more specific details about your unique services"
      }
    ];
    
    return metrics;
  } catch (error) {
    console.error('Error fetching detailed insights:', error);
    return [];
  }
};

// Generate a report PDF
export const generateReport = async (): Promise<{ success: boolean, message: string, url?: string }> => {
  try {
    // In a real implementation, this would call a backend endpoint to generate a PDF
    // For our mock implementation, we'll just return a success message
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      success: true,
      message: "Report generated successfully",
      url: "https://example.com/reports/mock-report.pdf" // Mock URL
    };
  } catch (error) {
    console.error('Error generating report:', error);
    return {
      success: false,
      message: "Failed to generate report"
    };
  }
}; 