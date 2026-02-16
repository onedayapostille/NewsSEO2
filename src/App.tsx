import { useState, useEffect } from 'react';
import { Database, Globe, Plus, TrendingUp, Activity, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { Website } from './types';
import { api } from './api';
import Dashboard from './components/Dashboard';
import WebsiteDetail from './components/WebsiteDetail';
import AddWebsiteModal from './components/AddWebsiteModal';
import IntegrationsModal from './components/IntegrationsModal';

interface HealthStatus {
  backend: string;
  database: string;
  timestamp: string;
}

function App() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIntegrationsModal, setShowIntegrationsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [backendError, setBackendError] = useState(false);

  useEffect(() => {
    checkHealth();
    loadWebsites();

    const healthInterval = setInterval(checkHealth, 30000);
    return () => clearInterval(healthInterval);
  }, []);

  const checkHealth = async () => {
    try {
      const health = await api.checkHealth();
      setHealthStatus(health);
      setBackendError(false);
    } catch (err) {
      setHealthStatus(null);
      setBackendError(true);
    }
  };

  const loadWebsites = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getWebsites();
      setWebsites(data);
    } catch (err) {
      setError('Backend server is not running. Please start it with: cd server && npm install && npm start');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWebsite = async (domain: string, displayName: string) => {
    try {
      await api.createWebsite(domain, displayName);
      setShowAddModal(false);
      await loadWebsites();
    } catch (err: any) {
      throw err;
    }
  };

  const handleDeleteWebsite = async (id: string) => {
    if (confirm('Are you sure you want to delete this website? All crawl data will be lost.')) {
      try {
        await api.deleteWebsite(id);
        if (selectedWebsiteId === id) {
          setSelectedWebsiteId(null);
        }
        await loadWebsites();
      } catch (err) {
        alert('Failed to delete website');
      }
    }
  };

  const handleBack = () => {
    setSelectedWebsiteId(null);
    loadWebsites();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg shadow-md">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">News SEO Analyzer</h1>
                <div className="flex items-center space-x-4 mt-1">
                  <p className="text-sm text-slate-600">Technical SEO analysis for news websites</p>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      {backendError ? (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-xs text-red-600 font-medium">Backend: Offline</span>
                        </>
                      ) : healthStatus ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-xs text-green-600 font-medium">Backend: Online</span>
                        </>
                      ) : (
                        <>
                          <Activity className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
                          <span className="text-xs text-yellow-600 font-medium">Backend: Checking...</span>
                        </>
                      )}
                    </div>
                    {healthStatus && (
                      <div className="flex items-center space-x-1">
                        {healthStatus.database === 'connected' ? (
                          <>
                            <Database className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-xs text-green-600 font-medium">DB: Connected</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-xs text-red-600 font-medium">DB: Disconnected</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {!selectedWebsiteId && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowIntegrationsModal(true)}
                  disabled={backendError || !healthStatus}
                  className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Settings className="w-5 h-5" />
                  <span>Integrations</span>
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  disabled={backendError || !healthStatus}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Website</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
            <p className="text-sm mt-2">Please start the backend server with: <code className="bg-red-100 px-2 py-1 rounded">cd server && npm install && npm start</code></p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : selectedWebsiteId ? (
          <WebsiteDetail
            websiteId={selectedWebsiteId}
            onBack={handleBack}
            onDelete={handleDeleteWebsite}
          />
        ) : (
          <Dashboard
            websites={websites}
            onSelectWebsite={setSelectedWebsiteId}
            onDeleteWebsite={handleDeleteWebsite}
          />
        )}
      </main>

      {showAddModal && (
        <AddWebsiteModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddWebsite}
        />
      )}

      {showIntegrationsModal && (
        <IntegrationsModal
          onClose={() => setShowIntegrationsModal(false)}
        />
      )}

      <footer className="mt-12 py-6 text-center text-slate-600 text-sm">
        <p>News SEO Analyzer - Technical SEO analysis tool for news websites</p>
      </footer>
    </div>
  );
}

export default App;
