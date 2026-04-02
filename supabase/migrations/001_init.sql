create extension if not exists pgcrypto;

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_branding (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  logo_url text,
  avatar_url text,
  welcome_video_url text,
  primary_color text not null,
  accent_color text,
  widget_title text not null,
  welcome_headline text not null,
  welcome_body text not null,
  privacy_url text,
  terms_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_phone_numbers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  phone_number_e164 text not null unique,
  provider text not null default 'telnyx',
  provider_number_id text,
  voice_enabled boolean not null default true,
  sms_enabled boolean not null default true,
  is_primary boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists routing_rules (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  timezone text not null,
  days_of_week int[] not null,
  start_time_local time not null,
  end_time_local time not null,
  destination_number_e164 text not null,
  priority int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists fallback_settings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references clients(id) on delete cascade,
  voicemail_enabled boolean not null default true,
  whisper_enabled boolean not null default true,
  record_calls boolean not null default true,
  sms_fallback_enabled boolean not null default true,
  sms_fallback_message text,
  callback_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists widget_flows (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  status text not null default 'published',
  version int not null default 1,
  is_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists widget_steps (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references widget_flows(id) on delete cascade,
  step_key text not null,
  step_type text not null,
  title text not null,
  description text,
  field_key text,
  is_required boolean not null default false,
  sort_order int not null,
  config_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(flow_id, step_key)
);

create table if not exists widget_step_options (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references widget_steps(id) on delete cascade,
  option_key text not null,
  label text not null,
  sort_order int not null,
  created_at timestamptz not null default now()
);

create table if not exists widget_branches (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references widget_flows(id) on delete cascade,
  from_step_key text not null,
  condition_json jsonb not null,
  to_step_key text not null,
  priority int not null default 100
);

create table if not exists lead_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  flow_id uuid references widget_flows(id) on delete set null,
  status text not null,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  landing_page_url text,
  referrer_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  user_agent text,
  ip_address inet,
  device_type text
);

create table if not exists lead_session_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references lead_sessions(id) on delete cascade,
  step_key text not null,
  field_key text not null,
  value_text text,
  value_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, field_key)
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  session_id uuid not null unique references lead_sessions(id) on delete cascade,
  status text not null,
  matter_type text,
  incident_summary text,
  injury_status text,
  injury_areas jsonb,
  medical_treatment_status text,
  incident_state text,
  incident_city text,
  incident_date_range text,
  first_name text,
  last_name text,
  phone_e164 text,
  email text,
  additional_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists call_attempts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  source_number_e164 text not null,
  destination_number_e164 text not null,
  provider text not null default 'telnyx',
  provider_call_control_id text,
  provider_call_leg_id text,
  status text not null,
  failure_reason text,
  started_at timestamptz not null default now(),
  connected_at timestamptz,
  ended_at timestamptz,
  duration_seconds int
);

create table if not exists sms_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  client_id uuid not null references clients(id) on delete cascade,
  direction text not null,
  from_number_e164 text not null,
  to_number_e164 text not null,
  message_body text not null,
  provider_message_id text,
  status text not null,
  webhook_payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists widget_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  session_id uuid references lead_sessions(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  event_name text not null,
  event_properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists provider_webhook_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'telnyx',
  event_type text not null,
  signature_valid boolean,
  headers_json jsonb not null,
  payload_json jsonb not null,
  processed boolean not null default false,
  error_message text,
  created_at timestamptz not null default now()
);
