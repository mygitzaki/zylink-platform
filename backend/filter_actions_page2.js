const fs = require('fs');

// Read the Actions API response page 2
const data = JSON.parse(fs.readFileSync('creator_actions_page2.json', 'utf8'));
const actions = data.Actions || [];

// Filter actions from Aug 11 - Sep 10, 2025
const filteredActions = actions.filter(action => {
  const eventDate = new Date(action.EventDate);
  const startDate = new Date('2025-08-11T00:00:00Z');
  const endDate = new Date('2025-09-10T23:59:59Z');
  
  return eventDate >= startDate && eventDate <= endDate;
});

console.log(`Page 2 - Total actions in response: ${actions.length}`);
console.log(`Page 2 - Actions in date range (Aug 11 - Sep 10): ${filteredActions.length}`);

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

console.log(`Page 2 - Commissionable actions: ${commissionableActions}`);
console.log(`Page 2 - Total commission: $${totalCommission.toFixed(2)}`);
