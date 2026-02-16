# News SEO Analyzer

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)

A comprehensive technical SEO analysis tool specifically designed for news websites. Analyzes canonical strategies, pagination rules, search page handling, indexing control, AMP implementation, and structural issues.

**Production-ready** | **Fully portable** | **Optional integrations** | **Bolt deployment ready**

## Quick Start (Bolt Deployment)

```bash
# Single command deployment
npm start
```

The app serves both frontend and API from a single Express server. See [DEPLOYMENT_BOLT.md](./DEPLOYMENT_BOLT.md) for full deployment guide.

### Health Check
```bash
curl http://localhost:3001/health
# Returns: {"status":"healthy","backend":"ok","database":"connected",...}
```

## Features

### Core Features
- **Smart Crawler** - News-focused URL discovery with intelligent prioritization
- **Configurable Limits** - Crawl 10, 25, or 50 pages per session
- **SEO Analysis** - Comprehensive issue detection with severity levels
- **Multi-Website Support** - Track multiple sites with full history
- **Real-Time Monitoring** - Watch crawl progress with auto-refresh
- **Data Export** - CSV and JSON export for all results
- **Production Ready** - Docker support, automated tests, deployment guides

### Optional Integrations (Feature-Flagged)
- **Google Search Console** - Coverage data, top pages, search queries (Free)
- **Moz API** - Domain Authority, Spam Score, link metrics (Paid)
- **OpenAI** - AI-powered recommendations and task generation (Pay-per-use)

All integrations are optional and can be enabled via environment variables. See [INTEGRATIONS.md](./INTEGRATIONS.md) for setup.

## Architecture

The application consists of two main components:

1. **Frontend** (React + TypeScript + Vite) - located in `/src`
2. **Backend** (Node.js + Express) - located in `/server`
3. **Database** (Supabase PostgreSQL) - configured via environment variables

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (database already configured in this project)

## Quick Start

### Automated Setup (Recommended)

```bash
# Run the automated setup script
npm run setup

# Start both frontend and backend together
npm run dev:all
```

The app will be available at `http://localhost:5173`

### Manual Setup

For more control or troubleshooting, see [QUICKSTART.md](./QUICKSTART.md) for detailed step-by-step instructions.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | First-time setup (installs deps, creates .env) |
| `npm run dev:all` | Start both frontend and backend together |
| `npm run dev` | Start frontend only (http://localhost:5173) |
| `npm run server` | Start backend only (http://localhost:3001) |
| `npm run build` | Build frontend for production |
| `npm run test:smoke` | Run automated verification tests |
| `npm run check:env` | Validate environment configuration |
| `npm run deploy:check` | Run all pre-deployment checks |
| `npm run clean` | Remove all dependencies and build files |
| `npm run fresh` | Clean and reinstall everything |

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

**Required:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3001
PORT=3001
```

### Configuring Integrations (UI Method - Recommended)

**NEW:** Integrations can now be configured directly from the web interface!

1. Start the application: `npm run dev:all`
2. Click the **"Integrations"** button in the header
3. For each integration you want to enable:
   - Enter your API credentials
   - Click **"Save Settings"**
   - Click **"Test Connection"** to verify
   - Toggle the switch to enable/disable

**Available Integrations:**

- **Google Search Console** - Coverage data, top pages, search queries (Free)
  - Requires: Client ID, Client Secret, Redirect URI
  - Get credentials from: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

- **Moz API** - Domain Authority, Spam Score, link metrics (Paid)
  - Requires: Access ID, Secret Key
  - Get credentials from: [moz.com/products/api](https://moz.com/products/api)

- **OpenAI** - AI-powered SEO recommendations (Pay-per-use)
  - Requires: API Key, Model (optional)
  - Get API key from: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

**Security Note:** This is an admin-only feature with no authentication system yet. In production, you should implement proper authentication to restrict access to administrators only.

### Alternative: Environment Variables (Legacy Method)

You can still configure integrations via environment variables:

```env
# Enable features (set to true to enable)
ENABLE_GSC=false
ENABLE_MOZ=false
ENABLE_OPENAI=false

# Credentials (only needed if features enabled)
GSC_CLIENT_ID=...
MOZ_ACCESS_ID=...
OPENAI_API_KEY=...
```

**Note:** UI settings take priority over environment variables. If you configure an integration via the UI, the environment variables will be ignored for that integration.

See [INTEGRATIONS.md](./INTEGRATIONS.md) for complete setup instructions for each integration.

### Verification

```bash
# Check environment configuration
npm run check:env

# Test backend connectivity
npm run test:smoke
```

## Project Structure

```
.
├── src/                      # Frontend React application
│   ├── components/           # React components
│   ├── types.ts             # TypeScript type definitions
│   ├── api.ts               # API client
│   └── App.tsx              # Main application component
├── server/                   # Backend Express server
│   ├── routes/              # API route handlers
│   ├── services/            # Business logic (crawler, analyzer)
│   ├── utils/               # Helper functions
│   ├── config/              # Configuration files
│   └── index.js             # Server entry point
├── .env                     # Environment configuration
└── README.md               # This file
```

## Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Detailed setup and first-time usage
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guides
- **[INTEGRATIONS.md](./INTEGRATIONS.md)** - Complete integration setup
- **[BOOTSTRAP.md](./BOOTSTRAP.md)** - Troubleshooting and advanced topics

## Push to GitHub

### Initialize and Push to New Repository

```bash
# 1. Initialize Git (if not already initialized)
git init
git branch -m main

# 2. Configure Git (optional, if not already set globally)
git config user.email "your.email@example.com"
git config user.name "Your Name"

# 3. Add all files
git add -A

# 4. Verify .env is ignored (should show .env)
git check-ignore .env

# 5. Create initial commit
git commit -m "feat: Initial commit - News SEO Analyzer

- Smart crawler with news-focused URL discovery
- Comprehensive SEO analysis with severity levels
- Multi-website support with full history tracking
- Real-time crawl progress monitoring
- CSV and JSON data export
- Optional integrations (GSC, Moz, OpenAI)
- Docker support and deployment guides"

# 6. Create repository on GitHub (https://github.com/new)
# Choose a name, e.g., "news-seo-analyzer"
# DO NOT initialize with README (we already have one)

# 7. Add GitHub remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/news-seo-analyzer.git

# 8. Push to GitHub
git push -u origin main
```

### Using GitHub CLI (Alternative - Faster)

```bash
# Install GitHub CLI: https://cli.github.com

# Login
gh auth login

# Create and push in one command
gh repo create news-seo-analyzer --private --source=. --remote=origin --push
```

### Important: Security

**✅ Files that are committed (safe):**
- All source code
- Documentation (README, INTEGRATIONS, etc.)
- `.env.example` (template)
- Configuration files

**❌ Files that are excluded (secrets protected):**
- `.env` (your actual credentials)
- `node_modules/` (dependencies)
- `dist/` (build output)
- Logs and temporary files

**Before team members clone:**

```bash
# After cloning
git clone https://github.com/YOUR_USERNAME/news-seo-analyzer.git
cd news-seo-analyzer

# Copy and configure environment
cp .env.example .env
# Edit .env with real credentials

# Run automated setup
npm run setup

# Start the app
npm run dev:all
```

## Deployment

### Option 1: VPS / Cloud Server

1. **Prerequisites**
   - Ubuntu/Debian server with Node.js 18+
   - nginx (for reverse proxy)
   - PM2 (for process management)

2. **Installation**

```bash
# Clone or upload the project to your server
cd /var/www/seo-analyzer

# Install dependencies
npm install
cd server && npm install && cd ..

# Build frontend
npm run build

# Install PM2 globally
npm install -g pm2

# Start backend with PM2
cd server
pm2 start index.js --name seo-api
cd ..

# Serve frontend with nginx
```

3. **nginx Configuration**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/seo-analyzer/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. **Update Environment Variables**

Update `.env` with your production URLs:
```env
VITE_API_URL=https://your-domain.com
```

Rebuild frontend:
```bash
npm run build
```

### Option 2: Railway

1. **Create `railway.json` in project root:**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run build && cd server && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

2. **Deploy to Railway:**
   - Install Railway CLI: `npm install -g @railway/cli`
   - Login: `railway login`
   - Initialize: `railway init`
   - Deploy: `railway up`

3. **Set Environment Variables in Railway Dashboard:**
   - Add all variables from `.env`
   - Update `VITE_API_URL` to your Railway URL

### Option 3: Render

1. **Create `render.yaml` in project root:**

```yaml
services:
  - type: web
    name: seo-analyzer
    env: node
    buildCommand: npm install && cd server && npm install && cd .. && npm run build
    startCommand: cd server && npm start
    envVars:
      - key: PORT
        value: 3001
      - key: VITE_SUPABASE_URL
        sync: false
      - key: VITE_SUPABASE_ANON_KEY
        sync: false
```

2. **Deploy to Render:**
   - Connect your Git repository to Render
   - Render will automatically detect `render.yaml`
   - Add environment variables in Render dashboard

### Option 4: Docker

1. **Create `Dockerfile` in project root:**

```dockerfile
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd server && npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built frontend
COPY --from=build /app/dist ./dist

# Copy backend
COPY --from=build /app/server ./server
COPY --from=build /app/.env ./.env

# Install production dependencies
RUN cd server && npm install --production

EXPOSE 3001

# Start backend server
CMD ["node", "server/index.js"]
```

2. **Create `docker-compose.yml`:**

```yaml
version: '3.8'

services:
  seo-analyzer:
    build: .
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
    env_file:
      - .env
    restart: unless-stopped
```

3. **Build and Run:**

```bash
docker-compose up -d
```

### Option 5: Google Cloud Run

1. **Build container:**

```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT/seo-analyzer
```

2. **Deploy:**

```bash
gcloud run deploy seo-analyzer \
  --image gcr.io/YOUR_PROJECT/seo-analyzer \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars VITE_SUPABASE_URL=your_url,VITE_SUPABASE_ANON_KEY=your_key
```

## How It Works

### 1. Smart Crawler

The crawler intelligently discovers and analyzes pages with a news-focused approach:

- **Priority 1**: Homepage
- **Priority 2**: Latest articles (detected by URL patterns)
- **Priority 3**: Category pages
- **Priority 4**: Pagination (page 2)
- **Priority 5**: Search result pages
- **Priority 6**: Search pagination
- **Priority 7**: Tag pages
- **Priority 8**: AMP versions
- **Priority 9**: Other internal links

### 2. Page Classification

Pages are automatically classified as:
- **Article**: News content pages
- **Category**: Section/category listing pages
- **Pagination**: Paginated content pages
- **Search**: Search result pages
- **Search Pagination**: Paginated search results
- **Tag**: Tag/topic pages
- **AMP**: Accelerated Mobile Pages
- **Unknown**: Other page types

### 3. SEO Analysis

The analyzer checks for:

#### Indexing & Visibility
- Search pages should be noindex
- Tag pages indexing strategy
- Thin content detection
- Index bloat risks

#### Canonical Strategy
- Self-referencing canonicals on indexable pages
- Canonical URLs return 200 status
- No canonical chains
- Pagination canonical rules (page 2+ to self, not page 1)
- AMP canonical implementation

#### Search Pages
- Proper noindex,follow directives
- 404 detection on old search URLs
- Search pagination handling

#### Structure
- Single H1 tag per page
- Content quality (word count)
- Title tag optimization
- Schema.org markup (Article/NewsArticle)

#### Technical
- HTTP errors (4xx, 5xx)
- Meta robots conflicts
- Server errors

### 4. Issue Severity Levels

- **Critical**: Issues that block indexing or cause major SEO problems
- **High**: Issues that significantly impact rankings
- **Medium**: Best practice violations
- **Low**: Optimization opportunities

## Integrations

All integrations are **optional** and **feature-flagged**. The core tool works perfectly without any of them.

### Quick Integration Overview

| Integration | Purpose | Cost | Setup Time |
|------------|---------|------|------------|
| **Google Search Console** | Coverage data, top pages/queries | Free | 15 min |
| **Moz API** | Domain Authority, Spam Score | Paid subscription | 5 min |
| **OpenAI** | AI-powered recommendations | Pay-per-use (~$0.01/request) | 5 min |

### Setup

1. Set feature flag in `.env`: `ENABLE_<INTEGRATION>=true`
2. Add required credentials
3. Restart backend
4. Features automatically appear in UI

**Complete documentation:** [INTEGRATIONS.md](./INTEGRATIONS.md)

### Feature Status

Check which integrations are enabled:

```bash
curl http://localhost:3001/api/verify/integrations
```

## Testing & Verification

### Run Automated Tests

```bash
# Full pre-deployment check
npm run deploy:check

# Individual checks
npm run test:smoke      # Backend connectivity tests
npm run check:env       # Environment validation
npm run typecheck       # TypeScript validation
npm run lint           # Code quality check
npm run build          # Production build test
```

### Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "backend": "ok",
  "database": "connected",
  "uptime": 123,
  "version": "1.0.0",
  "features": {
    "gsc": { "enabled": false },
    "moz": { "enabled": false },
    "openai": { "enabled": false }
  }
}
```

## Troubleshooting

### Quick Fixes

```bash
# Backend not responding
npm run server

# Environment issues
npm run check:env

# Full reset
npm run fresh

# Run smoke tests
npm run test:smoke
```

### Common Issues

**"Failed to load websites"**
- Backend not running → `npm run server`
- Wrong API URL → Check `VITE_API_URL` in `.env`

**"Database connection failed"**
- Check Supabase credentials in `.env`
- Verify network connectivity

**"Integration disabled" errors**
- Set feature flag to `true` in `.env`
- Add required credentials
- Restart backend

For detailed troubleshooting, see [BOOTSTRAP.md](./BOOTSTRAP.md)

## Contributing

This is an internal tool. For issues or feature requests, contact the development team.

## License

Proprietary - Internal use only
