# Deployment Guide

This project is deployed as **one service**: Express serves both API (`/api/*`) and the built frontend (`/dist`) with SPA fallback.

## 1) Production architecture

- Container image: `ghcr.io/<owner>/newsseo`
- Runtime process: `node server/index.js`
- Port: `process.env.PORT` (default `3001`)
- Health check: `GET /health`
- Diagnostics: `GET /api/diagnostics`

## 2) Required environment variables

Copy `.env.example` to `.env` and set values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `PORT` (default `3001`)
- Feature flags: `ENABLE_MOZ`, `ENABLE_GSC`, `ENABLE_OPENAI`
- Integration credentials (optional):
  - `MOZ_ACCESS_ID`, `MOZ_SECRET_KEY`
  - `GSC_CLIENT_ID`, `GSC_CLIENT_SECRET`, `GSC_REDIRECT_URI`
  - `OPENAI_API_KEY`, `OPENAI_MODEL`
- For compose image source:
  - `GHCR_OWNER` (your GitHub org/user)
  - `IMAGE_TAG` (`latest` by default)

## 3) GitHub Actions CI/CD

### A. Build + push to GHCR
Workflow file: `.github/workflows/docker-build.yml`

Trigger: push to `main`

Pushes:
- `ghcr.io/<owner>/newsseo:latest`
- `ghcr.io/<owner>/newsseo:<sha>`

### B. Deploy to VPS over SSH (no Portainer)
Workflow file: `.github/workflows/deploy-vps.yml`

Trigger: after successful build workflow on `main`

Remote deploy commands:
- `docker login ghcr.io`
- `docker compose pull`
- `docker compose up -d`
- `curl -fsS http://localhost:$PORT/health`

### Required GitHub Secrets

- `VPS_HOST`
- `VPS_USER`
- `VPS_PORT`
- `VPS_SSH_KEY`
- `GHCR_PAT` (optional; needed only if default token permissions are insufficient)
- `GHCR_USER` (optional)

## 4) VPS setup (primary)

On your server:

```bash
sudo mkdir -p /opt/newsseo
cd /opt/newsseo
```

Copy from repo to VPS:
- `docker-compose.yml`
- `.env` (from `.env.example`, filled with real values)

Then deploy:

```bash
docker compose pull
docker compose up -d
curl http://localhost:3001/health
```

## 5) Secondary alternatives

### Railway
- Create a new project from this GitHub repo.
- Deploy using Dockerfile.
- Set all env vars from `.env.example`.
- Health check path: `/health`.

### Render
- Create a Web Service from this repo.
- Use Docker deployment.
- Set all env vars from `.env.example`.
- Health check path: `/health`.

### Cloud Run

```bash
gcloud run deploy newsseo \
  --image ghcr.io/<owner>/newsseo:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars PORT=3001,NODE_ENV=production
```

## 6) Integration settings API verification

Manual checks:

```bash
curl http://localhost:3001/api/integrations
curl -X POST http://localhost:3001/api/integrations \
  -H 'Content-Type: application/json' \
  -d '{"provider":"openai","isEnabled":false,"config":{"apiKey":"sk-...","model":"gpt-4o-mini"}}'
curl -X POST http://localhost:3001/api/integrations/test \
  -H 'Content-Type: application/json' \
  -d '{"provider":"openai","config":{"apiKey":"sk-...","model":"gpt-4o-mini"}}'
```

Secrets are masked in API responses.
