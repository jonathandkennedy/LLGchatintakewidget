-- IntakeLLG Seed Data
-- Run this after 001_init.sql to populate a demo client for testing

-- Demo client
INSERT INTO clients (id, name, slug, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Demo Law Firm', 'demo-law-firm', 'active');

-- Branding
INSERT INTO client_branding (client_id, primary_color, accent_color, widget_title, welcome_headline, welcome_body, privacy_url, terms_url) VALUES
  ('00000000-0000-0000-0000-000000000001', '#2563eb', '#7dd3fc', 'Free Case Review', 'Injured in an accident?', 'Answer a few quick questions so we can connect you with our team as fast as possible.', '#', '#');

-- Fallback settings
INSERT INTO fallback_settings (client_id, voicemail_enabled, whisper_enabled, record_calls, sms_fallback_enabled, sms_fallback_message, callback_message) VALUES
  ('00000000-0000-0000-0000-000000000001', true, true, true, true, 'We received your request and will call you back as soon as possible.', 'New website intake lead from Demo Law Firm');

-- Phone number (placeholder — replace with your real Telnyx number)
INSERT INTO client_phone_numbers (client_id, phone_number_e164, provider, voice_enabled, sms_enabled, is_primary) VALUES
  ('00000000-0000-0000-0000-000000000001', '+15550001234', 'telnyx', true, true, true);

-- Routing rule: weekdays 9am-5pm Pacific
INSERT INTO routing_rules (client_id, name, timezone, days_of_week, start_time_local, end_time_local, destination_number_e164, priority) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Weekday business hours', 'America/Los_Angeles', '{1,2,3,4,5}', '09:00:00', '17:00:00', '+15559876543', 100);

-- Default intake flow
INSERT INTO widget_flows (id, client_id, name, status, version, is_default) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Default Injury Intake', 'published', 1, true);

-- Flow steps
INSERT INTO widget_steps (id, flow_id, step_key, step_type, title, description, field_key, is_required, sort_order, config_json) VALUES
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000010', 'welcome', 'welcome', 'Injured in an accident?', 'Answer a few quick questions so we can connect you with our team.', NULL, false, 0, '{"next": "matter_type"}'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000010', 'matter_type', 'single_select', 'What kind of matter can we help with?', NULL, 'matter_type', true, 1, '{"next": "incident_summary"}'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000010', 'incident_summary', 'long_text', 'Could you briefly explain what happened?', NULL, 'incident_summary', true, 2, '{"next": "injury_status", "placeholder": "Example: I was rear-ended at a stop light and my neck has been hurting since."}'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000010', 'injury_status', 'single_select', 'Did you suffer any injuries or are you experiencing pain?', NULL, 'injury_status', true, 3, '{}'),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000010', 'injury_areas', 'multi_select', 'What injuries or pain are you experiencing?', NULL, 'injury_areas', true, 4, '{"next": "medical_treatment_status"}'),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000010', 'medical_treatment_status', 'single_select', 'Did you receive medical treatment for your injuries?', NULL, 'medical_treatment_status', true, 5, '{"next": "incident_state"}'),
  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000010', 'incident_state', 'dropdown', 'In what state did the accident happen?', NULL, 'incident_state', true, 6, '{"next": "incident_city"}'),
  ('00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000010', 'incident_city', 'short_text', 'And what city did it happen in?', NULL, 'incident_city', true, 7, '{"next": "incident_date_range"}'),
  ('00000000-0000-0000-0000-000000000108', '00000000-0000-0000-0000-000000000010', 'incident_date_range', 'single_select', 'When did the accident occur?', NULL, 'incident_date_range', true, 8, '{"next": "full_name"}'),
  ('00000000-0000-0000-0000-000000000109', '00000000-0000-0000-0000-000000000010', 'full_name', 'name', 'What''s your full name?', NULL, NULL, true, 9, '{"next": "phone"}'),
  ('00000000-0000-0000-0000-000000000110', '00000000-0000-0000-0000-000000000010', 'phone', 'phone', 'Best phone number to reach you?', NULL, 'phone', true, 10, '{"next": "email"}'),
  ('00000000-0000-0000-0000-000000000111', '00000000-0000-0000-0000-000000000010', 'email', 'email', 'What''s your email address?', NULL, 'email', false, 11, '{"next": "additional_notes"}'),
  ('00000000-0000-0000-0000-000000000112', '00000000-0000-0000-0000-000000000010', 'additional_notes', 'textarea_optional', 'Is there anything else you''d like us to know?', NULL, 'additional_notes', false, 12, '{"next": "transfer_ready"}'),
  ('00000000-0000-0000-0000-000000000113', '00000000-0000-0000-0000-000000000010', 'transfer_ready', 'transfer_ready', 'Great — let''s connect you with our team now.', 'Tap below and we''ll connect your call. If we can''t reach the office, we''ll save your info and follow up.', NULL, false, 13, '{"next": "connecting"}');

-- Step options for matter_type
INSERT INTO widget_step_options (step_id, option_key, label, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000101', 'car_accident', 'Car accident', 0),
  ('00000000-0000-0000-0000-000000000101', 'truck_accident', 'Truck accident', 1),
  ('00000000-0000-0000-0000-000000000101', 'motorcycle_accident', 'Motorcycle accident', 2),
  ('00000000-0000-0000-0000-000000000101', 'slip_fall', 'Slip and fall', 3),
  ('00000000-0000-0000-0000-000000000101', 'wrongful_death', 'Wrongful death', 4),
  ('00000000-0000-0000-0000-000000000101', 'other_injury', 'Other injury', 5);

-- Step options for injury_status
INSERT INTO widget_step_options (step_id, option_key, label, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000103', 'yes_injured', 'Yes, I''m injured', 0),
  ('00000000-0000-0000-0000-000000000103', 'someone_else_injured', 'Someone else was injured', 1),
  ('00000000-0000-0000-0000-000000000103', 'no_injuries', 'No injuries', 2),
  ('00000000-0000-0000-0000-000000000103', 'not_sure', 'Not sure yet', 3);

-- Step options for injury_areas
INSERT INTO widget_step_options (step_id, option_key, label, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000104', 'back_neck', 'Back / neck', 0),
  ('00000000-0000-0000-0000-000000000104', 'head', 'Head', 1),
  ('00000000-0000-0000-0000-000000000104', 'shoulder_arm', 'Shoulder / arm', 2),
  ('00000000-0000-0000-0000-000000000104', 'hip_leg', 'Hip / leg', 3),
  ('00000000-0000-0000-0000-000000000104', 'cuts_bruising', 'Cuts / bruising', 4),
  ('00000000-0000-0000-0000-000000000104', 'emotional_distress', 'Emotional distress', 5),
  ('00000000-0000-0000-0000-000000000104', 'other', 'Other', 6);

-- Step options for medical_treatment_status
INSERT INTO widget_step_options (step_id, option_key, label, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000105', 'yes', 'Yes', 0),
  ('00000000-0000-0000-0000-000000000105', 'no', 'No', 1),
  ('00000000-0000-0000-0000-000000000105', 'scheduled', 'Appointment scheduled', 2),
  ('00000000-0000-0000-0000-000000000105', 'not_yet', 'Not yet', 3);

-- Step options for incident_date_range
INSERT INTO widget_step_options (step_id, option_key, label, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000108', 'today', 'Today', 0),
  ('00000000-0000-0000-0000-000000000108', 'last_7_days', 'Within the last week', 1),
  ('00000000-0000-0000-0000-000000000108', 'last_30_days', 'Within the last month', 2),
  ('00000000-0000-0000-0000-000000000108', 'last_12_months', 'Within the last year', 3),
  ('00000000-0000-0000-0000-000000000108', 'over_1_year', 'More than a year ago', 4);

-- Branch rules for injury_status
INSERT INTO widget_branches (flow_id, from_step_key, to_step_key, priority, condition_json) VALUES
  ('00000000-0000-0000-0000-000000000010', 'injury_status', 'injury_areas', 1, '{"fieldKey": "injury_status", "operator": "in", "value": ["yes_injured", "someone_else_injured"]}'),
  ('00000000-0000-0000-0000-000000000010', 'injury_status', 'incident_state', 2, '{"fieldKey": "injury_status", "operator": "in", "value": ["no_injuries", "not_sure"]}');
