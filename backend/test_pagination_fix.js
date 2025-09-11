#!/usr/bin/env node

/**
 * Test script to verify the pagination fix
 */

const ImpactWebService = require('./src/services/impactWebService');

async function testPaginationFix() {
  console.log('🧪 Testing Pagination Fix...\n');
  
  const impact = new ImpactWebService();
  const testSubId1 = 'a2f43d61-b4fe-4c2c-8caa-72f2b43fc09b';
  const startDate = '2025-08-11T00:00:00Z';
  const endDate = '2025-09-10T23:59:59Z';
  
  try {
    console.log(`📊 Testing with SubId1: ${testSubId1}`);
    console.log(`📅 Date range: ${startDate} to ${endDate}\n`);
    
    // Test the fixed getAllActionsDetailed method
    const result = await impact.getAllActionsDetailed({
      startDate,
      endDate,
      subId1: testSubId1,
      actionType: 'SALE'
    });
    
    if (result.success) {
      console.log('✅ getAllActionsDetailed successful!');
      console.log(`📊 Total filtered actions: ${result.totalResults}`);
      console.log(`📊 Actions array length: ${result.actions.length}`);
      console.log(`📊 Total pages fetched: ${result.totalPages}`);
      
      if (result.actions.length > 0) {
        // Calculate total commission for this creator
        const totalCommission = result.actions.reduce((sum, action) => {
          const commission = parseFloat(action.Payout || action.Commission || 0);
          return sum + commission;
        }, 0);
        
        const netCommission = totalCommission * 0.9;
        
        console.log(`\n💰 Commission Analysis:`);
        console.log(`  Gross Commission: $${totalCommission.toFixed(2)}`);
        console.log(`  Net Commission (90%): $${netCommission.toFixed(2)}`);
        
        // Expected from Impact.com
        const expectedGross = 137.51;
        const expectedNet = 123.76;
        
        console.log(`\n🎯 Expected from Impact.com:`);
        console.log(`  Gross Commission: $${expectedGross}`);
        console.log(`  Net Commission (90%): $${expectedNet}`);
        
        console.log(`\n🔍 Comparison:`);
        console.log(`  Gross Match: ${Math.abs(totalCommission - expectedGross) < 0.01 ? '✅' : '❌'}`);
        console.log(`  Net Match: ${Math.abs(netCommission - expectedNet) < 0.01 ? '✅' : '❌'}`);
        
        if (Math.abs(totalCommission - expectedGross) < 0.01) {
          console.log('\n🎉 SUCCESS: Pagination fix working! All data fetched correctly.');
        } else {
          console.log('\n❌ ISSUE: Still missing data. Check pagination logic.');
        }
        
      } else {
        console.log('⚠️ No actions found for this creator in the specified date range');
      }
      
    } else {
      console.log('❌ getAllActionsDetailed failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPaginationFix().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});
