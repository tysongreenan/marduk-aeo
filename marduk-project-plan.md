# Marduk AEO Platform: Project Plan

## Project Overview

**Objective:** Build a comprehensive Answer Engine Optimization (AEO) platform that helps businesses track, analyze, optimize, and measure their presence in AI-generated responses.

**Target Users:** 
- Digital marketers
- SEO professionals
- Content creators
- Brand managers

**Core Value Proposition:** Help businesses optimize their online presence for AI-generated answers, not just traditional search results.

## System Architecture

```
┌───────────────────┐     ┌────────────────────┐     ┌─────────────────────┐
│ Source Influence  │     │                    │     │  Optimization       │
│ Tracker           │────▶│  AI Narrative      │────▶│  Command Center     │
│                   │     │  Analyzer          │     │                     │
└───────────────────┘     │                    │     └─────────────────────┘
                          └────────────────────┘             │
                                   ▲                         │
                                   │                         ▼
                                   │               ┌─────────────────────┐
                                   └───────────────│  Dark Search        │
                                                   │  Analytics          │
                                                   │                     │
                                                   └─────────────────────┘
```

## Core Modules & Implementation Plan

### 1. Keyword Query Tracking System

**Priority:** High (First module to implement)

**Purpose:** Discover, track, and analyze specific search queries users are asking AI assistants.

**Key Components:**
- Query Discovery Engine
- Query Performance Database
- Query Opportunity Scoring
- Content Gap Analyzer

**Implementation Strategy:**
- Build system to generate keyword variations (negations, questions, alternatives)
- Create tracking infrastructure to monitor query performance across LLMs
- Develop scoring algorithm to prioritize high-opportunity keywords
- Implement analytics to identify content gaps

### 2. Source Influence Tracker

**Priority:** Medium-High (Second module to implement)

**Purpose:** Track authoritative sources AI models reference when answering queries.

**Key Components:**
- Source discovery system
- Source mention tracking
- Influence scoring algorithm
- Competitive source analysis

**Implementation Strategy:**
- Create specialized prompts to extract source information
- Build database for tracking source mentions over time
- Develop algorithms to calculate influence scores
- Implement competitor comparison functionality

### 3. AI Narrative Analyzer

**Priority:** Medium (Third module to implement)

**Purpose:** Analyze how brands are represented in AI responses.

**Key Components:**
- Brand mention extraction
- Sentiment analysis
- Positioning evaluation
- Competitive comparison

**Implementation Strategy:**
- Develop extraction algorithms for brand mentions
- Implement sentiment analysis specific to brand mentions
- Create positioning metrics based on text analysis
- Build comparative reporting system

### 4. Optimization Command Center

**Priority:** Medium-Low (Fourth module to implement)

**Purpose:** Generate actionable recommendations to improve AEO performance.

**Key Components:**
- Opportunity identification
- Recommendation generation
- Content templates
- Implementation tracking

**Implementation Strategy:**
- Create algorithm to identify highest-impact opportunities
- Develop recommendation engine based on best practices
- Build template generation system for various content types
- Implement tracking for recommendation implementation

### 5. Dark Search Analytics

**Priority:** Low (Final module to implement)

**Purpose:** Connect AEO metrics with business outcomes.

**Key Components:**
- Correlation analysis
- Time lag evaluation
- Business impact projections
- ROI calculator

**Implementation Strategy:**
- Develop statistical models to correlate AEO metrics with business KPIs
- Create time lag analysis to identify delayed effects
- Build predictive models for business impact
- Implement ROI calculation tools

## Technical Implementation Approach

### Prompt Engineering System

**Prompt Template Management:**
- Create a library of standardized, versioned prompt templates for different types of queries and LLMs
- Implement A/B testing for prompt variations to identify which ones consistently extract the most reliable and structured data
- Develop a metadata tagging system to track which prompt versions were used for which queries

**Prompt Robustness Testing:**
- Create an automated system that tests prompt effectiveness across different LLMs
- Build regression tests to ensure new prompt versions maintain or improve performance
- Develop a "canonicalization" layer that normalizes varied LLM responses into consistent, comparable data structures

**Sample Implementation:**
```javascript
// Prompt Template System
class PromptTemplate {
  constructor(id, version, text, metadata) {
    this.id = id;
    this.version = version;
    this.text = text;
    this.metadata = metadata;
    this.performance = {
      successRate: 0,
      structureConsistency: 0,
      responseCompleteness: 0
    };
  }
  
  format(variables) {
    let formatted = this.text;
    for (const [key, value] of Object.entries(variables)) {
      formatted = formatted.replace(`{{${key}}}`, value);
    }
    return formatted;
  }
}

// Prompt Test System
async function testPromptTemplate(template, testCases, llmProviders) {
  const results = {
    overall: { successRate: 0, structureConsistency: 0, responseCompleteness: 0 },
    byProvider: {}
  };
  
  for (const provider of llmProviders) {
    results.byProvider[provider.name] = { 
      successRate: 0, 
      structureConsistency: 0,
      responseCompleteness: 0,
      responses: []
    };
    
    for (const testCase of testCases) {
      const formattedPrompt = template.format(testCase.variables);
      const response = await provider.query(formattedPrompt);
      const evaluation = evaluateResponse(response, testCase.expectedStructure);
      
      results.byProvider[provider.name].responses.push({
        prompt: formattedPrompt,
        response,
        evaluation
      });
      
      // Update metrics
      results.byProvider[provider.name].successRate += evaluation.isSuccess ? 1 : 0;
      results.byProvider[provider.name].structureConsistency += evaluation.structureScore;
      results.byProvider[provider.name].responseCompleteness += evaluation.completenessScore;
    }
    
    // Calculate averages
    const testCount = testCases.length;
    results.byProvider[provider.name].successRate /= testCount;
    results.byProvider[provider.name].structureConsistency /= testCount;
    results.byProvider[provider.name].responseCompleteness /= testCount;
    
    // Update overall results
    results.overall.successRate += results.byProvider[provider.name].successRate;
    results.overall.structureConsistency += results.byProvider[provider.name].structureConsistency;
    results.overall.responseCompleteness += results.byProvider[provider.name].responseCompleteness;
  }
  
  // Calculate overall averages
  const providerCount = llmProviders.length;
  results.overall.successRate /= providerCount;
  results.overall.structureConsistency /= providerCount;
  results.overall.responseCompleteness /= providerCount;
  
  return results;
}

// Response Canonicalization
function canonicalizeResponse(response, template) {
  // Extract structured data based on template expectations
  const extractedData = template.extractors.reduce((data, extractor) => {
    data[extractor.name] = extractor.extract(response);
    return data;
  }, {});
  
  // Normalize data formats
  return normalizeData(extractedData, template.schema);
}
```

### Database Schema

**Core Tables:**
- `users`
- `brands`
- `topics`
- `keyword_queries`
- `query_responses`
- `query_ranking_history`
- `sources`
- `source_mentions`
- `source_influence_scores`
- `narratives`
- `narrative_comparisons`
- `optimization_recommendations`
- `business_metrics`
- `dark_search_correlations`
- `prompt_templates`
- `prompt_performance_metrics`

**Sample Schema (PostgreSQL):**
```sql
-- Key query tracking tables
CREATE TABLE keyword_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id),
  query_text TEXT NOT NULL,
  query_type TEXT NOT NULL, -- 'direct', 'question', 'negation', etc.
  search_volume INTEGER, -- Estimated monthly searches
  ai_appearance_rate FLOAT, -- Frequency of appearance in AI responses
  competitors_mentioned INTEGER, -- Number of competitors mentioned
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE query_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id UUID REFERENCES keyword_queries(id),
  llm_type TEXT NOT NULL, -- 'openai', 'anthropic', 'google', etc.
  llm_version TEXT NOT NULL, -- 'gpt-4', 'claude-3', etc.
  prompt_template_id UUID REFERENCES prompt_templates(id),
  raw_response TEXT NOT NULL,
  brand_mentioned BOOLEAN,
  brand_position INTEGER, -- Position in the response (1 = first mentioned)
  sentiment_score FLOAT, -- -1 to 1 scale
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompt management tables
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  template_text TEXT NOT NULL,
  purpose TEXT NOT NULL, -- 'source_discovery', 'narrative_analysis', etc.
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE prompt_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_template_id UUID REFERENCES prompt_templates(id),
  llm_type TEXT NOT NULL,
  llm_version TEXT NOT NULL,
  success_rate FLOAT,
  structure_consistency FLOAT,
  response_completeness FLOAT,
  test_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Backend Architecture

**Technology Stack:**
- **Database:** PostgreSQL (via Supabase)
- **API Layer:** Edge Functions (serverless)
- **Authentication:** Supabase Auth
- **Queue System:** Bull MQ or similar for managing API request queues
- **Caching Layer:** Redis for caching responses and reducing API costs

**Key Backend Services:**
1. **Query Service:** Handles LLM API interactions and response processing
2. **Analysis Service:** Processes raw responses into structured data
3. **Optimization Service:** Generates recommendations based on analysis
4. **Scheduling Service:** Manages periodic checks and updates
5. **Prompt Management Service:** Handles template versioning and testing

### Frontend Architecture

**Technology Stack:**
- **Framework:** Next.js
- **UI Library:** Tailwind CSS
- **Data Visualization:** Recharts
- **State Management:** React Context + SWR for data fetching

**Key UI Components:**
1. **Dashboard Layout:** Main navigation and layout structure
2. **Keyword Discovery Interface:** Tools for finding and tracking queries
3. **Performance Tracking Dashboard:** Visualizations of performance metrics
4. **Optimization Center:** Interface for recommendations and content templates
5. **Analytics Dashboard:** Business impact visualizations

## Development Roadmap

### Phase 0: Validation Prototype (4 weeks)
- Build minimal analysis system focusing on a single use case
- Implement manual analysis for 5-10 sample companies
- Create basic dashboard with key metrics
- Conduct user interviews to validate concept
- Set up analytics to measure user engagement
- Test pricing sensitivity and feature prioritization
- **Success criteria:** 5+ companies express willingness to pay for full product

### Phase 1: Foundation (8 weeks)
- Set up project infrastructure (repo, CI/CD, deployment)
- Implement database schema and basic backend services
- Build prompt template management system
- Create MVP of Keyword Query Tracking interface (simplest module)
- Implement basic LLM querying functionality with single provider
- Build cost monitoring and budgeting system
- Develop caching infrastructure to minimize API costs
- Set up authentication and basic user management
- **Success criteria:** Functioning query tracking for a single LLM with cost controls

### Phase 2: Core Analysis (12 weeks)
- Start with simplest metrics (brand mentions, position in responses)
- Expand to Source Influence Tracker with basic functionality
- Implement response analysis algorithms incrementally
- Create simple visualization dashboard with basic charts
- Build API cost calculator and usage reporting
- Implement webhook system for longer processing tasks
- Add progressive loading UI and background processing
- **Success criteria:** End-to-end analysis pipeline with clear visualizations

### Phase 3: Advanced Features (10 weeks)
- Implement full AI Narrative Analyzer
- Add additional LLM providers
- Build basic recommendation engine (rule-based first, not agent-based)
- Create content template generation system
- Develop business impact correlation tools
- Enhance dashboard with advanced visualizations
- **Success criteria:** Comprehensive analysis across multiple LLMs with actionable recommendations

### Phase 4: Optimization & Scale (Ongoing)
- Implement full agent-based recommendation system
- Optimize performance and reduce costs
- Enhance accuracy of analysis algorithms
- Add support for additional LLMs
- Build enterprise features (team collaboration, SSO)
- Implement advanced analytics and reporting
- **Success criteria:** Platform capable of handling enterprise-level analysis needs

## Testing Strategy

### Unit Testing
- Test individual components and services
- Test data processing algorithms
- Test prompt template management functions

### Integration Testing
- Test interactions between services
- Test database operations and migrations
- Test API endpoints and responses

### LLM Interaction Testing
- Test prompt effectiveness
- Test response parsing accuracy
- Test canonicalization consistency

### User Acceptance Testing
- Test dashboard usability
- Test recommendation clarity
- Test overall user flow

## Technical Challenges & Mitigations

### Challenge: API Rate Limits and Costs
**Details:**
- LLM API calls cost approximately $1-3 per full analysis depending on topics and LLMs
- Most LLM APIs have strict rate limits (e.g., OpenAI limits to 10K tokens/minute on paid plans)
- Running analyses at scale could quickly become cost-prohibitive

**Mitigation:**
- Implement intelligent queuing system with prioritization
- Cache similar responses with time-based invalidation
- Use tiered approach: test on cheaper models, confirm with premium models
- Implement usage quotas based on subscription levels
- Build cost calculators to predict API usage before running analyses
- Create batch processing for off-peak scheduling
- Implement response compression to reduce token usage

### Challenge: Model Drift & Response Reliability
**Details:**
- LLMs are updated regularly, affecting response patterns
- Identical prompts can produce varying responses between calls
- API outages or errors occur periodically

**Mitigation:**
- Version all prompts and responses with LLM model identifiers
- Implement automatic detection of response pattern changes
- Maintain prompt testing suite to detect when performance degrades
- Design flexible extractors that can adapt to different response formats
- Run multiple samples for statistical confidence on important metrics
- Implement exponential backoff for API failures
- Create fallback pathways when primary LLMs are unavailable

### Challenge: Response Processing & Data Consistency
**Details:**
- Extracting consistent structured data from narrative responses is difficult
- LLMs may format responses differently between calls
- Different LLMs have varying capabilities for structured output

**Mitigation:**
- Implement robust canonicalization layer with multiple extraction strategies
- Use structured output formats where possible (JSON mode)
- Include redundancy in prompts to ensure key data is captured
- Create validation rules for extracted data
- Implement confidence scoring for each extracted data point
- Use NLP techniques as fallbacks for unstructured responses
- Build correction mechanisms for common extraction errors

### Challenge: Performance & Serverless Limitations
**Details:**
- Supabase Edge Functions have ~50 second execution limits
- Complex analyses exceed serverless function timeouts
- Users expect quick results despite processing complexity

**Mitigation:**
- Break analyses into smaller function calls
- Implement task queues with webhooks for long-running processes
- Use background processing with notification system for completed tasks
- Build progressive loading interfaces showing partial results
- Optimize database queries with proper indexing
- Implement multi-region deployment for faster global response
- Consider AWS Lambda or Google Cloud Functions for longer timeouts

## Business Model & Validation Strategy

### MVP Validation Focus
- **Core Hypothesis:** Businesses will pay for insights about their presence in AI responses
- **Validation Metrics:**
  - User engagement with analysis reports (time spent, return frequency)
  - Implementation rate of optimization recommendations
  - User-reported business impact of optimizations
  - Conversion from free to paid tiers
- **Early Adopter Program:**
  - Recruit 10-15 businesses for initial beta testing
  - Offer reduced pricing in exchange for detailed feedback
  - Conduct bi-weekly user interviews to refine features
  - Prioritize development based on early adopter input

### Subscription Tiers

**Free Tier:**
- 5 keyword queries
- Basic analysis features (no competitive comparison)
- Single brand
- Public data only
- Weekly analysis frequency
- Access to 1 LLM (most cost-effective)

**Professional Tier: $99-199/month**
- Up to 50 keyword queries
- Full analysis features
- Up to 3 brands
- Competitive analysis (up to 3 competitors)
- Content recommendations
- Daily analysis frequency
- Access to 2 major LLMs
- API costs included up to monthly quota

**Enterprise Tier: $499+/month**
- Unlimited keyword queries
- Advanced analysis features
- Unlimited brands
- Custom prompt templates
- API access
- Team collaboration features
- Custom integrations
- Real-time monitoring capabilities
- All available LLMs
- Priority processing queue

### Pricing Strategy
- **Cost-Plus Model:** Base subscription on API costs plus margin
- **Value Metric Scaling:** Scale pricing based on number of topics, brands, and competitors
- **Usage Tiers:** Additional charges for exceeding monthly API quotas
- **Analysis Frequency:** Price differentials for daily vs. weekly vs. monthly analysis
- **Add-On Packs:** 
  - Vertical-specific analysis packs (e.g., Healthcare, Finance)
  - Advanced visualization exports
  - Custom recommendation engine

### Build vs. Buy Decisions
- **Build:** Core analysis engines, user interface, custom prompt system
- **Buy/Integrate:** Sentiment analysis APIs, NLP libraries, data visualization components
- **Partner:** Consider API partnerships with LLM providers for preferred pricing

## Legal & Compliance Considerations

### API Usage Policies
- Review terms of service for each LLM API (OpenAI, Anthropic, Google)
- Verify compliance with usage policies (many prohibit systematic evaluation)
- Implement rate limiting to ensure compliance with provider requirements
- Create fallback mechanisms for when specific providers change policies
- Document all prompt templates and usage patterns for compliance review

### Data Privacy & Security
- Implement proper data encryption at rest and in transit
- Create data retention policies (default 90 days for raw responses)
- Develop anonymization features for sensitive industries
- Ensure compliance with GDPR, CCPA, and other regional requirements
- Build opt-out mechanisms for specific brands or competitors
- Create data export and deletion capabilities for user data

### Terms of Service Development
- Develop platform terms of service with legal counsel
- Create clear usage policies for the platform
- Implement fair use limitations to prevent abuse
- Design acceptable use policies for content generation features
- Create transparency around data usage and analysis methods

## Next Steps

1. **Build Validation Prototype:**
   - Develop manual analysis process for quick feedback
   - Create mockups of key interfaces
   - Recruit potential early adopters
   - Validate core value proposition

2. **Develop MVP of Keyword Query Tracking:**
   - Implement basic search functionality (focus on a single metric first)
   - Create initial database schema
   - Build prompt templates for query discovery
   - Implement simple tracking dashboard with loading states
   - Add cost monitoring and estimates

3. **Set up Prompt Engineering System:**
   - Create template repository with versioning
   - Implement basic A/B testing capabilities
   - Build testing framework with result comparison
   - Develop initial canonicalization layer for one LLM

4. **Create Initial Backend Services:**
   - Set up Supabase database with core tables
   - Implement authentication and user management
   - Create API endpoints for query tracking
   - Build queue management system with webhooks
   - Implement caching layer for cost optimization

5. **Develop Basic UI:**
   - Implement dashboard layout with clear navigation
   - Create keyword discovery interface with search capabilities
   - Build simple tracking visualizations (focus on clarity over complexity)
   - Implement settings for API usage monitoring
   - Add progressive loading indicators and partial results display

## Updated Development Direction

### Refined Focus & Priorities

Based on initial development progress and market feedback, we're refining our approach to ensure we deliver a production-ready platform that businesses can confidently rely on for AEO insights.

#### Immediate Development Priorities (Next 4-6 Weeks)

1. **Transition from Simulated to Real Data Analysis:**
   - Replace all mock/simulated responses with actual LLM API integrations
   - Implement real-time data processing for all core modules
   - Develop robust error handling and recovery mechanisms
   - Add comprehensive logging for debugging and monitoring

2. **Core Infrastructure Improvements:**
   - Implement intelligent caching layer to reduce API costs and improve response speed
   - Add rate limiting to prevent API quota exhaustion
   - Create fallback strategies when primary LLM providers are unavailable
   - Set up comprehensive testing suite (unit, integration, and end-to-end)

3. **Edge Function Enhancements:**
   - Keyword Tracking: Integrate real keyword variation generation and gap analysis
   - Source Influence: Implement specialized source extraction prompts and analysis
   - Narrative Analysis: Develop accurate sentiment analysis and positioning metrics
   - Add result validation to ensure LLM outputs match expected formats

4. **User Experience Refinements:**
   - Add progressive loading states for all API operations
   - Implement intuitive error handling and recovery in the UI
   - Create better data visualization components for insights
   - Develop simplified onboarding flow for new users

#### Medium-Term Goals (7-12 Weeks)

1. **Advanced Analytics Implementation:**
   - Develop time-series analysis of brand performance
   - Implement competitor comparison dashboards
   - Create automated insight generation
   - Build recommendation engine based on real data patterns

2. **Enterprise-Ready Features:**
   - Multi-user team collaboration tools
   - Role-based access control
   - Data export capabilities (CSV, PDF reports)
   - Integration with popular marketing platforms
   - Custom webhook notifications for significant changes

3. **Scalability Improvements:**
   - Optimize database queries for larger datasets
   - Implement background processing for resource-intensive operations
   - Set up horizontal scaling for higher load scenarios
   - Create performance monitoring and alerting system

### Revised Success Metrics

**MVP Launch Criteria:**
- All modules using real LLM analysis (no simulated data)
- 99.5% API call success rate in production
- Average response time under 3 seconds for standard operations
- Comprehensive test coverage with 90%+ success rate
- 5+ active pilot customers using the platform daily
- Customer-reported accuracy rating of 4/5 or higher

**Production Release Criteria:**
- Full feature set implemented across all core modules
- Enterprise security features implemented (SSO, audit logs)
- Documented ROI case studies from 3+ customers
- Scalability tested to 100+ concurrent users
- Complete documentation and training materials
- Established customer support workflow

This refined approach prioritizes reliability, real-world accuracy, and production readiness to ensure that the Marduk AEO platform delivers consistent, actionable insights that businesses can confidently rely on for their AI optimization strategies.
