-- Create organization_users junction table
CREATE TABLE IF NOT EXISTS public.organization_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS on the organization_users table
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;

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

-- First drop existing policies for brands if they exist
DROP POLICY IF EXISTS "Users can view their organization's brands" ON brands;
DROP POLICY IF EXISTS "Users can insert into their organization's brands" ON brands;
DROP POLICY IF EXISTS "Users can update their organization's brands" ON brands;
DROP POLICY IF EXISTS "Users can delete their organization's brands" ON brands;

-- Create new policies for brands using the organization_users table
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
