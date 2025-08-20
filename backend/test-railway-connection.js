// Test script to verify Railway database connection
const { getPrisma } = require('./src/utils/prisma');

async function testRailwayConnection() {
  try {
    console.log('🧪 Testing Railway database connection...');
    
    // Test getPrisma function
    const prisma = getPrisma();
    console.log('✅ getPrisma() returned:', prisma ? 'Prisma client' : 'null');
    
    if (!prisma) {
      console.log('❌ No Prisma client - DATABASE_URL issue');
      return;
    }
    
    // Test basic database connection
    try {
      console.log('🔍 Testing basic database connection...');
      await prisma.$queryRaw`SELECT 1 as test`;
      console.log('✅ Basic database connection working');
    } catch (error) {
      console.log('❌ Basic database connection failed:', error.message);
      return;
    }
    
    // Test PaymentAccount table access
    try {
      console.log('🔍 Testing PaymentAccount table access...');
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
      console.log('🔍 Testing accountType column access...');
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
    
    // Test the exact query that's failing in payment-setup
    try {
      console.log('🔍 Testing exact payment-setup query...');
      const paymentAccount = await prisma.paymentAccount.findUnique({
        where: { creatorId: 'd8fcd9c3-28cf-4ab6-9f3b-e80e36d77d90' }
      });
      console.log('✅ Payment account query successful:', paymentAccount ? 'Found' : 'Not found');
      if (paymentAccount) {
        console.log('✅ Account details:', {
          id: paymentAccount.id,
          accountType: paymentAccount.accountType,
          hasAccountDetails: !!paymentAccount.accountDetails
        });
      }
    } catch (error) {
      console.log('❌ Payment account query failed:', error.message);
      console.log('❌ Error details:', {
        name: error.name,
        code: error.code,
        meta: error.meta
      });
    }
    
    // Test the admin payment accounts query
    try {
      console.log('🔍 Testing admin payment accounts query...');
      const paymentAccounts = await prisma.paymentAccount.findMany({
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true
            }
          }
        },
        take: 1
      });
      console.log('✅ Admin payment accounts query successful, found:', paymentAccounts.length);
    } catch (error) {
      console.log('❌ Admin payment accounts query failed:', error.message);
      console.log('❌ Error details:', {
        name: error.name,
        code: error.code,
        meta: error.meta
      });
    }
    
  } catch (error) {
    console.error('❌ Test script error:', error);
  } finally {
    const prisma = getPrisma();
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

testRailwayConnection();
