# Use Node.js 18 Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/

# Install backend dependencies
RUN cd backend && npm install

# Copy backend source code
COPY backend ./backend

# Generate Prisma client
RUN cd backend && npx prisma generate

# Expose port
EXPOSE 4000

# Start the application
CMD ["sh", "-c", "cd backend && npm start"]
