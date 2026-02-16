import { useState, useEffect } from 'react';
import { ArrowLeft, Globe, Play, Download, Trash2, Clock, AlertCircle, CheckCircle, FileText, Loader, ExternalLink } from 'lucide-react';
import { api } from '../api';

interface CrawlSession {
  id: string;
  status: string;
  crawl_limit: number;
  pages_crawled: number;
  issues_found: number;
  started_at: string;
  completed_at?: string;
}

interface Page {
  id: string;
  url: string;
  title?: string;
  page_type: string;
  status_code: number;
  canonical_url?: string;
  meta_robots?: string;
}

interface Issue {
  id: string;
  page_url: string;
  issue_type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  evidence?: string;
  recommendation?: string;
}

interface Website {
  id: string;
  domain: string;
  display_name: string;
  created_at: string;
}

interface WebsiteDetailProps {
  websiteId: string;
  onBack: () => void;
  onDelete: (id: string) => void;
}

export default function WebsiteDetail({ websiteId, onBack, onDelete }: WebsiteDetailProps) {
  const [website, setWebsite] = useState<Website | null>(null);
  const [sessions, setSessions] = useState<CrawlSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CrawlSession | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [crawlLimit, setCrawlLimit] = useState(10);
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'issues'>('overview');
  const [pageTypeFilter, setPageTypeFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');

  useEffect(() => {
    loadWebsite();
  }, [websiteId]);

  useEffect(() => {
    if (selectedSession) {
      loadSessionData();
    }
  }, [selectedSession, pageTypeFilter, severityFilter]);

  // Poll for crawl status updates
  useEffect(() => {
    if (!selectedSession || selectedSession.status === 'completed' || selectedSession.status === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const session = await api.getCrawlSession(selectedSession.id);
        setSelectedSession(session);
        if (session.status === 'completed' || session.status === 'failed') {
          setCrawling(false);
          loadSessionData();
        }
      } catch (error) {
        console.error('Error polling crawl status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedSession]);

  const loadWebsite = async () => {
    try {
      setLoading(true);
      const data = await api.getWebsite(websiteId);
      setWebsite(data);
      
      // Load crawl sessions
      const sessionsData = await fetchCrawlSessions(websiteId);
      setSessions(sessionsData);
      
      if (sessionsData.length > 0) {
        setSelectedSession(sessionsData[0]);
      }
    } catch (error) {
      console.error('Error loading website:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCrawlSessions = async (websiteId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/websites/${websiteId}/sessions`);
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  };

  const loadSessionData = async () => {
    if (!selectedSession) return;
    
    try {
      const [pagesData, issuesData] = await Promise.all([
        api.getPages(selectedSession.id, pageTypeFilter || undefined),
        api.getIssues(selectedSession.id, severityFilter || undefined)
      ]);
      setPages(pagesData);
      setIssues(issuesData);
    } catch (error) {
      console.error('Error loading session data:', error);
    }
  };

  const handleStartCrawl = async () => {
    try {
      setCrawling(true);
      const session = await api.startCrawl(websiteId, crawlLimit);
      setSelectedSession(session);
      setSessions(prev => [session, ...prev]);
      setActiveTab('overview');
    } catch (error) {
      console.error('Error starting crawl:', error);
      setCrawling(false);
      alert('Failed to start crawl');
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    if (!selectedSession) return;
    
    try {
      const data = await api.exportSession(selectedSession.id, format);
      
      const blob = format === 'csv' 
        ? new Blob([data], { type: 'text/csv' })
        : new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crawl-${selectedSession.id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Failed to export data');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPageTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      article: 'bg-green-100 text-green-800',
      category: 'bg-purple-100 text-purple-800',
      pagination: 'bg-orange-100 text-orange-800',
      search: 'bg-yellow-100 text-yellow-800',
      'search-pagination': 'bg-amber-100 text-amber-800',
      tag: 'bg-indigo-100 text-indigo-800',
      amp: 'bg-pink-100 text-pink-800',
      unknown: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.unknown;
  };

  const formatEvidence = (evidence: string | undefined) => {
    if (!evidence) return null;
    // Fix char-by-char rendering by ensuring it's treated as a proper string
    if (typeof evidence === 'object') {
      evidence = JSON.stringify(evidence);
    }
    return evidence;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!website) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Website not found</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{website.display_name}</h2>
            <div className="flex items-center space-x-2 text-gray-500">
              <Globe className="w-4 h-4" />
              <span>{website.domain}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onDelete(websiteId)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete website"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Crawl Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Pages to crawl:</label>
            <select
              value={crawlLimit}
              onChange={(e) => setCrawlLimit(Number(e.target.value))}
              disabled={crawling}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>5 pages</option>
              <option value={10}>10 pages</option>
              <option value={25}>25 pages</option>
              <option value={50}>50 pages</option>
              <option value={100}>100 pages</option>
            </select>
          </div>
          <div className="flex items-center space-x-3">
            {selectedSession && (
              <>
                <button
                  onClick={() => handleExport('json')}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export JSON</span>
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              </>
            )}
            <button
              onClick={handleStartCrawl}
              disabled={crawling}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {crawling ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Crawling...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start Crawl</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Crawl Progress */}
        {selectedSession && selectedSession.status !== 'completed' && selectedSession.status !== 'failed' && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Loader className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-blue-800">
                Crawling in progress... {selectedSession.pages_crawled || 0} / {selectedSession.crawl_limit} pages
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Session History */}
      {sessions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Crawl History</h3>
          <div className="flex flex-wrap gap-2">
            {sessions.slice(0, 10).map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className={`px-3 py-2 rounded-lg text-sm flex items-center space-x-2 transition-colors ${
                  selectedSession?.id === session.id
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{new Date(session.started_at).toLocaleDateString()}</span>
                {session.status === 'completed' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : session.status === 'failed' ? (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <Loader className="w-4 h-4 animate-spin text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Tabs */}
      {selectedSession && selectedSession.status === 'completed' && (
        <>
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {(['overview', 'pages', 'issues'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'pages' && ` (${pages.length})`}
                  {tab === 'issues' && ` (${issues.length})`}
                </button>
              ))}
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-3xl font-bold text-gray-900">{selectedSession.pages_crawled}</div>
                <div className="text-sm text-gray-500 mt-1">Pages Crawled</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-3xl font-bold text-red-600">
                  {issues.filter(i => i.severity === 'critical').length}
                </div>
                <div className="text-sm text-gray-500 mt-1">Critical Issues</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-3xl font-bold text-yellow-600">
                  {issues.filter(i => i.severity === 'warning').length}
                </div>
                <div className="text-sm text-gray-500 mt-1">Warnings</div>
              </div>
            </div>
          )}

          {/* Pages Tab */}
          {activeTab === 'pages' && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <select
                  value={pageTypeFilter}
                  onChange={(e) => setPageTypeFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">All Page Types</option>
                  <option value="article">Article</option>
                  <option value="category">Category</option>
                  <option value="pagination">Pagination</option>
                  <option value="search">Search</option>
                  <option value="search-pagination">Search Pagination</option>
                  <option value="tag">Tag</option>
                  <option value="amp">AMP</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <div className="divide-y divide-gray-200">
                {pages.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No pages found</div>
                ) : (
                  pages.map((page) => (
                    <div key={page.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPageTypeColor(page.page_type)}`}>
                              {page.page_type}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              page.status_code === 200 ? 'bg-green-100 text-green-800' :
                              page.status_code >= 400 ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {page.status_code}
                            </span>
                          </div>
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {page.title || 'No title'}
                          </h4>
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center space-x-1 mt-1"
                          >
                            <span className="truncate">{page.url}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Issues Tab */}
          {activeTab === 'issues' && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>
              <div className="divide-y divide-gray-200">
                {issues.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p>No issues found!</p>
                  </div>
                ) : (
                  issues.map((issue) => (
                    <div key={issue.id} className={`p-4 border-l-4 ${getSeverityColor(issue.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${getSeverityColor(issue.severity)}`}>
                              {issue.severity}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {issue.issue_type}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">{issue.message}</p>
                          {issue.page_url && (
                            <a
                              href={issue.page_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline mt-1 block truncate"
                            >
                              {issue.page_url}
                            </a>
                          )}
                          {issue.evidence && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono text-gray-700 overflow-x-auto">
                              {formatEvidence(issue.evidence)}
                            </div>
                          )}
                          {issue.recommendation && (
                            <p className="mt-2 text-xs text-gray-600">
                              <strong>Recommendation:</strong> {issue.recommendation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!selectedSession && sessions.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No crawls yet</h3>
          <p className="text-gray-500 mb-6">Start your first crawl to analyze SEO issues on this website.</p>
          <button
            onClick={handleStartCrawl}
            disabled={crawling}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Play className="w-5 h-5" />
            <span>Start First Crawl</span>
          </button>
        </div>
      )}
    </div>
  );
}
