/*
  # Create change_events table

  1. New Tables
    - `change_events`
      - `id` (uuid, primary key) - Unique identifier for the change event
      - `page_id` (uuid, foreign key) - References the pages table
      - `change_type` (text) - Type of change detected (canonical_change, meta_robots_change, title_change, performance_drop, lcp_increase, cls_increase, traffic_anomaly)
      - `previous_value` (text) - Previous value before change
      - `new_value` (text) - New value after change
      - `severity` (text) - Severity level (low, medium, high, critical)
      - `detected_at` (timestamptz) - Timestamp when the change was detected
      - `crawl_session_id` (uuid, foreign key) - References the crawl session that detected the change
      - `change_percentage` (numeric) - Percentage of change for metric-based changes

  2. Security
    - Enable RLS on `change_events` table
    - Add policies for authenticated users to read change events
    - Add policies for authenticated users to insert change events
    - Add policies for authenticated users to delete change events

  3. Indexes
    - Index on `page_id` for fast lookups by page
    - Index on `change_type` for filtering by change type
    - Index on `severity` for filtering by severity
    - Index on `detected_at` for time-based queries
    - Index on `crawl_session_id` for crawl session lookups

  4. Notes
    - All value fields can be NULL to handle different change types
    - Foreign key constraints ensure data integrity
    - CASCADE delete ensures cleanup when pages are deleted
    - Change types cover both content and performance changes
    - Supports threshold-based anomaly detection
*/

-- Create change_events table
CREATE TABLE IF NOT EXISTS change_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  crawl_session_id uuid REFERENCES crawl_sessions(id) ON DELETE CASCADE,
  change_type text NOT NULL,
  previous_value text,
  new_value text,
  severity text NOT NULL DEFAULT 'medium',
  detected_at timestamptz DEFAULT now(),
  change_percentage numeric,
  CONSTRAINT change_events_severity_check CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT change_events_change_type_check CHECK (change_type IN (
    'canonical_change',
    'meta_robots_change',
    'title_change',
    'performance_drop',
    'lcp_increase',
    'cls_increase',
    'inp_increase',
    'traffic_anomaly',
    'http_status_change',
    'content_change'
  ))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_change_events_page_id 
  ON change_events(page_id);

CREATE INDEX IF NOT EXISTS idx_change_events_crawl_session_id 
  ON change_events(crawl_session_id);

CREATE INDEX IF NOT EXISTS idx_change_events_change_type 
  ON change_events(change_type);

CREATE INDEX IF NOT EXISTS idx_change_events_severity 
  ON change_events(severity);

CREATE INDEX IF NOT EXISTS idx_change_events_detected_at 
  ON change_events(detected_at DESC);

-- Enable RLS
ALTER TABLE change_events ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all change events
CREATE POLICY "Authenticated users can read change events"
  ON change_events
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert change events
CREATE POLICY "Authenticated users can insert change events"
  ON change_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can delete change events
CREATE POLICY "Authenticated users can delete change events"
  ON change_events
  FOR DELETE
  TO authenticated
  USING (true);