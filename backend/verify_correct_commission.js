#!/usr/bin/env node

/**
 * Script to verify the correct commission amount from Impact.com
 */

const fs = require('fs');

async function verifyCorrectCommission() {
  console.log('🔍 Verifying Correct Commission from Impact.com...\n');
  
  try {
    // Read the Actions API response
    const actionsData = JSON.parse(fs.readFileSync('creator_actions_correct.json', 'utf8'));
    
    console.log(`📊 API Response Summary:`);
    console.log(`  Total Actions: ${actionsData.Actions?.length || 0}`);
    console.log(`  Total Pages: ${actionsData['@numpages']}`);
    console.log(`  Total Results: ${actionsData['@total']}\n`);
    
    if (!actionsData.Actions || actionsData.Actions.length === 0) {
      console.log('❌ No actions found in API response');
      return;
    }
    
    // Filter for the specific creator
    const creatorSubId1 = 'a2f43d61-b4fe-4c2c-8caa-72f2b43fc09b';
    const creatorActions = actionsData.Actions.filter(action => 
      action.SubId1 === creatorSubId1
    );
    
    console.log(`🎯 Creator Actions Found: ${creatorActions.length}`);
    
    if (creatorActions.length === 0) {
      console.log('❌ No actions found for this creator');
      return;
    }
    
    // Calculate totals
    let totalCommission = 0;
    let totalSales = 0;
    let commissionableActions = 0;
    
    console.log('\n🔍 Commissionable Actions:');
    creatorActions.forEach((action, index) => {
      const commission = parseFloat(action.Payout || action.Commission || 0);
      const sales = parseFloat(action.Amount || action.SaleAmount || action.IntendedAmount || 0);
      
      if (commission > 0) {
        totalCommission += commission;
        commissionableActions++;
        console.log(`  ${commissionableActions}. Commission: $${commission}, Sales: $${sales}, Date: ${action.EventDate?.split('T')[0]}`);
      }
      
      totalSales += sales;
    });
    
    // Calculate with 90% commission rate
    const netCommission = totalCommission * 0.9;
    
    console.log(`\n📊 CALCULATED TOTALS:`);
    console.log(`  Total Sales: $${totalSales.toFixed(2)}`);
    console.log(`  Gross Commission: $${totalCommission.toFixed(2)}`);
    console.log(`  Net Commission (90%): $${netCommission.toFixed(2)}`);
    console.log(`  Commissionable Actions: ${commissionableActions}`);
    
    // Expected from Impact.com
    const expectedGrossCommission = 137.51;
    const expectedNetCommission = 137.51 * 0.9; // 123.76
    
    console.log(`\n🎯 EXPECTED FROM IMPACT.COM:`);
    console.log(`  Gross Commission: $${expectedGrossCommission}`);
    console.log(`  Net Commission (90%): $${expectedNetCommission.toFixed(2)}`);
    
    console.log(`\n🔍 COMPARISON:`);
    console.log(`  Gross Commission Match: ${Math.abs(totalCommission - expectedGrossCommission) < 0.01 ? '✅' : '❌'} (${totalCommission.toFixed(2)} vs ${expectedGrossCommission})`);
    console.log(`  Net Commission Match: ${Math.abs(netCommission - expectedNetCommission) < 0.01 ? '✅' : '❌'} (${netCommission.toFixed(2)} vs ${expectedNetCommission.toFixed(2)})`);
    
    // Screenshot data for comparison
    const screenshotData = {
      sales: 3047.64,
      commissions: 97.32,
      clicks: 2611,
      conversion: 1.61
    };
    
    console.log(`\n📱 SCREENSHOT DATA:`);
    console.log(`  Commissions: $${screenshotData.commissions}`);
    
    console.log(`\n❓ DISCREPANCY ANALYSIS:`);
    console.log(`  External API Gross: $${totalCommission.toFixed(2)}`);
    console.log(`  Expected Gross: $${expectedGrossCommission}`);
    console.log(`  Screenshot Net: $${screenshotData.commissions}`);
    console.log(`  Calculated Net: $${netCommission.toFixed(2)}`);
    console.log(`  Expected Net: $${expectedNetCommission.toFixed(2)}`);
    
    const discrepancy = expectedNetCommission - screenshotData.commissions;
    console.log(`\n💡 MISSING COMMISSION: $${discrepancy.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the verification
verifyCorrectCommission().then(() => {
  console.log('\n🏁 Verification completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Verification crashed:', error);
  process.exit(1);
});
