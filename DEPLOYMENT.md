# News SEO Analyzer - Deployment Guide

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+ (recommended: Node 20)
- Supabase account (free tier works)

### 1. Clone and Setup
```bash
git clone https://github.com/onedayapostille/NewsSEOIntelligenceSystem.git
cd NewsSEOIntelligenceSystem
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

Required variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Development Servers

**Option A: Full stack (recommended)**
```bash
# Terminal 1: Frontend (Vite dev server)
npm run dev

# Terminal 2: Backend
cd server && npm start
```

**Option B: Production build locally**
```bash
npm run build
cd server && npm start
# Visit http://localhost:3001
```

### 5. Verify
```bash
curl http://localhost:3001/health
```

---

## Production Deployment

### Option 1: Docker (Recommended)

#### Build and Run
```bash
# Build
docker build -t news-seo-analyzer .

# Run
docker run -p 3001:3001 --env-file .env news-seo-analyzer

# Or use docker compose
docker compose up -d
```

#### Docker Compose
The included `docker-compose.yml` provides:
- Health checks
- Resource limits
- Auto-restart
- Log rotation

### Option 2: VPS with GitHub Actions

#### Prerequisites
1. A VPS with Docker installed
2. SSH access configured
3. GitHub repository

#### Setup GitHub Secrets
Add these secrets in your repository settings (Settings → Secrets → Actions):

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | Your VPS IP address or hostname |
| `VPS_USER` | SSH username |
| `VPS_SSH_KEY` | Private SSH key (full key, including BEGIN/END lines) |
| `VPS_PORT` | SSH port (optional, defaults to 22) |
| `DEPLOY_PATH` | App directory on VPS (optional, defaults to ~/app) |

#### VPS Preparation
```bash
# On your VPS
mkdir -p ~/app
cd ~/app

# Clone repo (first time only)
git clone https://github.com/YOUR_USERNAME/NewsSEOIntelligenceSystem.git .

# Create .env file
cp .env.example .env
nano .env  # Add your credentials

# Verify docker works
docker --version
docker compose version
```

#### Automatic Deployment
Once configured, pushing to `main` branch will:
1. Build/test in GitHub Actions
2. SSH to your VPS
3. Build the image on the VPS with `docker compose build --pull`
4. Restart services with `docker compose up -d`

This avoids Portainer API/GHCR registry coupling during deployment and is more resilient when Portainer (`:9443`) is unreachable.

#### Manual Deployment (VPS)
```bash
cd ~/app
git pull origin main
docker compose build --pull
docker compose up -d
```

### Option 3: Railway / Render

Both platforms support Docker deployment:

1. Connect your GitHub repository
2. Set environment variables in the platform dashboard
3. Deploy automatically on push

**Railway:**
- Detects Dockerfile automatically
- Set `PORT=3001` in environment variables

**Render:**
- Create a "Web Service"
- Select "Docker" as environment
- Set `PORT=3001` environment variable

---

## Environment Variables Reference

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | `eyJhbGc...` |

### Optional
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `VITE_API_URL` | Backend URL for frontend | (empty for same-origin) |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `GSC_CLIENT_ID` | Google Search Console OAuth client ID | - |
| `GSC_CLIENT_SECRET` | Google Search Console OAuth client secret | - |
| `MOZ_ACCESS_ID` | Moz API access ID | - |
| `MOZ_SECRET_KEY` | Moz API secret key | - |

---

## Verification Checklist

After deployment, verify these endpoints:

```bash
# Health check
curl https://yourdomain.com/health
# Expected: {"status":"healthy","backend":"ok","database":"connected",...}

# API check
curl https://yourdomain.com/api/websites
# Expected: [] or list of websites

# Integrations
curl https://yourdomain.com/api/integrations
# Expected: {"integrations":[...]}
```

---

## Troubleshooting

### Server won't start
```bash
# Check logs
docker logs <container_id>

# Verify environment
docker exec <container_id> env | grep SUPABASE
```

### Database connection failed
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check Supabase dashboard for connection issues
- Ensure Row Level Security (RLS) policies are configured

### Frontend shows "Backend: Offline"
- Verify backend is running on port 3001
- Check `VITE_API_URL` is correct (or empty for same-origin)
- Check CORS configuration

### Docker build fails
```bash
# Clean build
docker build --no-cache -t news-seo-analyzer .

# Check disk space
df -h
```

### Portainer cannot add GHCR registry (`context deadline exceeded`)
If Portainer shows an error like:

`failed to list registries: Get "https://<your-server>:9443/api/registries": context deadline exceeded`

the timeout is usually between your browser/reverse-proxy and Portainer API (port `9443`), not GHCR itself.

1. **Verify Portainer API is reachable from your browser/network**
   ```bash
   curl -k https://YOUR_SERVER_IP:9443/api/status
   ```
2. **Confirm firewall/security-group allows 9443/TCP** (or your reverse-proxy target port).
3. **If using Nginx/Traefik proxy, increase upstream timeout** for Portainer routes.
4. **Register GHCR endpoint correctly** in Portainer:
   - Registry URL: `ghcr.io`
   - Username: your GitHub username/org
   - Password: GitHub PAT with `read:packages`
5. **Fallback without Portainer registry UI:**
   ```bash
   # Option A: build directly from source on the VPS (recommended)
   cd ~/app
   git pull origin main
   docker compose build --pull
   docker compose up -d

   # Option B: pull prebuilt private image from GHCR
   docker login ghcr.io -u YOUR_GITHUB_USER
   docker pull ghcr.io/YOUR_ORG/YOUR_IMAGE:latest
   docker compose up -d
   ```

If the image is private and you use GHCR pull flow, host-level `docker login ghcr.io` is required before pulling.

---

## Database Schema

The app uses Supabase (PostgreSQL) with these tables:
- `websites` - Tracked domains
- `crawl_sessions` - Crawl history
- `pages` - Crawled pages
- `seo_issues` - Detected SEO issues
- `integration_settings` - API credentials (encrypted)

Run the SQL migrations in `supabase/migrations/` to set up the schema.
