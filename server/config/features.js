import dotenv from 'dotenv';
import { supabase } from './supabase.js';
dotenv.config();

/**
 * Centralized Feature Flags Configuration
 *
 * Priority: Database settings > Environment variables
 * This allows UI-based configuration to override env vars.
 */

let cachedSettings = null;
let cacheTime = null;
const CACHE_TTL = 30000;

async function getIntegrationSettings() {
  const now = Date.now();

  if (cachedSettings && cacheTime && (now - cacheTime) < CACHE_TTL) {
    return cachedSettings;
  }

  try {
    const { data, error } = await supabase
      .from('integration_settings')
      .select('*');

    if (error) throw error;

    const settings = {};
    data.forEach(item => {
      settings[item.provider] = {
        enabled: item.is_enabled,
        config: item.config_json || {}
      };
    });

    cachedSettings = settings;
    cacheTime = now;
    return settings;
  } catch (error) {
    console.warn('⚠️  Could not fetch integration settings from database, using env vars');
    return null;
  }
}

export function clearFeatureCache() {
  cachedSettings = null;
  cacheTime = null;
}

// Feature flag helpers
export const isGscEnabled = async () => {
  const dbSettings = await getIntegrationSettings();

  if (dbSettings && dbSettings.gsc) {
    return dbSettings.gsc.enabled && hasGscCredentialsFromConfig(dbSettings.gsc.config);
  }

  const enabled = process.env.ENABLE_GSC === 'true';
  if (enabled) {
    return hasGscCredentials();
  }
  return false;
};

export const isMozEnabled = async () => {
  const dbSettings = await getIntegrationSettings();

  if (dbSettings && dbSettings.moz) {
    return dbSettings.moz.enabled && hasMozCredentialsFromConfig(dbSettings.moz.config);
  }

  const enabled = process.env.ENABLE_MOZ === 'true';
  if (enabled) {
    return hasMozCredentials();
  }
  return false;
};

export const isOpenAiEnabled = async () => {
  const dbSettings = await getIntegrationSettings();

  if (dbSettings && dbSettings.openai) {
    return dbSettings.openai.enabled && hasOpenAiCredentialsFromConfig(dbSettings.openai.config);
  }

  const enabled = process.env.ENABLE_OPENAI === 'true';
  if (enabled) {
    return hasOpenAiCredentials();
  }
  return false;
};

// Credential validation from config objects
function hasGscCredentialsFromConfig(config) {
  return !!(config.clientId && config.clientSecret && config.redirectUri);
}

function hasMozCredentialsFromConfig(config) {
  return !!(config.accessId && config.secretKey);
}

function hasOpenAiCredentialsFromConfig(config) {
  return !!config.apiKey;
}

// Credential validation from env vars (backward compatibility)
export const hasGscCredentials = () => {
  return !!(
    process.env.GSC_CLIENT_ID &&
    process.env.GSC_CLIENT_SECRET &&
    process.env.GSC_REDIRECT_URI
  );
};

export const hasMozCredentials = () => {
  return !!(
    process.env.MOZ_ACCESS_ID &&
    process.env.MOZ_SECRET_KEY
  );
};

export const hasOpenAiCredentials = () => {
  return !!process.env.OPENAI_API_KEY;
};

// Get all feature statuses
export const getFeatureConfig = async () => {
  const gscEnabled = await isGscEnabled();
  const mozEnabled = await isMozEnabled();
  const openaiEnabled = await isOpenAiEnabled();

  return {
    gsc: {
      enabled: gscEnabled,
      hasCredentials: hasGscCredentials(),
      status: gscEnabled ? 'enabled' : 'disabled'
    },
    moz: {
      enabled: mozEnabled,
      hasCredentials: hasMozCredentials(),
      status: mozEnabled ? 'enabled' : 'disabled'
    },
    openai: {
      enabled: openaiEnabled,
      hasCredentials: hasOpenAiCredentials(),
      status: openaiEnabled ? 'enabled' : 'disabled'
    }
  };
};

// Get configuration warnings for missing credentials
export const getConfigWarnings = () => {
  const warnings = [];

  if (process.env.ENABLE_GSC === 'true' && !hasGscCredentials()) {
    warnings.push('GSC is enabled but credentials are missing (GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REDIRECT_URI)');
  }

  if (process.env.ENABLE_MOZ === 'true' && !hasMozCredentials()) {
    warnings.push('Moz is enabled but credentials are missing (MOZ_ACCESS_ID, MOZ_SECRET_KEY)');
  }

  if (process.env.ENABLE_OPENAI === 'true' && !hasOpenAiCredentials()) {
    warnings.push('OpenAI is enabled but API key is missing (OPENAI_API_KEY)');
  }

  return warnings;
};

// Validate required environment variables
export const validateRequiredConfig = () => {
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'PORT'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Log feature status on startup
export const logFeatureStatus = async () => {
  const features = await getFeatureConfig();
  const warnings = getConfigWarnings();

  console.log('\n🎯 Feature Configuration:');
  console.log(`   Google Search Console: ${features.gsc.status}`);
  console.log(`   Moz API: ${features.moz.status}`);
  console.log(`   OpenAI: ${features.openai.status}`);

  if (warnings.length > 0) {
    console.log('\n⚠️  Configuration Warnings:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  console.log('');
};

export default {
  isGscEnabled,
  isMozEnabled,
  isOpenAiEnabled,
  hasGscCredentials,
  hasMozCredentials,
  hasOpenAiCredentials,
  getFeatureConfig,
  getConfigWarnings,
  validateRequiredConfig,
  logFeatureStatus
};
