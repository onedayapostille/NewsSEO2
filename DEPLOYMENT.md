# Deployment Guide - News SEO Analyzer

## Overview

This guide covers deploying the News SEO Analyzer backend from GitHub to various hosting platforms. The backend is a Node.js Express API that connects to Supabase for data persistence.

## Prerequisites

### Required
1. **Supabase Account** - Database and authentication
   - Sign up at: https://supabase.com
   - Create a new project
   - Note your project URL and anon key

2. **GitHub Repository** - Your code must be pushed to GitHub
   - All required files should be committed
   - `.env` should NOT be committed (use `.env.example`)

### Optional
3. **API Keys** (for enhanced features)
   - OpenAI API key (semantic analysis)
   - Google PageSpeed API key (performance metrics)
   - Google Search Console credentials (traffic data)
   - Moz API credentials (domain metrics)

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/your-username/news-seo-analyzer.git
cd news-seo-analyzer
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your Supabase credentials
nano .env  # or use your preferred editor
```

Required variables:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Or use root script
cd ..
npm run install:all
```

### 4. Apply Database Migrations

```bash
# Migrations are in supabase/migrations/
# Apply them using Supabase CLI or dashboard
# Or they'll auto-apply via the backend services
```

### 5. Start Backend

```bash
# From server directory
cd server
npm start

# Or from root
npm start

# Development mode with auto-reload
npm run dev
```

Backend will start on http://localhost:3001

### 6. Verify

```bash
# Check health
curl http://localhost:3001/health

# Check diagnostics
curl http://localhost:3001/api/diagnostics
```

## Deployment Platforms

## 1. Railway Deployment

Railway is the easiest option with automatic GitHub integration.

### Steps

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Service**
   - Railway will detect Node.js automatically
   - Set root directory to `/server` OR use root with custom start command

4. **Add Environment Variables**
   - Go to project settings → Variables
   - Add required variables:
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your_anon_key_here
     PORT=3001
     NODE_ENV=production
     ```
   - Add optional API keys as needed

5. **Configure Build/Start**

   **Option A: Root deployment**
   - Build Command: `npm install && cd server && npm install`
   - Start Command: `npm run start:prod`

   **Option B: Server directory deployment**
   - Root Directory: `/server`
   - Build Command: `npm install`
   - Start Command: `npm start`

6. **Deploy**
   - Railway will auto-deploy on push to main branch
   - Check logs for any errors
   - Note your deployment URL

### Railway Configuration File (Optional)

Create `railway.json` in project root:

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd server && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## 2. Render Deployment

Render provides free tier with automatic HTTPS.

### Steps

1. **Create Render Account**
   - Go to https://render.com
   - Sign in with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure Service**
   - Name: `news-seo-analyzer-api`
   - Region: Choose closest to your users
   - Branch: `main`
   - Root Directory: `server`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`

4. **Environment Variables**
   - Add all required variables in the dashboard
   - Mark sensitive ones as "secret"

5. **Advanced Settings**
   - Auto-Deploy: Yes
   - Health Check Path: `/health`
   - Port: 3001 (or leave empty, Render auto-detects)

6. **Deploy**
   - Click "Create Web Service"
   - Wait for build and deployment
   - Test your endpoint: `https://your-app.onrender.com/health`

### Render Configuration File (Optional)

Create `render.yaml` in project root:

```yaml
services:
  - type: web
    name: news-seo-analyzer-api
    env: node
    region: oregon
    plan: free
    buildCommand: cd server && npm install
    startCommand: cd server && npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
      - key: VITE_SUPABASE_URL
        sync: false
      - key: VITE_SUPABASE_ANON_KEY
        sync: false
```

---

## 3. Google Cloud Run Deployment

Cloud Run provides serverless container deployment with auto-scaling.

### Prerequisites
- Google Cloud account
- `gcloud` CLI installed

### Steps

1. **Create Dockerfile**

Create `Dockerfile` in project root:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd server && npm install

# Copy application code
COPY . .

# Expose port
ENV PORT=8080
EXPOSE 8080

# Start server
CMD ["npm", "run", "start:prod"]
```

2. **Create .dockerignore**

```
node_modules
server/node_modules
.env
.git
*.md
.vscode
```

3. **Build and Push Container**

```bash
# Set project ID
export PROJECT_ID=your-gcp-project-id

# Build container
docker build -t gcr.io/${PROJECT_ID}/news-seo-analyzer .

# Push to Container Registry
docker push gcr.io/${PROJECT_ID}/news-seo-analyzer
```

4. **Deploy to Cloud Run**

```bash
gcloud run deploy news-seo-analyzer \
  --image gcr.io/${PROJECT_ID}/news-seo-analyzer \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "VITE_SUPABASE_URL=https://your-project.supabase.co,VITE_SUPABASE_ANON_KEY=your_key,NODE_ENV=production"
```

5. **Verify Deployment**

```bash
# Get service URL
gcloud run services describe news-seo-analyzer --region us-central1

# Test
curl https://your-service-url/health
```

---

## 4. Traditional VPS Deployment (DigitalOcean, AWS EC2, etc.)

For VPS with SSH access.

### Steps

1. **Connect to VPS**

```bash
ssh user@your-server-ip
```

2. **Install Node.js**

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

3. **Clone Repository**

```bash
cd /var/www
sudo git clone https://github.com/your-username/news-seo-analyzer.git
cd news-seo-analyzer
```

4. **Configure Environment**

```bash
sudo nano .env
# Add your environment variables
```

5. **Install Dependencies**

```bash
cd server
sudo npm install
```

6. **Install PM2 (Process Manager)**

```bash
sudo npm install -g pm2
```

7. **Start Application**

```bash
# From server directory
pm2 start index.js --name news-seo-api

# Save PM2 config
pm2 save

# Enable startup on boot
pm2 startup
```

8. **Configure Nginx (Reverse Proxy)**

```bash
sudo nano /etc/nginx/sites-available/news-seo-api
```

Add configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/news-seo-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

9. **Configure Firewall**

```bash
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbG...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `PAGESPEED_API_KEY` | Google PageSpeed API key | None |
| `OPENAI_API_KEY` | OpenAI API key | None |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4o-mini` |
| `GSC_CLIENT_ID` | Google Search Console OAuth client ID | None |
| `GSC_CLIENT_SECRET` | Google Search Console OAuth secret | None |
| `MOZ_ACCESS_ID` | Moz API access ID | None |
| `MOZ_SECRET_KEY` | Moz API secret key | None |

---

## Post-Deployment Checklist

### 1. Verify Health

```bash
curl https://your-deployment-url/health
```

Expected response:
```json
{
  "status": "healthy",
  "backend": "ok",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123,
  "version": "1.0.0"
}
```

### 2. Check Diagnostics

```bash
curl https://your-deployment-url/api/diagnostics
```

Verify:
- Database is connected
- Required environment variables are configured
- Integrations table is accessible

### 3. Test API Endpoints

```bash
# List websites
curl https://your-deployment-url/api/websites

# Get integrations
curl https://your-deployment-url/api/integrations
```

### 4. Configure Integrations

- Access your deployment URL in browser
- Open Integrations modal
- Add API keys as needed
- Test each integration

### 5. Run First Crawl

- Create a website
- Start a crawl
- Verify data appears in database
- Check monitoring dashboard

---

## Troubleshooting

### Database Connection Failed

**Symptoms:** `database: "disconnected"` in health check

**Solutions:**
1. Verify Supabase URL and key are correct
2. Check Supabase project is active
3. Verify network connectivity
4. Check Supabase project has migrations applied

### Port Already in Use

**Symptoms:** `Error: listen EADDRINUSE`

**Solutions:**
1. Change PORT environment variable
2. Kill process using the port: `lsof -ti:3001 | xargs kill -9`

### Build Failures

**Symptoms:** Deployment fails during build

**Solutions:**
1. Verify `package.json` exists in server directory
2. Check Node version (requires 18+)
3. Review build logs for specific errors
4. Ensure all dependencies are listed

### Integration Tests Failing

**Symptoms:** API calls return errors

**Solutions:**
1. Check API keys are valid
2. Verify API quotas aren't exceeded
3. Check network/firewall rules
4. Review error messages in logs

---

## Monitoring & Maintenance

### View Logs

**Railway:**
- Go to project → Deployments → View logs

**Render:**
- Go to service → Logs tab

**Cloud Run:**
```bash
gcloud run services logs read news-seo-analyzer
```

**VPS with PM2:**
```bash
pm2 logs news-seo-api
```

### Update Deployment

**Railway/Render:**
- Push to GitHub main branch
- Auto-deploys

**Cloud Run:**
```bash
# Rebuild and deploy
gcloud run deploy news-seo-analyzer --image gcr.io/${PROJECT_ID}/news-seo-analyzer
```

**VPS:**
```bash
cd /var/www/news-seo-analyzer
sudo git pull
cd server
sudo npm install
pm2 restart news-seo-api
```

### Database Backups

Supabase provides automatic backups. For additional safety:

1. Go to Supabase dashboard
2. Project Settings → Database
3. Enable automatic backups
4. Set backup schedule

---

## Security Best Practices

1. **Never commit .env files**
   - Always use `.env.example` as template
   - Add `.env` to `.gitignore`

2. **Use environment variables**
   - Store all secrets in platform's environment variable system
   - Never hardcode credentials

3. **Enable HTTPS**
   - Most platforms provide automatic HTTPS
   - For VPS, use Let's Encrypt

4. **Restrict database access**
   - Use Supabase Row Level Security (RLS)
   - Limit database access to authenticated users

5. **Monitor logs**
   - Regularly check for errors
   - Set up alerts for critical issues

6. **Keep dependencies updated**
   - Regularly update npm packages
   - Monitor security advisories

---

## Cost Estimates

### Free Tier Options

- **Supabase:** Free tier includes 500MB database, 2GB bandwidth
- **Railway:** $5 credit/month, covers light usage
- **Render:** Free tier with 750 hours/month
- **Vercel:** Not recommended for backend, but has free tier

### Paid Options

- **Railway:** ~$5-20/month depending on usage
- **Render:** ~$7/month for starter plan
- **Cloud Run:** Pay per use, ~$5-15/month typical
- **VPS (DigitalOcean):** ~$6-12/month for basic droplet

### API Costs

- **OpenAI (gpt-4o-mini):** ~$0.0003 per article
- **Google PageSpeed:** Free (rate limited without key)
- **Moz API:** Paid subscription required (~$99+/month)
- **Google Search Console:** Free

---

## Support & Resources

- **Documentation:** See README.md and PROJECT_STATUS.md
- **Supabase Docs:** https://supabase.com/docs
- **Railway Docs:** https://docs.railway.app
- **Render Docs:** https://render.com/docs
- **Cloud Run Docs:** https://cloud.google.com/run/docs

---

## Quick Deploy Commands

```bash
# Railway (with CLI)
railway login
railway init
railway up

# Render (with CLI)
render login
render services create
render deploy

# Cloud Run (with gcloud)
gcloud run deploy news-seo-analyzer \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# VPS (manual)
git clone repo && cd repo/server && npm install && pm2 start index.js
```
