FROM node:18-alpine AS builder
WORKDIR /app

# Optional frontend build-time variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
RUN if [ -f package-lock.json ]; then npm ci || npm install; else npm install; fi

COPY . .
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

COPY server/package.json server/package-lock.json ./server/
WORKDIR /app/server
RUN if [ -f package-lock.json ]; then npm ci --omit=dev || npm install --omit=dev; else npm install --omit=dev; fi

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY server ./server

# Create a non-root user
RUN adduser -D appuser
USER appuser

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "server/index.js"]
