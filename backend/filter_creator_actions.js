const fs = require('fs');

// Read the Actions API response
const data = JSON.parse(fs.readFileSync('creator_actions_detailed.json', 'utf8'));
const actions = data.Actions || [];

// Filter for specific creator only
const creatorSubId1 = 'a2f43d61-b4fe-4c2c-8caa-72f2b43fc09b';
const creatorActions = actions.filter(action => action.SubId1 === creatorSubId1);

console.log(`Total actions in response: ${actions.length}`);
console.log(`Actions for creator ${creatorSubId1}: ${creatorActions.length}`);

// Filter actions from Aug 11 - Sep 10, 2025
const filteredActions = creatorActions.filter(action => {
  const eventDate = new Date(action.EventDate);
  const startDate = new Date('2025-08-11T00:00:00Z');
  const endDate = new Date('2025-09-10T23:59:59Z');
  
  return eventDate >= startDate && eventDate <= endDate;
});

console.log(`Creator actions in date range (Aug 11 - Sep 10): ${filteredActions.length}`);

// Calculate commission for filtered actions
let totalCommission = 0;
let commissionableActions = 0;

filteredActions.forEach(action => {
  const payout = parseFloat(action.Payout || 0);
  if (payout > 0) {
    totalCommission += payout;
    commissionableActions++;
  }
});

console.log(`Creator commissionable actions: ${commissionableActions}`);
console.log(`Creator total commission: $${totalCommission.toFixed(2)}`);

// Show sample actions
console.log('\nSample creator actions:');
filteredActions.slice(0, 5).forEach((action, i) => {
  console.log(`${i+1}. Date: ${action.EventDate}, Payout: $${action.Payout}, Amount: $${action.Amount}`);
});
