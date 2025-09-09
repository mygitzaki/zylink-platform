const { PrismaClient } = require('@prisma/client');

// Database configuration for Supabase with optimized connection pooling
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
    errorFormat: 'pretty',
    datasourceUrl: process.env.DATABASE_URL
  });

  return client;
};

// Global prisma instance with connection management
let prismaInstance = null;
let connectionCount = 0;
const MAX_CONNECTIONS = 3; // Reduced from 5 to be more conservative

const getPrisma = () => {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL not set, using in-memory store');
    return null;
  }

  if (!prismaInstance) {
    try {
      prismaInstance = createPrismaClient();
      console.log('✅ Prisma client created (connection will be established on first use)');
      
      // Add process exit handler for cleanup
      process.on('beforeExit', async () => {
        console.log('🔄 Process exiting, closing database connection...');
        await prismaInstance.$disconnect();
      });
      
    } catch (error) {
      console.error('❌ Failed to create Prisma client:', error.message);
      prismaInstance = null;
    }
  }

  return prismaInstance;
};

const closePrisma = async () => {
  if (prismaInstance) {
    try {
      await prismaInstance.$disconnect();
      prismaInstance = null;
      connectionCount = 0;
      console.log('✅ Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database connection:', error.message);
    }
  }
};

// Connection management to prevent pool exhaustion
const withConnection = async (operation) => {
  if (connectionCount >= MAX_CONNECTIONS) {
    console.warn('⚠️  Connection pool limit reached, waiting...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  connectionCount++;
  
  try {
    const result = await operation();
    return result;
  } finally {
    connectionCount--;
  }
};

// Health check function with connection management
const checkDatabaseHealth = async () => {
  try {
    const prisma = getPrisma();
    if (!prisma) return { status: 'disconnected', message: 'No database configuration' };
    
    return await withConnection(async () => {
      await prisma.$queryRaw`SELECT 1 as health_check`;
      return { status: 'healthy', message: 'Database connection is working' };
    });
  } catch (error) {
    return { 
      status: 'unhealthy', 
      message: `Database connection failed: ${error.message}`,
      error: error.message 
    };
  }
};

module.exports = { 
  getPrisma, 
  closePrisma, 
  checkDatabaseHealth,
  createPrismaClient,
  withConnection 
};
