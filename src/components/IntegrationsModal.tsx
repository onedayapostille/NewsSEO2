import { useState, useEffect } from 'react';
import { X, Settings, Check, AlertCircle, Loader, Eye, EyeOff } from 'lucide-react';
import { api } from '../api';

interface Integration {
  provider: string;
  isEnabled: boolean;
  isConfigured: boolean;
  config: any;
  lastTestStatus?: string;
  lastTestMessage?: string;
  lastTestAt?: string;
}

interface IntegrationsModalProps {
  onClose: () => void;
}

const providerInfo = {
  gsc: {
    name: 'Google Search Console',
    description: 'Track search performance, coverage data, and top pages',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'your-app.apps.googleusercontent.com' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Your client secret' },
      { key: 'redirectUri', label: 'Redirect URI', type: 'text', placeholder: 'http://localhost:5173/gsc/callback' }
    ],
    cost: 'Free',
    setup: 'Requires OAuth 2.0 setup in Google Cloud Console'
  },
  moz: {
    name: 'Moz API',
    description: 'Get Domain Authority, Spam Score, and link metrics',
    fields: [
      { key: 'accessId', label: 'Access ID', type: 'text', placeholder: 'mozscape-xxxxx' },
      { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'Your secret key' }
    ],
    cost: 'Paid subscription required',
    setup: 'Get credentials from moz.com/products/api'
  },
  openai: {
    name: 'OpenAI (ChatGPT)',
    description: 'AI-powered SEO recommendations and automated summaries',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-proj-...' },
      { key: 'model', label: 'Model', type: 'text', placeholder: 'gpt-3.5-turbo' }
    ],
    cost: 'Pay-per-use (~$0.01/request)',
    setup: 'Get API key from platform.openai.com/api-keys'
  }
};

export default function IntegrationsModal({ onClose }: IntegrationsModalProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [editingConfig, setEditingConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const data = await api.getIntegrations();
      setIntegrations(data.integrations);

      const initialConfig: Record<string, any> = {};
      data.integrations.forEach((int: Integration) => {
        initialConfig[int.provider] = int.config || {};
      });
      setEditingConfig(initialConfig);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (provider: string, currentEnabled: boolean) => {
    try {
      setSaving(provider);
      const config = editingConfig[provider] || {};
      await api.saveIntegration(provider, !currentEnabled, config);
      await loadIntegrations();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(null);
    }
  };

  const handleConfigChange = (provider: string, field: string, value: string) => {
    setEditingConfig(prev => ({
      ...prev,
      [provider]: {
        ...(prev[provider] || {}),
        [field]: value
      }
    }));
  };

  const handleSave = async (provider: string) => {
    try {
      setSaving(provider);
      const integration = integrations.find(i => i.provider === provider);
      const config = editingConfig[provider] || {};
      await api.saveIntegration(provider, integration?.isEnabled || false, config);
      await loadIntegrations();
      alert('Settings saved successfully!');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(null);
    }
  };

  const handleTest = async (provider: string) => {
    try {
      setTesting(provider);
      const config = editingConfig[provider] || {};
      const result = await api.testIntegration(provider, config);

      if (result.success) {
        alert(`✅ ${result.message}`);
      } else {
        alert(`❌ ${result.message}`);
      }

      await loadIntegrations();
    } catch (error: any) {
      alert(`❌ Test failed: ${error.message}`);
    } finally {
      setTesting(null);
    }
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getStatusBadge = (integration: Integration) => {
    if (!integration.isConfigured) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Not Configured
        </span>
      );
    }

    if (!integration.isEnabled) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Disabled
        </span>
      );
    }

    if (integration.lastTestStatus === 'success') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Check className="w-3 h-3 mr-1" />
          Connected
        </span>
      );
    }

    if (integration.lastTestStatus === 'error') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Error
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        Configured
      </span>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Integration Settings</h2>
              <p className="text-sm text-gray-600">Configure API integrations for enhanced features</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {(['gsc', 'moz', 'openai'] as const).map(provider => {
            const integration = integrations.find(i => i.provider === provider);
            const info = providerInfo[provider];

            if (!integration) return null;

            return (
              <div key={provider} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{info.name}</h3>
                      {getStatusBadge(integration)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{info.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="font-medium">{info.cost}</span>
                      <span>•</span>
                      <span>{info.setup}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={() => handleToggle(provider, integration.isEnabled)}
                      disabled={saving === provider}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        integration.isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                      } ${saving === provider ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          integration.isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {integration.lastTestStatus === 'error' && integration.lastTestMessage && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>Last Test Failed:</strong> {integration.lastTestMessage}
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {info.fields.map(field => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>
                      <div className="relative">
                        <input
                          type={field.type === 'password' && !showPasswords[`${provider}-${field.key}`] ? 'password' : 'text'}
                          value={editingConfig[provider]?.[field.key] || ''}
                          onChange={(e) => handleConfigChange(provider, field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                        />
                        {field.type === 'password' && (
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(`${provider}-${field.key}`)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPasswords[`${provider}-${field.key}`] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-3 mt-4">
                  <button
                    onClick={() => handleSave(provider)}
                    disabled={saving === provider}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {saving === provider ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Settings</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleTest(provider)}
                    disabled={testing === provider || !integration.isConfigured}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {testing === provider ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Testing...</span>
                      </>
                    ) : (
                      <span>Test Connection</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-start space-x-2 text-sm text-gray-600">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">Admin-Only Feature (No Authentication)</p>
              <p>These settings are currently accessible to anyone. In a production environment, you should add proper authentication to restrict access to administrators only.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
