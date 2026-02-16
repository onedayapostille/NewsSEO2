import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './config/supabase.js';
import features from './config/features.js';
import websitesRouter from './routes/websites.js';
import crawlRouter from './routes/crawl.js';
import gscRouter from './routes/gsc.js';
import mozRouter from './routes/moz.js';
import aiRouter from './routes/ai.js';
import integrationsRouter from './routes/integrations.js';
import monitoringRouter from './routes/monitoring.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

console.log('🔧 Starting News SEO Analyzer Backend...');

// Validate required configuration (non-fatal for deployment)
try {
  features.validateRequiredConfig();
} catch (error) {
  console.warn('⚠️', error.message);
  console.warn('   Some features may not work correctly');
  console.warn('   Check your .env file for configuration');
}

// Get version from package.json
let appVersion = '1.0.0';
try {
  const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
  appVersion = packageJson.version;
} catch (error) {
  console.warn('⚠️  Could not read version from package.json');
}

if (!existsSync(join(__dirname, 'node_modules'))) {
  console.warn('⚠️  Backend dependencies may not be fully installed');
  console.warn('   Run: cd server && npm install');
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const distPath = join(__dirname, '..', 'dist');
if (existsSync(distPath)) {
  console.log('✅ Serving frontend from:', distPath);
  app.use(express.static(distPath));
} else {
  console.log('⚠️  Frontend dist folder not found, serving API only');
}

let dbConnected = false;

async function checkDatabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('websites')
      .select('count')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    dbConnected = true;
    return true;
  } catch (error) {
    console.error('⚠️  Database connection check failed:', error.message);
    dbConnected = false;
    return false;
  }
}

app.get('/health', async (req, res) => {
  try {
    const dbStatus = await checkDatabaseConnection();
    const featureConfig = await features.getFeatureConfig();

    const health = {
      status: dbStatus ? 'healthy' : 'degraded',
      backend: 'ok',
      database: dbStatus ? 'connected' : 'unknown',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: appVersion,
      features: featureConfig
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(200).json({
      status: 'degraded',
      backend: 'ok',
      database: 'unknown',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: appVersion,
      error: 'Health check error'
    });
  }
});

app.get('/api/diagnostics', async (req, res) => {
  try {
    const dbStatus = await checkDatabaseConnection();
    const featureConfig = await features.getFeatureConfig();
    const warnings = features.getConfigWarnings();

    let integrations = [];
    try {
      const { data } = await supabase
        .from('integration_settings')
        .select('provider, is_enabled, config_json, last_test_status');
      integrations = data || [];
    } catch (error) {
      console.warn('Could not fetch integrations:', error.message);
    }

    const envFlags = {
      ENABLE_MOZ: process.env.ENABLE_MOZ === 'true',
      ENABLE_GSC: process.env.ENABLE_GSC === 'true',
      ENABLE_OPENAI: process.env.ENABLE_OPENAI === 'true'
    };

    const hasDbConfig = (provider, fields) => {
      const row = integrations.find((item) => item.provider === provider);
      const cfg = row?.config_json || {};
      return fields.every((field) => Boolean(cfg[field]));
    };

    const integrationReadiness = {
      moz: {
        enabled: envFlags.ENABLE_MOZ,
        configured: hasDbConfig('moz', ['accessId', 'secretKey'])
          || Boolean(process.env.MOZ_ACCESS_ID && process.env.MOZ_SECRET_KEY)
      },
      gsc: {
        enabled: envFlags.ENABLE_GSC,
        configured: hasDbConfig('gsc', ['clientId', 'clientSecret', 'redirectUri'])
          || Boolean(process.env.GSC_CLIENT_ID && process.env.GSC_CLIENT_SECRET && process.env.GSC_REDIRECT_URI)
      },
      openai: {
        enabled: envFlags.ENABLE_OPENAI,
        configured: hasDbConfig('openai', ['apiKey'])
          || Boolean(process.env.OPENAI_API_KEY)
      }
    };

    res.json({
      status: 'ok',
      db: dbStatus ? 'connected' : 'unknown',
      featureStatus: featureConfig,
      envFlags,
      integrationReadiness,
      warnings,
      version: appVersion,
      uptime: Math.floor(process.uptime())
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

app.use('/api/websites', websitesRouter);
app.use('/api/crawl', crawlRouter);
app.use('/api/gsc', gscRouter);
app.use('/api/moz', mozRouter);
app.use('/api/ai', aiRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/monitoring', monitoringRouter);

app.get('*', (req, res) => {
  const indexPath = join(__dirname, '..', 'dist', 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({
      error: 'Not Found',
      message: 'Frontend not built. Run "npm run build:client" first.'
    });
  }
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

const server = app.listen(PORT, async () => {
  console.log('✅ Server started successfully');
  console.log(`   Port: ${PORT}`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log('');
  console.log('🔍 Checking database connection...');

  const dbStatus = await checkDatabaseConnection();

  if (dbStatus) {
    console.log('✅ Database connected');
  } else {
    console.log('⚠️  Database connection failed');
    console.log('   Check your Supabase credentials in .env');
  }

  await features.logFeatureStatus();

  const gscEnabled = await features.isGscEnabled();
  const mozEnabled = await features.isMozEnabled();

  console.log('📡 API Endpoints:');
  console.log(`   Health Check: http://localhost:${PORT}/health`);
  console.log(`   Diagnostics: http://localhost:${PORT}/api/diagnostics`);
  console.log(`   Websites API: http://localhost:${PORT}/api/websites`);
  console.log(`   Crawl API: http://localhost:${PORT}/api/crawl`);
  console.log(`   Monitoring API: http://localhost:${PORT}/api/monitoring`);
  console.log(`   Integrations API: http://localhost:${PORT}/api/integrations`);
  console.log(`   GSC API: http://localhost:${PORT}/api/gsc (${gscEnabled ? 'enabled' : 'disabled'})`);
  console.log(`   Moz API: http://localhost:${PORT}/api/moz (${mozEnabled ? 'enabled' : 'disabled'})`);
  console.log('');
  console.log('🚀 Backend is ready!');
});

process.on('SIGTERM', () => {
  console.log('');
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('');
  console.log('🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
