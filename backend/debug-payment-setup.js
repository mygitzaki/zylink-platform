// Debug script to test payment setup endpoint
const { getPrisma } = require('./src/utils/prisma');

async function debugPaymentSetup() {
  try {
    console.log('🔍 Debugging payment setup endpoint...');
    
    // Test getPrisma function
    const prisma = getPrisma();
    console.log('✅ getPrisma() returned:', prisma ? 'Prisma client' : 'null');
    
    if (!prisma) {
      console.log('❌ No Prisma client - DATABASE_URL issue');
      return;
    }
    
    // Test database connection
    try {
      await prisma.$queryRaw`SELECT 1 as test`;
      console.log('✅ Database connection working');
    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
      return;
    }
    
    // Test PaymentAccount table access
    try {
      const tableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'PaymentAccount'
        ) as exists;
      `;
      console.log('✅ PaymentAccount table exists:', tableExists[0].exists);
    } catch (error) {
      console.log('❌ PaymentAccount table check failed:', error.message);
      return;
    }
    
    // Test accountType column access
    try {
      const columnExists = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'PaymentAccount' AND column_name = 'accountType';
      `;
      console.log('✅ accountType column info:', columnExists);
    } catch (error) {
      console.log('❌ accountType column check failed:', error.message);
      return;
    }
    
    // Test actual query that's failing
    try {
      const paymentAccounts = await prisma.paymentAccount.findMany({
        take: 1,
        select: { id: true, accountType: true }
      });
      console.log('✅ PaymentAccount query successful:', paymentAccounts);
    } catch (error) {
      console.log('❌ PaymentAccount query failed:', error.message);
      console.log('Error details:', {
        name: error.name,
        code: error.code,
        meta: error.meta
      });
    }
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  } finally {
    const prisma = getPrisma();
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

debugPaymentSetup();
