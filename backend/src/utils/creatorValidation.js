// Creator Data Validation Utilities
// Ensures creators only see their own data and prevents data mixing

const crypto = require('crypto');

/**
 * Validate that SubId1 matches the expected creator
 * @param {string} actualSubId1 - SubId1 from Impact.com data
 * @param {string} expectedSubId1 - Expected SubId1 for this creator
 * @param {string} creatorId - Creator ID for logging
 * @returns {boolean} True if SubId1 matches
 */
function validateSubId1Match(actualSubId1, expectedSubId1, creatorId) {
  if (!actualSubId1 || !expectedSubId1) {
    console.warn(`[SubId1 Validation] Missing SubId1 data for creator ${creatorId}: actual=${actualSubId1}, expected=${expectedSubId1}`);
    return false;
  }
  
  const actualStr = actualSubId1.toString().trim();
  const expectedStr = expectedSubId1.toString().trim();
  
  const matches = actualStr === expectedStr;
  
  if (!matches) {
    console.error(`🚨 [SECURITY] SubId1 mismatch for creator ${creatorId}: got "${actualStr}", expected "${expectedStr}"`);
  }
  
  return matches;
}

/**
 * Filter Impact.com actions to only include data for the specified creator
 * @param {Array} actions - Array of Impact.com actions
 * @param {string} expectedSubId1 - Expected SubId1 for this creator
 * @param {string} creatorId - Creator ID for logging
 * @returns {Array} Filtered actions for this creator only
 */
function filterCreatorActions(actions, expectedSubId1, creatorId) {
  // SAFETY: Validate inputs
  if (!Array.isArray(actions)) {
    console.error(`[Creator Filter] SAFETY: actions is not an array: ${typeof actions}`);
    return [];
  }
  
  if (actions.length === 0) {
    return [];
  }
  
  if (!expectedSubId1 || !creatorId) {
    console.error(`[Creator Filter] SAFETY: Missing required parameters - expectedSubId1: ${expectedSubId1}, creatorId: ${creatorId}`);
    return [];
  }
  
  const originalCount = actions.length;
  console.log(`[Creator Filter] Processing ${originalCount} actions for creator ${creatorId} (SubId1: ${expectedSubId1})`);
  
  const creatorActions = actions.filter(action => {
    // SAFETY: Validate action object
    if (!action || typeof action !== 'object') {
      console.warn(`[Creator Filter] SAFETY: Invalid action object: ${action}`);
      return false;
    }
    
    try {
      // Try multiple SubId1 field variations from Impact.com
      const actionSubId1 = action.SubId1 || action.Subid1 || action.SubID1 || 
                          action.TrackingValue || action.pubsubid1_ || 
                          action['Sub ID 1'] || action.sub_id_1 || '';
      
      const isValid = validateSubId1Match(actionSubId1, expectedSubId1, creatorId);
      
      if (!isValid && actionSubId1) {
        console.warn(`[Creator Filter] Filtered out action ${action.Id || action.ActionId || 'unknown'} with SubId1: "${actionSubId1}"`);
      }
      
      return isValid;
    } catch (error) {
      console.error(`[Creator Filter] SAFETY: Error processing action ${action.Id || 'unknown'}: ${error.message}`);
      return false;
    }
  });
  
  const filteredCount = creatorActions.length;
  const blockedCount = originalCount - filteredCount;
  
  console.log(`[Creator Filter] Result: ${filteredCount} valid actions, ${blockedCount} blocked for creator ${creatorId}`);
  
  if (blockedCount > 0) {
    console.warn(`🛡️ [SECURITY] Blocked ${blockedCount} actions that didn't belong to creator ${creatorId}`);
  }
  
  return creatorActions;
}

/**
 * Validate creator's SubId1 mapping and get the correct SubId1
 * @param {Object} creator - Creator object from database
 * @param {Object} impactService - Impact.com service instance
 * @returns {Object} SubId1 validation result
 */
function validateAndGetSubId1(creator, impactService) {
  if (!creator || !creator.id) {
    return {
      isValid: false,
      subId1: null,
      error: 'Invalid creator data'
    };
  }
  
  let subId1;
  let source;
  
  // Try stored SubId1 first
  if (creator.impactSubId) {
    subId1 = creator.impactSubId;
    source = 'stored';
    console.log(`[SubId1 Validation] Using stored SubId1 for creator ${creator.id}: ${subId1}`);
  } else {
    // Fallback to computed SubId1
    if (!impactService) {
      return {
        isValid: false,
        subId1: null,
        error: 'Impact service not available for SubId1 computation'
      };
    }
    
    subId1 = impactService.computeObfuscatedSubId(creator.id);
    source = 'computed';
    console.log(`[SubId1 Validation] Using computed SubId1 for creator ${creator.id}: ${subId1}`);
    
    // Log warning about missing stored SubId1
    console.warn(`[SubId1 Validation] WARNING: No stored SubId1 for creator ${creator.id}, using computed value`);
  }
  
  // Validate SubId1 format
  if (!subId1 || subId1 === 'default' || subId1.toString().trim() === '') {
    return {
      isValid: false,
      subId1: null,
      error: `Invalid SubId1 generated: "${subId1}"`
    };
  }
  
  return {
    isValid: true,
    subId1: subId1.toString().trim(),
    source,
    creatorId: creator.id
  };
}

/**
 * Filter commissionable actions (commission > 0) for a creator
 * @param {Array} actions - Array of actions
 * @param {string} creatorId - Creator ID for logging
 * @returns {Array} Actions with commission > 0
 */
function filterCommissionableActions(actions, creatorId) {
  if (!Array.isArray(actions)) {
    return [];
  }
  
  const originalCount = actions.length;
  
  const commissionableActions = actions.filter(action => {
    const commission = parseFloat(action.Payout || action.Commission || 0);
    return commission > 0;
  });
  
  const commissionableCount = commissionableActions.length;
  const nonCommissionableCount = originalCount - commissionableCount;
  
  console.log(`[Commissionable Filter] Creator ${creatorId}: ${commissionableCount} commissionable, ${nonCommissionableCount} non-commissionable actions`);
  
  return commissionableActions;
}

/**
 * Validate that earnings data belongs to the correct creator
 * @param {Array} earnings - Array of earnings
 * @param {string} creatorId - Expected creator ID
 * @returns {Array} Validated earnings
 */
function validateEarningsOwnership(earnings, creatorId) {
  if (!Array.isArray(earnings)) {
    return [];
  }
  
  const validEarnings = earnings.filter(earning => {
    if (earning.creatorId !== creatorId) {
      console.error(`🚨 [SECURITY] Blocked earning ${earning.id} that belonged to different creator: ${earning.creatorId} (expected: ${creatorId})`);
      return false;
    }
    return true;
  });
  
  const blockedCount = earnings.length - validEarnings.length;
  if (blockedCount > 0) {
    console.error(`🚨 [SECURITY] Blocked ${blockedCount} earnings that didn't belong to creator ${creatorId}`);
  }
  
  return validEarnings;
}

module.exports = {
  validateSubId1Match,
  filterCreatorActions,
  validateAndGetSubId1,
  filterCommissionableActions,
  validateEarningsOwnership
};
