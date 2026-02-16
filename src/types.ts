export interface Website {
  id: string;
  url: string;
  name: string;
  created_at: string;
  last_crawled_at?: string;
  crawl_frequency?: string;
  status?: string;
}

export interface CrawlSession {
  id: string;
  website_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  pages_crawled: number;
  errors_found: number;
}

export interface Page {
  id: string;
  website_id: string;
  url: string;
  title?: string;
  meta_description?: string;
  h1?: string;
  status_code?: number;
  crawled_at: string;
}

export interface SEOIssue {
  id: string;
  page_id: string;
  issue_type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  detected_at: string;
}
