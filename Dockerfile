FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/.env ./.env

WORKDIR /app/server
RUN npm ci --production

WORKDIR /app

# Create a non-root user
RUN adduser -D appuser
USER appuser

ENV PORT=8001
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:8001/health || exit 1

CMD ["node", "server/index.js"]
