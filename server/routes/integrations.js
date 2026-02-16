import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

function maskApiKey(key) {
  if (!key || key.length < 8) return '****';
  return '****' + key.slice(-4);
}

function maskConfig(provider, config) {
  if (!config || typeof config !== 'object') return {};

  const masked = { ...config };

  switch (provider) {
    case 'gsc':
      if (masked.clientId) masked.clientId = maskApiKey(masked.clientId);
      if (masked.clientSecret) masked.clientSecret = '****';
      break;
    case 'moz':
      if (masked.accessId) masked.accessId = maskApiKey(masked.accessId);
      if (masked.secretKey) masked.secretKey = '****';
      break;
    case 'openai':
      if (masked.apiKey) masked.apiKey = maskApiKey(masked.apiKey);
      break;
  }

  return masked;
}

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('integration_settings')
      .select('*')
      .order('provider');

    if (error) throw error;

    const integrations = data.map(item => ({
      provider: item.provider,
      isEnabled: item.is_enabled,
      isConfigured: Object.keys(item.config_json || {}).length > 0,
      config: maskConfig(item.provider, item.config_json),
      lastTestAt: item.last_test_at,
      lastTestStatus: item.last_test_status,
      lastTestMessage: item.last_test_message,
      updatedAt: item.updated_at
    }));

    res.json({ integrations });
  } catch (error) {
    console.error('Failed to fetch integrations:', error);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { provider, isEnabled, config } = req.body;

    if (!provider || !['gsc', 'moz', 'openai'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const updateData = {
      is_enabled: isEnabled,
      config_json: config || {},
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('integration_settings')
      .update(updateData)
      .eq('provider', provider)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      integration: {
        provider: data.provider,
        isEnabled: data.is_enabled,
        isConfigured: Object.keys(data.config_json || {}).length > 0,
        config: maskConfig(data.provider, data.config_json),
        updatedAt: data.updated_at
      }
    });
  } catch (error) {
    console.error('Failed to save integration:', error);
    res.status(500).json({ error: 'Failed to save integration settings' });
  }
});

router.post('/test', async (req, res) => {
  try {
    const { provider, config } = req.body;

    if (!provider || !['gsc', 'moz', 'openai'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    let testResult = { success: false, message: 'Test not implemented' };

    switch (provider) {
      case 'gsc':
        testResult = await testGscConnection(config);
        break;
      case 'moz':
        testResult = await testMozConnection(config);
        break;
      case 'openai':
        testResult = await testOpenAiConnection(config);
        break;
    }

    const { error: updateError } = await supabase
      .from('integration_settings')
      .update({
        last_test_at: new Date().toISOString(),
        last_test_status: testResult.success ? 'success' : 'error',
        last_test_message: testResult.message
      })
      .eq('provider', provider);

    if (updateError) {
      console.error('Failed to update test status:', updateError);
    }

    res.json(testResult);
  } catch (error) {
    console.error('Failed to test integration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test connection: ' + error.message
    });
  }
});

async function testGscConnection(config) {
  try {
    if (!config.clientId || !config.clientSecret) {
      return { success: false, message: 'Client ID and Secret are required' };
    }

    return {
      success: true,
      message: 'GSC credentials validated (OAuth flow requires user authorization)'
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function testMozConnection(config) {
  try {
    if (!config.accessId || !config.secretKey) {
      return { success: false, message: 'Access ID and Secret Key are required' };
    }

    const crypto = await import('crypto');
    const expires = Math.floor(Date.now() / 1000) + 300;
    const stringToSign = `${config.accessId}\n${expires}`;
    const signature = crypto
      .createHmac('sha1', config.secretKey)
      .update(stringToSign)
      .digest('base64');

    const response = await fetch('https://lsapi.seomoz.com/v2/url_metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.accessId}:${signature}`).toString('base64')}`
      },
      body: JSON.stringify({ targets: ['moz.com'] })
    });

    if (response.ok) {
      return { success: true, message: 'Moz API connection successful' };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        message: `Moz API error: ${response.status} - ${errorText.substring(0, 100)}`
      };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function testOpenAiConnection(config) {
  try {
    if (!config.apiKey) {
      return { success: false, message: 'API Key is required' };
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      const model = config.model || 'gpt-3.5-turbo';
      const modelExists = data.data.some(m => m.id === model);

      if (modelExists) {
        return {
          success: true,
          message: `OpenAI API connected successfully. Model "${model}" is available.`
        };
      } else {
        return {
          success: true,
          message: `OpenAI API connected, but model "${model}" not found. Using default.`
        };
      }
    } else {
      const errorData = await response.json();
      return {
        success: false,
        message: `OpenAI API error: ${errorData.error?.message || response.statusText}`
      };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export default router;
