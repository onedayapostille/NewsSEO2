# syntax=docker/dockerfile:1

FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY index.html ./
COPY tsconfig*.json ./
COPY vite.config.* ./
COPY src ./src

RUN npm run build:client

FROM node:20-alpine AS backend-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=backend-deps /app/server/node_modules ./server/node_modules
COPY server ./server
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 3001
CMD ["node", "server/index.js"]
