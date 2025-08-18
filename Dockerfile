# Multi-stage build for production
# FORCE REBUILD: Updated to ensure latest code is deployed
FROM node:18-slim AS builder

# Install build dependencies including Python and build tools
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    python3 \
    python3-pip \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

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
FROM node:18-slim AS production

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend
COPY --from=builder /app/backend ./backend

# Copy Prisma schema and migrations
COPY --from=builder /app/backend/prisma ./backend/prisma

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Expose port
EXPOSE 4000

# Start the application
CMD ["sh", "-c", "cd backend && npm start"]
