#!/usr/bin/env node

/**
 * Debug script to test Walmart auto-detection
 */

const LinkGeneratorV2 = require('./src/services/linkGeneratorV2');
const { getPrisma } = require('./src/utils/prisma');

async function debugWalmartDetection() {
  console.log('🔍 Debugging Walmart Auto-Detection...\n');
  
  try {
    const prisma = getPrisma();
    if (!prisma) {
      console.log('❌ Database not available');
      return;
    }

    // Check all brands in database
    console.log('📊 All brands in database:');
    const allBrands = await prisma.brandConfig.findMany({
      where: { isActive: true }
    });
    
    allBrands.forEach(brand => {
      console.log(`  - ${brand.displayName} (${brand.name}) - Program ID: ${brand.impactProgramId || 'NULL'} - Active: ${brand.isActive}`);
    });
    
    console.log(`\n📊 Total brands: ${allBrands.length}`);
    
    // Check Walmart specifically
    const walmartBrand = allBrands.find(brand => brand.name === 'walmart');
    if (walmartBrand) {
      console.log(`\n✅ Walmart found in database:`);
      console.log(`  - Name: ${walmartBrand.name}`);
      console.log(`  - Display Name: ${walmartBrand.displayName}`);
      console.log(`  - Program ID: ${walmartBrand.impactProgramId || 'NULL'}`);
      console.log(`  - Active: ${walmartBrand.isActive}`);
    } else {
      console.log(`\n❌ Walmart NOT found in database`);
    }
    
    // Test the filtering logic
    console.log(`\n🔍 Testing brand filtering logic:`);
    const brands = allBrands.filter(brand => {
      // Include brands with valid impactProgramId
      if (brand.impactProgramId && brand.impactProgramId !== null && brand.impactProgramId !== '') {
        return true;
      }
      // Include brands that can use the default program ID (like Walmart)
      if (brand.name === 'walmart' && process.env.IMPACT_PROGRAM_ID) {
        return true;
      }
      return false;
    });
    
    console.log(`📊 Filtered brands: ${brands.length}`);
    brands.forEach(brand => {
      const programId = brand.impactProgramId || (brand.name === 'walmart' ? process.env.IMPACT_PROGRAM_ID : 'none');
      console.log(`  - ${brand.displayName} (${brand.name}) - Program ID: ${programId}`);
    });
    
    // Test URL detection
    console.log(`\n🔍 Testing URL detection:`);
    const linkGenerator = new LinkGeneratorV2();
    
    const testUrls = [
      'https://www.walmart.com/products/item',
      'https://walmart.com/products/item',
      'https://www.walmart.com/ip/some-product/123456'
    ];
    
    for (const url of testUrls) {
      console.log(`\n🔍 Testing: ${url}`);
      try {
        const detectedBrand = await linkGenerator.detectBrandFromUrl(url);
        if (detectedBrand) {
          console.log(`✅ Detected: ${detectedBrand.displayName} (${detectedBrand.name})`);
        } else {
          console.log(`❌ No brand detected`);
        }
      } catch (error) {
        console.log(`💥 Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugWalmartDetection().then(() => {
  console.log('\n🏁 Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Debug crashed:', error);
  process.exit(1);
});
