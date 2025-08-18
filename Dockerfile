# Multi-stage build for production
# FORCE REBUILD: Updated to ensure latest code is deployed
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Copy Prisma schema first (needed for postinstall script)
COPY backend/prisma ./backend/prisma

# Install backend dependencies
RUN cd backend && npm install

# Copy remaining backend source code
COPY backend ./backend

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy backend
COPY --from=builder /app/backend ./backend

# Copy Prisma schema and migrations
COPY --from=builder /app/backend/prisma ./backend/prisma

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "backend/server.js"]
