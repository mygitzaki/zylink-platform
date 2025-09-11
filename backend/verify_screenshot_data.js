#!/usr/bin/env node

/**
 * Script to verify the screenshot data against external API
 */

const fs = require('fs');

async function verifyScreenshotData() {
  console.log('🔍 Verifying Screenshot Data Against External API...\n');
  
  try {
    // Read the Actions API response
    const actionsData = JSON.parse(fs.readFileSync('creator_actions_verification.json', 'utf8'));
    
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
    
    creatorActions.forEach(action => {
      const commission = parseFloat(action.Payout || action.Commission || 0);
      const sales = parseFloat(action.Amount || action.SaleAmount || action.IntendedAmount || 0);
      
      if (commission > 0) {
        totalCommission += commission;
        commissionableActions++;
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
    
    // Screenshot data for comparison
    const screenshotData = {
      sales: 3047.64,
      commissions: 97.32,
      clicks: 2611,
      conversion: 1.61
    };
    
    console.log(`\n📱 SCREENSHOT DATA:`);
    console.log(`  Sales: $${screenshotData.sales}`);
    console.log(`  Commissions: $${screenshotData.commissions}`);
    console.log(`  Clicks: ${screenshotData.clicks}`);
    console.log(`  Conversion: ${screenshotData.conversion}%`);
    
    console.log(`\n🔍 COMPARISON:`);
    console.log(`  Sales Match: ${Math.abs(totalSales - screenshotData.sales) < 1 ? '✅' : '❌'} (${totalSales.toFixed(2)} vs ${screenshotData.sales})`);
    console.log(`  Commission Match: ${Math.abs(netCommission - screenshotData.commissions) < 1 ? '✅' : '❌'} (${netCommission.toFixed(2)} vs ${screenshotData.commissions})`);
    
    // Show sample actions
    console.log(`\n🔍 Sample Actions:`);
    creatorActions.slice(0, 5).forEach((action, i) => {
      const commission = parseFloat(action.Payout || action.Commission || 0);
      const sales = parseFloat(action.Amount || action.SaleAmount || action.IntendedAmount || 0);
      console.log(`  ${i+1}. Commission: $${commission}, Sales: $${sales}, Date: ${action.EventDate?.split('T')[0]}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the verification
verifyScreenshotData().then(() => {
  console.log('\n🏁 Verification completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Verification crashed:', error);
  process.exit(1);
});
