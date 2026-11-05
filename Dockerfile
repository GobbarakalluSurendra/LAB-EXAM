# Multi-stage Dockerfile for SmartLab
FROM node:20-alpine AS client-builder

WORKDIR /app

# Install client dependencies & build static assets
COPY client/package*.json ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN cd client && npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install server production dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --production

# Copy server source code and built client
COPY server/ ./server/
COPY --from=client-builder /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "server/server.js"]
