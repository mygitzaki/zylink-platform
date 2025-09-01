const { getPrisma } = require('./src/utils/prisma');

async function fixDatabaseSchema() {
  const prisma = getPrisma();
  if (!prisma) {
    console.log('⚠️ No database connection, skipping schema fix');
    return;
  }

  try {
    console.log('🔧 Checking database schema...');
    
    // Check if EarningsSnapshot table exists
    const snapshotTableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'EarningsSnapshot'
      );
    `;
    
    if (snapshotTableExists[0]?.exists) {
      console.log('✅ EarningsSnapshot table already exists');
    } else {
      console.log('🔧 Creating EarningsSnapshot table...');
      
      // Create EarningsSnapshot table manually
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "EarningsSnapshot" (
          "id" TEXT NOT NULL,
          "creatorId" TEXT NOT NULL,
          "linkId" TEXT,
          "originalAmount" DECIMAL(65,30) NOT NULL,
          "commissionRate" INTEGER NOT NULL,
          "grossAmount" DECIMAL(65,30) NOT NULL,
          "type" TEXT NOT NULL,
          "source" TEXT NOT NULL,
          "impactTransactionId" TEXT,
          "earnedAt" TIMESTAMP(3) NOT NULL,
          "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "rateEffectiveDate" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "EarningsSnapshot_pkey" PRIMARY KEY ("id")
        );
      `;
      
      // Create indexes
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "EarningsSnapshot_creatorId_earnedAt_idx" ON "EarningsSnapshot"("creatorId", "earnedAt");
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "EarningsSnapshot_earnedAt_idx" ON "EarningsSnapshot"("earnedAt");
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "EarningsSnapshot_source_idx" ON "EarningsSnapshot"("source");
      `;
      
      console.log('✅ EarningsSnapshot table created successfully');
    }
    
    // Check if EarningsReversal table exists
    const reversalTableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'EarningsReversal'
      );
    `;
    
    if (reversalTableExists[0]?.exists) {
      console.log('✅ EarningsReversal table already exists');
    } else {
      console.log('🔧 Creating EarningsReversal table...');
      
      // Create EarningsReversal table manually
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "EarningsReversal" (
          "id" TEXT NOT NULL,
          "creatorId" TEXT NOT NULL,
          "originalEarningId" TEXT,
          "originalSnapshotId" TEXT,
          "reversalAmount" DECIMAL(65,30) NOT NULL,
          "originalAmount" DECIMAL(65,30) NOT NULL,
          "netAdjustment" DECIMAL(65,30) NOT NULL,
          "reason" TEXT NOT NULL,
          "impactTransactionId" TEXT,
          "originalImpactId" TEXT,
          "originalCommissionRate" INTEGER NOT NULL,
          "reversalCommissionRate" INTEGER,
          "originalEarnedAt" TIMESTAMP(3) NOT NULL,
          "reversedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "EarningsReversal_pkey" PRIMARY KEY ("id")
        );
      `;
      
      // Create indexes
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "EarningsReversal_creatorId_reversedAt_idx" ON "EarningsReversal"("creatorId", "reversedAt");
      `;
      
      console.log('✅ EarningsReversal table created successfully');
    }
    
    console.log('🎉 Database schema fix completed successfully!');
    console.log('✅ Point-in-time earnings system now available');
    
  } catch (error) {
    console.error('❌ Database schema fix failed:', error.message);
    console.log('⚠️ Continuing with existing schema...');
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixDatabaseSchema().catch(console.error);
