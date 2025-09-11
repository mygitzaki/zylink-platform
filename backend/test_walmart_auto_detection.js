#!/usr/bin/env node

/**
 * Test script to verify Walmart auto-detection fixes
 */

const LinkGeneratorV2 = require('./src/services/linkGeneratorV2');

async function testWalmartAutoDetection() {
  console.log('🧪 Testing Walmart Auto-Detection Fixes...\n');
  
  const linkGenerator = new LinkGeneratorV2();
  
  // Test URLs
  const testUrls = [
    'https://www.walmart.com/products/item',
    'https://walmart.com/products/item',
    'https://www.walmart.com/ip/some-product/123456',
    'https://www.amazon.com/products/item', // Should not detect Walmart
    'https://www.target.com/products/item'  // Should not detect Walmart
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`\n🔍 Testing URL: ${url}`);
      const detectedBrand = await linkGenerator.detectBrandFromUrl(url);
      
      if (detectedBrand) {
        console.log(`✅ Detected brand: ${detectedBrand.displayName} (${detectedBrand.name})`);
        console.log(`   Program ID: ${detectedBrand.impactProgramId || 'Using default'}`);
      } else {
        console.log(`❌ No brand detected`);
      }
    } catch (error) {
      console.log(`💥 Error: ${error.message}`);
    }
  }
  
  console.log('\n🏁 Test completed');
}

// Run the test
testWalmartAutoDetection().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});
