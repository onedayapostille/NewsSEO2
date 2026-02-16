# Bolt Deployment Guide

This project is configured for single-command deployment on Bolt hosting.

## Quick Start

The entire application (frontend + backend) deploys with:

```bash
npm start
```

## Architecture

- **Frontend:** React + Vite (builds to `/dist`)
- **Backend:** Express.js (serves API + static files)
- **Single Server:** Backend serves both API routes and frontend
- **Port:** Dynamically assigned via `process.env.PORT` (defaults to 3001)

## Deployment Process

### Automatic (Bolt)

Bolt will automatically run:

1. `npm install` - Installs all dependencies
2. `npm run build` (if configured) - Builds frontend and backend
3. `npm start` - Starts the server

### Manual Deployment

```bash
# 1. Build everything
npm run build

# 2. Start the server
npm start
```

## Build Scripts

```json
{
  "build": "npm install && npm run build:client && npm run build:server",
  "build:client": "vite build",
  "build:server": "cd server && npm install",
  "start": "node server/index.js"
}
```

## Server Configuration

The Express server (`server/index.js`):

1. **Serves API routes** under `/api/*`
2. **Serves health check** at `/health`
3. **Serves static frontend** from `/dist` directory
4. **SPA fallback** - All other routes serve `index.html`
5. **Dynamic port** - Listens on `process.env.PORT` (Bolt assigns this)

## Environment Variables

Required:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

Optional (for integrations):
- `PAGESPEED_API_KEY`
- `OPENAI_API_KEY`
- `GSC_CLIENT_ID`, `GSC_CLIENT_SECRET`, `GSC_REDIRECT_URI`
- `MOZ_ACCESS_ID`, `MOZ_SECRET_KEY`

The server will start even if these are missing (degraded mode).

## Routes

### API Routes (JSON responses)
- `GET /health` - Health check endpoint
- `GET /api/diagnostics` - System diagnostics
- `GET /api/websites` - Website management
- `POST /api/websites` - Add website
- `GET /api/crawl/:websiteId` - Crawl website
- `GET /api/gsc/*` - Google Search Console integration
- `GET /api/moz/*` - Moz API integration
- `GET /api/monitoring/*` - Performance monitoring
- `POST /api/integrations/*` - Integration settings

### Frontend Routes (HTML responses)
- `GET /` - React SPA (index.html)
- `GET /websites/:id` - React SPA (index.html)
- `GET /*` - React SPA fallback (index.html)

## Health Check

```bash
curl http://localhost:3001/health
```

Returns:
```json
{
  "status": "healthy",
  "backend": "ok",
  "database": "connected",
  "timestamp": "2024-02-16T...",
  "uptime": 123,
  "version": "1.0.0"
}
```

## Deployment Checklist

- [x] Server uses `process.env.PORT` (no hardcoded ports)
- [x] Frontend builds to `/dist`
- [x] Backend serves static files from `/dist`
- [x] SPA fallback route configured
- [x] API routes under `/api/*` prefix
- [x] Health endpoint returns 200
- [x] Graceful handling of missing database
- [x] Single `npm start` command deployment
- [x] Non-fatal configuration validation

## Testing Deployment Locally

```bash
# Build and start
npm run build
npm start

# In another terminal, test endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/diagnostics
curl http://localhost:3001/

# Should see:
# - /health returns JSON
# - /api/* returns JSON
# - / returns HTML
```

## Troubleshooting

### Frontend not loading

**Issue:** Getting 404 for frontend routes

**Solution:**
```bash
# Ensure frontend is built
npm run build:client

# Check dist exists
ls dist/

# Restart server
npm start
```

### Database not connected

**Issue:** `"database": "unknown"` in health check

**Solution:**
- Check `VITE_SUPABASE_URL` is set
- Check `VITE_SUPABASE_ANON_KEY` is set
- Verify Supabase project is accessible

**Note:** Server will still start and serve frontend even without database.

### Port already in use

**Issue:** `Error: listen EADDRINUSE: address already in use`

**Solution:**
```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# Or let Bolt assign a different port automatically
```

## Production Considerations

1. **Environment Variables:** Set all variables in Bolt dashboard
2. **HTTPS:** Bolt handles SSL automatically
3. **Database:** Ensure Supabase URL is accessible from Bolt
4. **Monitoring:** Use `/health` endpoint for uptime checks
5. **Logs:** Server logs to stdout (Bolt captures this)

## Performance

- **Cold Start:** ~2-3 seconds (backend initialization)
- **Static Files:** Served via Express (cached by browser)
- **API Response:** ~50-200ms (depending on database query)
- **Build Time:** ~6-10 seconds (Vite build)

## Support

For deployment issues:
1. Check `/health` endpoint
2. Check `/api/diagnostics` endpoint
3. View server logs in Bolt dashboard
4. Verify environment variables are set

---

**Deployment Status:** ✅ Ready for Bolt
**Last Updated:** 2024-02-16
