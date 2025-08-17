const { PrismaClient } = require('@prisma/client');

// Database configuration for Supabase with transaction pooler
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
    errorFormat: 'pretty',
    datasourceUrl: process.env.DATABASE_URL,
  });

  return client;
};

// Global prisma instance
let prismaInstance = null;

const getPrisma = () => {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL not set, using in-memory store');
    return null;
  }

  if (!prismaInstance) {
    try {
      prismaInstance = createPrismaClient();
      console.log('✅ Prisma client created (connection will be established on first use)');
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
      console.log('✅ Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database connection:', error.message);
    }
  }
};

// Health check function - only connects when explicitly called
const checkDatabaseHealth = async () => {
  try {
    const prisma = getPrisma();
    if (!prisma) return { status: 'disconnected', message: 'No database configuration' };
    
    // Only test connection when explicitly requested
    await prisma.$queryRaw`SELECT 1 as health_check`;
    return { status: 'healthy', message: 'Database connection is working' };
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
  createPrismaClient 
};
