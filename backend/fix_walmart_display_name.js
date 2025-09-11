const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixWalmartDisplayName() {
  try {
    console.log('🔧 Fixing Walmart display name...\n');
    
    // Find the Walmart brand (could be "walmart" or "walmart creator")
    const walmartBrand = await prisma.brandConfig.findFirst({
      where: {
        OR: [
          { name: 'walmart' },
          { name: 'walmart creator' },
          { displayName: { contains: 'walmart', mode: 'insensitive' } }
        ]
      }
    });
    
    if (!walmartBrand) {
      console.log('❌ Walmart brand not found in database');
      return;
    }
    
    console.log(`📋 Found Walmart brand:`);
    console.log(`   ID: ${walmartBrand.id}`);
    console.log(`   Name: "${walmartBrand.name}"`);
    console.log(`   Current Display Name: "${walmartBrand.displayName}"`);
    console.log(`   Program ID: ${walmartBrand.impactProgramId}`);
    
    // Update the display name to just "Walmart"
    const updated = await prisma.brandConfig.update({
      where: { id: walmartBrand.id },
      data: { displayName: 'Walmart' }
    });
    
    console.log(`\n✅ SUCCESS! Updated display name to: "${updated.displayName}"`);
    console.log('🎉 Users will now see "Walmart" instead of "Walmart Creator"!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixWalmartDisplayName();
