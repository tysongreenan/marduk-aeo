export interface UsageTrendsData {
    daily_usage: number;
    weekly_usage: number;
    monthly_usage: number;
}

// First Alert interface renamed to SystemAlert to avoid conflict
export interface SystemAlert {
    id: string;
    alert_type: string;
    message: string;
    timestamp: string;
}

export interface CostProjectionData {
    current_cost: number;
    projected_cost: number;
    budget_remaining: number;
}

export interface DashboardData {
    usage_trends: UsageTrendsData;
    recent_alerts: SystemAlert[]; // Updated to use the renamed interface
    cost_projection: CostProjectionData;
}

/**
 * Represents a usage trend data point
 */
export interface UsageTrend {
  date: string;
  usage_percentage: number;
  total_queries: number;
}

/**
 * Represents the usage trends API response
 */
export interface UsageTrendResponse {
  daily_usage: Record<string, number>;
  total_usage_percent: number;
  days_analyzed: number;
}

/**
 * Represents an alert notification
 */
export interface Alert {
  id?: number;
  date: string;
  usage_percentage: number;
  message: string;
  acknowledged: boolean;
}

/**
 * Represents cost projection data
 */
export interface CostProjection {
  plan_cost: number;
  current_value: number;
  projected_cost: number;
  projected_date: string;
  projected_percentage: number;
}

/**
 * Represents usage alert settings
 */
export interface UsageSettings {
  alert_threshold: number; // As a decimal (0.8 = 80%)
  email_notifications: boolean;
  plan_queries: number;
  plan_cost: number;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

// Renamed AuthUser to avoid conflict with the User interface below
export interface AuthUser {
  username: string;
  isAuthenticated: boolean;
}

/**
 * Login form data
 */
export interface LoginFormData {
  email: string;
  password: string;
}

/**
 * Login component props
 */
export interface LoginProps {
  onLoginSuccess: () => void;
}

/**
 * WebSocket message format for real-time updates
 */
export interface WebSocketMessage {
  type: 'usage_update' | 'alert';
  usage_percentage?: number;
  alert?: Alert;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_at: number;
  user: User; // This references the User interface below
}

// Updated User interface to be compatible with Supabase User 
export interface User {
  id: string; // Changed from number to string to match Supabase User
  email: string;
  organization_id: string;
  role: string;
  // Add other Supabase User properties that we might need
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  created_at?: string;
  aud?: string;
  // You can add other needed fields from Supabase User here
}

/**
 * Signup form data
 */
export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  organization_name: string;
}

/**
 * Auth component props
 */
export interface AuthProps {
  onAuthSuccess: () => void;
}

/**
 * Brand and keywords data
 */
export interface BrandKeywords {
  brand_name: string;
  keywords: string;
}

// Ranking Performance Types
export interface RankingData {
  id?: string;
  keyword: string;
  brand_name: string;
  searches: number;
  appearances: number;
  percentage: number;
}

export interface RankingPerformanceResponse {
  keywords: RankingData[];
  message?: string;
}

// Ranking Insights Types
export interface KeywordInsight {
  id?: string;
  keyword: string;
  brand_name?: string;
  insight_type?: 'opportunity' | 'warning' | 'trend';
  title?: string;
  description?: string;
  insight: string;
  action: string;
  change?: number;
  created_at?: string;
}

export interface RankingInsightsResponse {
  insights: KeywordInsight[];
}

// Trend Data Types
export interface TrendDataPoint {
  date: string;
  rank: number;
}

export interface TrendData {
  keyword: string;
  brand: string;
  data: TrendDataPoint[];
}

export interface RankingTrendsResponse {
  trends: TrendData[];
}

// Ranking Alert Types
export interface RankingAlert {
  keyword: string;
  percentage: number;
  threshold: number;
  message: string;
}

/**
 * Security and authentication related types
 */

export interface TokenPayload {
  sub: string; // Subject (user ID)
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
  role: string; // User role
  jti: string; // JWT ID (unique identifier for this token)
  session_id?: string; // Optional session identifier
}

export interface SecurityHeaders {
  'X-CSRF-Token'?: string;
  'X-Request-Timestamp'?: string;
  'Authorization'?: string;
}

export enum UserRoles {
  User = 'user',
  Admin = 'admin',
  SuperAdmin = 'super_admin'
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  error: string | null;
  loading: boolean;
  role: UserRoles;
  permissions: string[];
  lastActivity: number;
}

export interface AuthContext extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  signup: (data: SignupFormData) => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
  checkSession: () => boolean;
}

/**
 * Extended login form with Two-Factor Authentication
 */
export interface LoginFormDataWithTFA extends LoginFormData {
  tfaCode?: string;
  rememberDevice?: boolean;
}

/**
 * Stripe subscription related types
 */

export interface Price {
  id: string;
  product_id: string;
  active: boolean;
  description: string | null;
  unit_amount: number;
  currency: string;
  type: string;
  interval: 'day' | 'week' | 'month' | 'year' | null;
  interval_count: number | null;
  trial_period_days: number | null;
  metadata: Record<string, string> | null;
  products?: Product;
}

export interface Product {
  id: string;
  active: boolean;
  name: string;
  description: string | null;
  image: string | null;
  metadata: Record<string, string> | null;
  prices?: Price[];
}

export interface Subscription {
  id: string;
  user_id: string;
  status: 'trialing' | 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid';
  metadata: Record<string, string> | null;
  price_id: string;
  quantity: number | null;
  cancel_at_period_end: boolean;
  created: string;
  current_period_start: string;
  current_period_end: string;
  ended_at: string | null;
  cancel_at: string | null;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  prices?: Price;
}

export interface BillingDetails {
  subscription: Subscription | null;
  upcomingInvoice: {
    amount_due: number;
    currency: string;
    period_end: string;
  } | null;
  allProducts: Product[] | [];
} 