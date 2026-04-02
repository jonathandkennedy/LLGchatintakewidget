-- 002_features.sql
-- Migration for all features added after initial scaffold.
-- Run this after 001_init.sql.

-- ============================================================
-- Lead scoring and AI fields
-- ============================================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score int;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score_tier text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_duplicate boolean DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS duplicate_of uuid REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS duplicate_match_type text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to_name text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_severity text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_urgency text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_key_facts jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_liability_indicators jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sentiment_urgency int;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sentiment_tone text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sentiment_signals jsonb;

-- ============================================================
-- Client branding extensions
-- ============================================================
ALTER TABLE client_branding ADD COLUMN IF NOT EXISTS connecting_video_url text;
ALTER TABLE client_branding ADD COLUMN IF NOT EXISTS video_rules jsonb;
ALTER TABLE client_branding ADD COLUMN IF NOT EXISTS unique(client_id);

-- ============================================================
-- Widget step options: Spanish label
-- ============================================================
ALTER TABLE widget_step_options ADD COLUMN IF NOT EXISTS label_es text;
ALTER TABLE widget_step_options ADD COLUMN IF NOT EXISTS flow_id uuid REFERENCES widget_flows(id) ON DELETE CASCADE;

-- ============================================================
-- A/B Testing
-- ============================================================
CREATE TABLE IF NOT EXISTS ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ab_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  name text NOT NULL,
  flow_id uuid REFERENCES widget_flows(id) ON DELETE SET NULL,
  weight int NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ab_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES ab_variants(id) ON DELETE CASCADE,
  session_id uuid NOT NULL UNIQUE REFERENCES lead_sessions(id) ON DELETE CASCADE,
  converted boolean NOT NULL DEFAULT false,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Webhooks
-- ============================================================
CREATE TABLE IF NOT EXISTS client_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text,
  events jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES client_webhooks(id) ON DELETE CASCADE,
  event text NOT NULL,
  status text NOT NULL,
  status_code int,
  error_message text,
  payload_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Assignment Rules
-- ============================================================
CREATE TABLE IF NOT EXISTS assignment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  team_member_id text NOT NULL,
  team_member_name text NOT NULL,
  team_member_email text,
  matter_types jsonb,
  states jsonb,
  min_score int,
  max_active_leads int,
  priority int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Audit Log
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  actor text NOT NULL DEFAULT 'system',
  resource_type text,
  resource_id text,
  details_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Lead Notes
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author text NOT NULL DEFAULT 'Admin',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Lead Tags
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag text NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Email Templates
-- ============================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  subject text NOT NULL,
  body_html text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, template_key)
);

-- ============================================================
-- Follow-up Scheduling
-- ============================================================
CREATE TABLE IF NOT EXISTS followup_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  delay_minutes int NOT NULL,
  channel text NOT NULL DEFAULT 'sms',
  template text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduled_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES followup_rules(id) ON DELETE SET NULL,
  channel text NOT NULL,
  template text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_client_status ON leads(client_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(lead_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_sessions_client ON lead_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_lead_session_answers_session ON lead_session_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_widget_events_client ON widget_events(client_id, event_name);
CREATE INDEX IF NOT EXISTS idx_widget_events_created ON widget_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_variant ON ab_assignments(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_session ON ab_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_lead ON lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_due ON scheduled_followups(scheduled_at, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);

-- ============================================================
-- Error Log
-- ============================================================
CREATE TABLE IF NOT EXISTS error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  message text NOT NULL,
  stack text,
  context_json jsonb,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  session_id uuid REFERENCES lead_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_log_created ON error_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_source ON error_log(source);

-- ============================================================
-- Enable Supabase Realtime on leads table
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
