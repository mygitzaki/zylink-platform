// Railway-specific script to add PaymentAccount.accountType column
// This script will be run on Railway to add the missing column

const { PrismaClient } = require('@prisma/client');

async function fixRailwayPaymentColumn() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Starting Railway PaymentAccount fix...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    // Check if column already exists
    const columnExists = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'PaymentAccount' AND column_name = 'accountType';
    `;
    
    if (columnExists.length > 0) {
      console.log('✅ Column already exists, no action needed');
      return;
    }
    
    console.log('❌ Column does not exist, adding it...');
    
    // Add the accountType column with default value
    await prisma.$executeRaw`
      ALTER TABLE "PaymentAccount" 
      ADD COLUMN "accountType" TEXT DEFAULT 'BANK_ACCOUNT';
    `;
    
    console.log('✅ Column added successfully');
    
    // Update existing records to have default account type
    const updateResult = await prisma.$executeRaw`
      UPDATE "PaymentAccount" 
      SET "accountType" = 'BANK_ACCOUNT' 
      WHERE "accountType" IS NULL;
    `;
    
    console.log('✅ Existing records updated:', updateResult);
    
    // Make the column NOT NULL
    await prisma.$executeRaw`
      ALTER TABLE "PaymentAccount" 
      ALTER COLUMN "accountType" SET NOT NULL;
    `;
    
    console.log('✅ Column set to NOT NULL');
    
    // Verify the fix
    const verification = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'PaymentAccount' AND column_name = 'accountType';
    `;
    
    console.log('✅ Verification:', verification);
    
    // Test actual query
    const testQuery = await prisma.paymentAccount.findMany({
      take: 1,
      select: { id: true, accountType: true }
    });
    
    console.log('✅ Test query successful:', testQuery);
    console.log('🎉 Railway PaymentAccount fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing Railway PaymentAccount:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixRailwayPaymentColumn();
