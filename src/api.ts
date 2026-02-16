// API URL configuration
// In development: empty string works with Vite proxy or same-origin
// In production: should be set via VITE_API_URL environment variable
const API_URL = import.meta.env.VITE_API_URL || '';

export const api = {
  async checkHealth() {
    const response = await fetch(`${API_URL}/health`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  },

  async getWebsites() {
    const response = await fetch(`${API_URL}/api/websites`);
    if (!response.ok) throw new Error('Failed to fetch websites');
    return response.json();
  },

  async getWebsite(id: string) {
    const response = await fetch(`${API_URL}/api/websites/${id}`);
    if (!response.ok) throw new Error('Failed to fetch website');
    return response.json();
  },

  async createWebsite(domain: string, displayName?: string) {
    const response = await fetch(`${API_URL}/api/websites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, display_name: displayName })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create website');
    }
    return response.json();
  },

  async deleteWebsite(id: string) {
    const response = await fetch(`${API_URL}/api/websites/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete website');
    return response.json();
  },

  async startCrawl(websiteId: string, crawlLimit: number = 10) {
    const response = await fetch(`${API_URL}/api/crawl/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ website_id: websiteId, crawl_limit: crawlLimit })
    });
    if (!response.ok) throw new Error('Failed to start crawl');
    return response.json();
  },

  async getCrawlSession(sessionId: string) {
    const response = await fetch(`${API_URL}/api/crawl/session/${sessionId}`);
    if (!response.ok) throw new Error('Failed to fetch crawl session');
    return response.json();
  },

  async getPages(sessionId: string, pageType?: string) {
    const params = new URLSearchParams();
    if (pageType) params.append('page_type', pageType);

    const response = await fetch(`${API_URL}/api/crawl/session/${sessionId}/pages?${params}`);
    if (!response.ok) throw new Error('Failed to fetch pages');
    return response.json();
  },

  async getIssues(sessionId: string, severity?: string, issueType?: string) {
    const params = new URLSearchParams();
    if (severity) params.append('severity', severity);
    if (issueType) params.append('issue_type', issueType);

    const response = await fetch(`${API_URL}/api/crawl/session/${sessionId}/issues?${params}`);
    if (!response.ok) throw new Error('Failed to fetch issues');
    return response.json();
  },

  async exportSession(sessionId: string, format: 'json' | 'csv' = 'json') {
    const response = await fetch(`${API_URL}/api/crawl/session/${sessionId}/export?format=${format}`);
    if (!response.ok) throw new Error('Failed to export session');

    if (format === 'csv') {
      return response.text();
    }
    return response.json();
  },

  async getGscData(websiteId: string) {
    const response = await fetch(`${API_URL}/api/gsc/data/${websiteId}`);
    if (!response.ok) throw new Error('Failed to fetch GSC data');
    return response.json();
  },

  async getMozData(websiteId: string) {
    const response = await fetch(`${API_URL}/api/moz/data/${websiteId}`);
    if (!response.ok) throw new Error('Failed to fetch Moz data');
    return response.json();
  },

  async fetchMozData(websiteId: string) {
    const response = await fetch(`${API_URL}/api/moz/fetch/${websiteId}`, {
      method: 'POST'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch Moz data');
    }
    return response.json();
  },

  async getIntegrations() {
    const response = await fetch(`${API_URL}/api/integrations`);
    if (!response.ok) throw new Error('Failed to fetch integrations');
    return response.json();
  },

  async saveIntegration(provider: string, isEnabled: boolean, config: any) {
    const response = await fetch(`${API_URL}/api/integrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, isEnabled, config })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save integration');
    }
    return response.json();
  },

  async testIntegration(provider: string, config: any) {
    const response = await fetch(`${API_URL}/api/integrations/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, config })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to test integration');
    }
    return response.json();
  }
};
