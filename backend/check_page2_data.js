#!/usr/bin/env node

/**
 * Script to check page 2 data for missing commission
 */

const fs = require('fs');

async function checkPage2Data() {
  console.log('🔍 Checking Page 2 Data for Missing Commission...\n');
  
  try {
    // Read both pages
    const page1Data = JSON.parse(fs.readFileSync('creator_actions_correct.json', 'utf8'));
    const page2Data = JSON.parse(fs.readFileSync('creator_actions_page2.json', 'utf8'));
    
    console.log(`📊 Page 1: ${page1Data.Actions?.length || 0} actions`);
    console.log(`📊 Page 2: ${page2Data.Actions?.length || 0} actions`);
    
    // Combine both pages
    const allActions = [...(page1Data.Actions || []), ...(page2Data.Actions || [])];
    console.log(`📊 Total Actions: ${allActions.length}`);
    
    // Filter for the specific creator
    const creatorSubId1 = 'a2f43d61-b4fe-4c2c-8caa-72f2b43fc09b';
    const creatorActions = allActions.filter(action => 
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
    
    console.log('\n🔍 All Commissionable Actions:');
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
    
    console.log(`\n📊 CALCULATED TOTALS (Both Pages):`);
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
      commissions: 97.32
    };
    
    console.log(`\n📱 SCREENSHOT DATA:`);
    console.log(`  Commissions: $${screenshotData.commissions}`);
    
    console.log(`\n❓ DISCREPANCY ANALYSIS:`);
    console.log(`  External API Gross (Both Pages): $${totalCommission.toFixed(2)}`);
    console.log(`  Expected Gross: $${expectedGrossCommission}`);
    console.log(`  Screenshot Net: $${screenshotData.commissions}`);
    console.log(`  Calculated Net: $${netCommission.toFixed(2)}`);
    console.log(`  Expected Net: $${expectedNetCommission.toFixed(2)}`);
    
    const missingCommission = expectedGrossCommission - totalCommission;
    console.log(`\n💡 MISSING COMMISSION: $${missingCommission.toFixed(2)}`);
    
    if (Math.abs(totalCommission - expectedGrossCommission) < 0.01) {
      console.log('\n✅ SUCCESS: All commission data found!');
    } else {
      console.log('\n❌ ISSUE: Still missing commission data');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the check
checkPage2Data().then(() => {
  console.log('\n🏁 Check completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Check crashed:', error);
  process.exit(1);
});
