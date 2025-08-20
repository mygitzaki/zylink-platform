// Script to fix PaymentAccount.accountType column issue
const { PrismaClient } = require('@prisma/client');

async function fixPaymentAccount() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Starting PaymentAccount fix...');
    
    // Execute SQL to add the missing column
    const result = await prisma.$executeRaw`
      ALTER TABLE "PaymentAccount" 
      ADD COLUMN IF NOT EXISTS "accountType" TEXT DEFAULT 'BANK_ACCOUNT';
    `;
    
    console.log('✅ Column added successfully');
    
    // Update existing records
    const updateResult = await prisma.$executeRaw`
      UPDATE "PaymentAccount" 
      SET "accountType" = 'BANK_ACCOUNT' 
      WHERE "accountType" IS NULL;
    `;
    
    console.log('✅ Existing records updated');
    
    // Make column NOT NULL
    await prisma.$executeRaw`
      ALTER TABLE "PaymentAccount" 
      ALTER COLUMN "accountType" SET NOT NULL;
    `;
    
    console.log('✅ Column set to NOT NULL');
    
    // Verify the fix
    const accounts = await prisma.paymentAccount.findMany({
      take: 5,
      select: { id: true, accountType: true }
    });
    
    console.log('✅ Verification - Sample accounts:', accounts);
    console.log('🎉 PaymentAccount fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing PaymentAccount:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPaymentAccount();
