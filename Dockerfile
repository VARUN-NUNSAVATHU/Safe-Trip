# SafeTrip Production Multi-Stage Dockerfile
# Kalvium Engineering Concept: Containerization with Docker

# Stage 1: Build & Compile TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Copy server dependencies and configuration
COPY server/package*.json ./server/
COPY server/tsconfig.json ./server/

RUN cd server && npm ci

# Copy source code
COPY server/src ./server/src
COPY server/data ./server/data

# Build TypeScript to production JavaScript
RUN cd server && npm run build

# Stage 2: Production Lightweight Image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy compiled JavaScript from builder
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/data ./server/data

EXPOSE 5000

CMD ["node", "server/dist/index.js"]
