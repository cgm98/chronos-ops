# Stage 1: Build Vue SPA frontend
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY vite.config.ts tsconfig.json ./
COPY frontend ./frontend
RUN npm run build

# Stage 2: Production runner with Express backend
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY backend ./backend
COPY tsconfig.json ./
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/db && chown -R node:node /app
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DB_PATH=/app/db/chronos.db
EXPOSE 3000
CMD ["npx", "tsx", "backend/src/server.ts"]

