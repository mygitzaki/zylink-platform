const fs = require('fs');

// Read the Actions API response
const data = JSON.parse(fs.readFileSync('creator_actions_detailed.json', 'utf8'));
const actions = data.Actions || [];

// Filter actions from Aug 11 - Sep 10, 2025
const filteredActions = actions.filter(action => {
  const eventDate = new Date(action.EventDate);
  const startDate = new Date('2025-08-11T00:00:00Z');
  const endDate = new Date('2025-09-10T23:59:59Z');
  
  return eventDate >= startDate && eventDate <= endDate;
});

console.log(`Total actions in response: ${actions.length}`);
console.log(`Actions in date range (Aug 11 - Sep 10): ${filteredActions.length}`);

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

console.log(`Commissionable actions: ${commissionableActions}`);
console.log(`Total commission: $${totalCommission.toFixed(2)}`);

// Show sample actions
console.log('\nSample actions:');
filteredActions.slice(0, 5).forEach((action, i) => {
  console.log(`${i+1}. Date: ${action.EventDate}, Payout: $${action.Payout}, Amount: $${action.Amount}`);
});
