# Use Node.js 18 slim image (better Prisma compatibility)
FROM node:18-slim

# Install OpenSSL and other required dependencies for Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/

# Install backend dependencies
RUN cd backend && npm install

# Copy backend source code
COPY backend ./backend

# Generate Prisma client for the correct platform
RUN cd backend && npx prisma generate

# Expose port
EXPOSE 4000

# Start the application
CMD ["sh", "-c", "cd backend && npm start"]
