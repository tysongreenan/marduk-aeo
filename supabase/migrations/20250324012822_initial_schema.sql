-- Enable uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users and organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  monthly_query_limit INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organization_users junction table
CREATE TABLE organization_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE auth.users ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Brand management
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  website TEXT,
  description TEXT,
  industry TEXT,
  business_model TEXT,
  target_audience TEXT,
  unique_value_props JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Topic and competitor tracking
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  name TEXT NOT NULL,
  relevance_score INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  name TEXT NOT NULL,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Keyword query tracking
CREATE TABLE keyword_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  query_text TEXT NOT NULL,
  query_type TEXT NOT NULL,
  search_volume INTEGER,
  ai_appearance_rate FLOAT,
  competitors_mentioned INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE query_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id UUID NOT NULL REFERENCES keyword_queries(id),
  llm_type TEXT NOT NULL,
  llm_version TEXT NOT NULL,
  prompt_template_id UUID,
  raw_response TEXT NOT NULL,
  brand_mentioned BOOLEAN,
  brand_position INTEGER,
  sentiment_score FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE query_ranking_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id UUID NOT NULL REFERENCES keyword_queries(id),
  llm_type TEXT NOT NULL,
  date DATE NOT NULL,
  brand_position INTEGER,
  is_featured BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Source influence tracking
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT,
  source_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE source_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES sources(id),
  topic_id UUID NOT NULL REFERENCES topics(id),
  llm_type TEXT NOT NULL,
  llm_version TEXT NOT NULL,
  query_text TEXT NOT NULL,
  mention_count INTEGER NOT NULL,
  position_score FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE source_influence_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES sources(id),
  topic_id UUID NOT NULL REFERENCES topics(id),
  influence_score FLOAT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompt management system
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  template_text TEXT NOT NULL,
  purpose TEXT NOT NULL,
  variables JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE prompt_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_template_id UUID NOT NULL REFERENCES prompt_templates(id),
  llm_type TEXT NOT NULL,
  llm_version TEXT NOT NULL,
  success_rate FLOAT,
  structure_consistency FLOAT,
  response_completeness FLOAT,
  test_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optimization recommendations
CREATE TABLE optimization_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  topic_id UUID REFERENCES topics(id),
  recommendation_type TEXT NOT NULL,
  priority INTEGER NOT NULL,
  recommendation_text TEXT NOT NULL,
  implementation_template TEXT,
  status TEXT DEFAULT 'pending',
  effectiveness_score FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  implemented_at TIMESTAMP WITH TIME ZONE
);

-- Create RLS policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_ranking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_influence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies for organizations
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (id IN (
    SELECT organization_id FROM auth.users WHERE id = auth.uid()
  ));

-- Create policies for organization_users
CREATE POLICY "Users can view their organization memberships"
  ON organization_users FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Organization admins can view all members"
  ON organization_users FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_users 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Organization admins can insert new members"
  ON organization_users FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_users 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Organization admins can update members"
  ON organization_users FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_users 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Organization admins can delete members"
  ON organization_users FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM organization_users 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Create policies for brands
CREATE POLICY "Users can view their organization's brands"
  ON brands FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert into their organization's brands"
  ON brands FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their organization's brands"
  ON brands FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their organization's brands"
  ON brands FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

-- Create policies for topics
CREATE POLICY "Users can view their brand's topics"
  ON topics FOR SELECT
  USING (brand_id IN (
    SELECT id FROM brands WHERE organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert into their brand's topics"
  ON topics FOR INSERT
  WITH CHECK (brand_id IN (
    SELECT id FROM brands WHERE organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  ));

-- Additional policies would follow a similar pattern for other tables
