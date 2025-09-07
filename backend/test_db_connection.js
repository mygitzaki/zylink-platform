const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Check if V2 tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%v2%'
    `;
    
    console.log('📋 V2 Tables found:', tables);
    
    // Test V2 table access
    try {
      const shortLinks = await prisma.shortLinkV2.findMany({ take: 1 });
      console.log('✅ shortLinkV2 table accessible');
    } catch (error) {
      console.error('❌ shortLinkV2 table error:', error.message);
    }
    
    try {
      const links = await prisma.linkV2.findMany({ take: 1 });
      console.log('✅ linkV2 table accessible');
    } catch (error) {
      console.error('❌ linkV2 table error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
