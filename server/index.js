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

// Validate required configuration
try {
  features.validateRequiredConfig();
} catch (error) {
  console.error('❌', error.message);
  console.error('   Please check your .env file');
  process.exit(1);
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
  console.error('❌ Backend dependencies not installed!');
  console.error('   Run: cd server && npm install');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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
  const dbStatus = await checkDatabaseConnection();
  const featureConfig = await features.getFeatureConfig();

  const health = {
    status: dbStatus ? 'healthy' : 'unhealthy',
    backend: 'ok',
    database: dbStatus ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: appVersion,
    features: featureConfig
  };

  const statusCode = dbStatus ? 200 : 503;
  res.status(statusCode).json(health);
});

app.get('/api/verify/integrations', async (req, res) => {
  const featureConfig = await features.getFeatureConfig();
  const warnings = features.getConfigWarnings();

  res.json({
    features: featureConfig,
    warnings,
    configured: warnings.length === 0
  });
});

app.use('/api/websites', websitesRouter);
app.use('/api/crawl', crawlRouter);
app.use('/api/gsc', gscRouter);
app.use('/api/moz', mozRouter);
app.use('/api/ai', aiRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/monitoring', monitoringRouter);

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
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
  console.log(`   Websites API: http://localhost:${PORT}/api/websites`);
  console.log(`   Crawl API: http://localhost:${PORT}/api/crawl`);
  console.log(`   Monitoring API: http://localhost:${PORT}/api/monitoring`);
  console.log(`   GSC API: http://localhost:${PORT}/api/gsc (${gscEnabled ? 'enabled' : 'disabled'})`);
  console.log(`   Moz API: http://localhost:${PORT}/api/moz (${mozEnabled ? 'enabled' : 'disabled'})`);
  console.log(`   Integrations API: http://localhost:${PORT}/api/integrations`);
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
