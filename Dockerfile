# Multi-stage production build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configuration
COPY package.json ./

# Copy and build client
COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

# Copy and install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy server code and installed production modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json ./package.json

# Copy built frontend assets
COPY --from=builder /app/client/dist ./client/dist

# Expose server port
EXPOSE 5000

# Start server
CMD ["node", "server/src/server.js"]
