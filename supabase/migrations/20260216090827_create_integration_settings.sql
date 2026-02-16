/*
  # Create Integration Settings Table

  1. New Tables
    - `integration_settings`
      - `id` (uuid, primary key) - Unique identifier
      - `provider` (text) - Provider name (gsc, moz, openai)
      - `is_enabled` (boolean) - Whether integration is enabled
      - `config_json` (jsonb) - Encrypted configuration data (API keys, etc)
      - `created_at` (timestamptz) - When the setting was created
      - `updated_at` (timestamptz) - When the setting was last updated
      - `last_test_at` (timestamptz) - When the connection was last tested
      - `last_test_status` (text) - Result of last test (success, error)
      - `last_test_message` (text) - Message from last test

  2. Security
    - Enable RLS on `integration_settings` table
    - Policy allows all operations (admin-only, no auth yet)
    
  3. Constraints
    - Unique constraint on provider (only one row per provider)
    - Check constraint for valid provider names
*/

-- Create integration_settings table
CREATE TABLE IF NOT EXISTS integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  is_enabled boolean DEFAULT false,
  config_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_test_at timestamptz,
  last_test_status text,
  last_test_message text,
  CONSTRAINT unique_provider UNIQUE (provider),
  CONSTRAINT valid_provider CHECK (provider IN ('gsc', 'moz', 'openai'))
);

-- Enable RLS (admin-only, no auth yet - allow all for now)
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations (since there's no auth system yet)
CREATE POLICY "Allow all access to integration_settings"
  ON integration_settings
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create index on provider for fast lookups
CREATE INDEX IF NOT EXISTS idx_integration_settings_provider 
  ON integration_settings(provider);

-- Insert default rows for each provider
INSERT INTO integration_settings (provider, is_enabled, config_json)
VALUES 
  ('gsc', false, '{}'::jsonb),
  ('moz', false, '{}'::jsonb),
  ('openai', false, '{}'::jsonb)
ON CONFLICT (provider) DO NOTHING;