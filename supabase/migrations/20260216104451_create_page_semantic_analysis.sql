/*
  # Create page_semantic_analysis table

  1. New Tables
    - `page_semantic_analysis`
      - `id` (uuid, primary key) - Unique identifier for the semantic analysis record
      - `page_id` (uuid, foreign key) - References the pages table
      - `intent_type` (text) - Classification of user intent (informational, commercial, navigational)
      - `entities_json` (jsonb) - Top 10 extracted entities as JSON array
      - `content_depth_score` (numeric) - Estimated content depth score (0-100)
      - `topical_relevance_score` (numeric) - Topical relevance score (0-100)
      - `eeat_score_estimate` (numeric) - Basic E-E-A-T estimate (0-100)
      - `created_at` (timestamptz) - Timestamp when the record was created

  2. Security
    - Enable RLS on `page_semantic_analysis` table
    - Add policies for authenticated users to read semantic analysis data
    - Add policies for authenticated users to insert semantic analysis data
    - Add policies for authenticated users to delete semantic analysis data

  3. Indexes
    - Index on `page_id` for fast lookups by page
    - Index on `intent_type` for filtering by intent
    - Index on `content_depth_score` for sorting by content quality

  4. Notes
    - All score fields can be NULL to handle API failures gracefully
    - Foreign key constraint ensures data integrity with pages table
    - CASCADE delete ensures cleanup when pages are deleted
    - Only applied to pages classified as "article"
    - One record per page per crawl session
*/

-- Create page_semantic_analysis table
CREATE TABLE IF NOT EXISTS page_semantic_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  intent_type text,
  entities_json jsonb DEFAULT '[]'::jsonb,
  content_depth_score numeric,
  topical_relevance_score numeric,
  eeat_score_estimate numeric,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_semantic_analysis_page_id 
  ON page_semantic_analysis(page_id);

CREATE INDEX IF NOT EXISTS idx_page_semantic_analysis_intent_type 
  ON page_semantic_analysis(intent_type);

CREATE INDEX IF NOT EXISTS idx_page_semantic_analysis_content_depth 
  ON page_semantic_analysis(content_depth_score DESC);

CREATE INDEX IF NOT EXISTS idx_page_semantic_analysis_eeat 
  ON page_semantic_analysis(eeat_score_estimate DESC);

-- Enable RLS
ALTER TABLE page_semantic_analysis ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all semantic analysis data
CREATE POLICY "Authenticated users can read semantic analysis"
  ON page_semantic_analysis
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert semantic analysis data
CREATE POLICY "Authenticated users can insert semantic analysis"
  ON page_semantic_analysis
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can delete semantic analysis data
CREATE POLICY "Authenticated users can delete semantic analysis"
  ON page_semantic_analysis
  FOR DELETE
  TO authenticated
  USING (true);