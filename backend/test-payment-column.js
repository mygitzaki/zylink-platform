// Test script to verify PaymentAccount.accountType column access
const { PrismaClient } = require('@prisma/client');

async function testPaymentColumn() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing PaymentAccount.accountType column access...');
    
    // Try to access the column
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'PaymentAccount' AND column_name = 'accountType';
    `;
    
    console.log('✅ Column info:', result);
    
    // Try to query actual data
    const accounts = await prisma.paymentAccount.findMany({
      take: 3,
      select: { id: true, accountType: true }
    });
    
    console.log('✅ Payment accounts with accountType:', accounts);
    
    // Test the specific query that's failing
    const testQuery = await prisma.paymentAccount.findMany({
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
    
    console.log('✅ Full query test:', testQuery);
    
  } catch (error) {
    console.error('❌ Error testing payment column:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
  } finally {
    await prisma.$disconnect();
  }
}

testPaymentColumn();
