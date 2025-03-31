-- Create extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create brands table
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    website TEXT,
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create competitors table
CREATE TABLE IF NOT EXISTS public.competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    website TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create topics table
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    relevance_score REAL DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create prompt_templates table
CREATE TABLE IF NOT EXISTS public.prompt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    template_text TEXT NOT NULL,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create keyword_queries table
CREATE TABLE IF NOT EXISTS public.keyword_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    competitor_id UUID REFERENCES public.competitors(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    query_text TEXT NOT NULL,
    llm_type TEXT,
    llm_version TEXT,
    llm_response TEXT,
    brand_mentioned BOOLEAN,
    sentiment_score REAL,
    ranking_position INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ranking_history table
CREATE TABLE IF NOT EXISTS public.ranking_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    query_id UUID REFERENCES public.keyword_queries(id) ON DELETE CASCADE,
    position INTEGER,
    sentiment_score REAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sources table
CREATE TABLE IF NOT EXISTS public.sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT,
    source_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create source_mentions table
CREATE TABLE IF NOT EXISTS public.source_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    llm_type TEXT,
    llm_version TEXT,
    query_text TEXT,
    mention_count INTEGER DEFAULT 1,
    position_score REAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create source_influence_scores table
CREATE TABLE IF NOT EXISTS public.source_influence_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    influence_score REAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create narrative_trends table
CREATE TABLE IF NOT EXISTS public.narrative_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    trend_name TEXT NOT NULL,
    sentiment_score REAL,
    trending_direction TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create narrative_insights table
CREATE TABLE IF NOT EXISTS public.narrative_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    insight_text TEXT NOT NULL,
    priority TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_influence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_insights ENABLE ROW LEVEL SECURITY;

-- Create policies (basic example - would be more sophisticated in real app)
CREATE POLICY "Allow all for authenticated users" 
ON public.brands FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" 
ON public.competitors FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" 
ON public.topics FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" 
ON public.prompt_templates FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" 
ON public.keyword_queries FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" 
ON public.ranking_history FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" 
ON public.sources FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" 
ON public.source_mentions FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" 
ON public.source_influence_scores FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" 
ON public.narrative_trends FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" 
ON public.narrative_insights FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Insert seed data

-- Brands
INSERT INTO public.brands (name, website, description)
VALUES 
('Acme Inc', 'https://acme.example.com', 'Leading provider of innovative solutions'),
('TechCorp', 'https://techcorp.example.com', 'Technology leader in enterprise solutions');

-- Competitors
INSERT INTO public.competitors (brand_id, name, website)
VALUES 
((SELECT id FROM public.brands WHERE name = 'Acme Inc'), 'CompeteCo', 'https://competeco.example.com'),
((SELECT id FROM public.brands WHERE name = 'Acme Inc'), 'RivalTech', 'https://rivaltech.example.com');

-- Topics
INSERT INTO public.topics (brand_id, name, description, relevance_score)
VALUES 
((SELECT id FROM public.brands WHERE name = 'Acme Inc'), 'Cloud Solutions', 'Cloud computing and infrastructure solutions', 0.9),
((SELECT id FROM public.brands WHERE name = 'Acme Inc'), 'AI Services', 'Artificial intelligence and machine learning services', 0.8),
((SELECT id FROM public.brands WHERE name = 'TechCorp'), 'Enterprise Software', 'Business software solutions', 0.85);

-- Prompt Templates
INSERT INTO public.prompt_templates (name, description, template_text, variables)
VALUES 
('Brand Mention Analysis', 'Template for analyzing brand mentions', 
'Analyze the following text and tell me if {{brand_name}} is mentioned: {{text}}', 
'{"brand_name": "string", "text": "string"}'),
('Competitor Comparison', 'Template for comparing brands', 
'Compare {{brand_name}} with {{competitor_name}} based on {{aspect}}', 
'{"brand_name": "string", "competitor_name": "string", "aspect": "string"}');
