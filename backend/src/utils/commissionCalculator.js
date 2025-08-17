// Commission Calculator - Pure functions for earnings calculations
// Based on ZYLINK_DOCUMENTATION_SIMPLE.html specifications

/**
 * BUSINESS MODEL FROM DOCS:
 * - Platform Fee: 30% of all commissions
 * - Creator Commission: 70% (or custom rate)
 * - Sales Bonus: Custom amount per creator
 * - Referral Bonus: 10% of referred earnings (6 months)
 */

const BUSINESS_RULES = {
  PLATFORM_FEE_PERCENTAGE: 30,
  DEFAULT_CREATOR_COMMISSION: 70,
  REFERRAL_BONUS_PERCENTAGE: 10,
  REFERRAL_DURATION_MONTHS: 6,
  MINIMUM_PAYOUT: 50.00 // $50 USD minimum
};

/**
 * Calculate creator commission from gross Impact.com earnings
 * @param {number} grossAmount - Original amount from Impact.com
 * @param {number} creatorCommissionRate - Creator's commission rate (default 70%)
 * @returns {object} Commission breakdown
 */
function calculateCreatorCommission(grossAmount, creatorCommissionRate = BUSINESS_RULES.DEFAULT_CREATOR_COMMISSION) {
  const gross = parseFloat(grossAmount || 0);
  const rate = parseInt(creatorCommissionRate || BUSINESS_RULES.DEFAULT_CREATOR_COMMISSION);
  
  if (gross <= 0 || rate < 0 || rate > 100) {
    return {
      grossAmount: 0,
      creatorAmount: 0,
      platformAmount: 0,
      creatorRate: rate,
      platformRate: 0
    };
  }
  
  // Creator gets their commission rate percentage
  const creatorAmount = (gross * rate) / 100;
  
  // Platform gets the remainder
  const platformAmount = gross - creatorAmount;
  const platformRate = 100 - rate;
  
  return {
    grossAmount: gross,
    creatorAmount: parseFloat(creatorAmount.toFixed(2)),
    platformAmount: parseFloat(platformAmount.toFixed(2)),
    creatorRate: rate,
    platformRate: platformRate
  };
}

/**
 * Calculate referral bonus for referrer
 * @param {number} referredEarnings - Earnings of the referred creator
 * @param {Date} referralStartDate - When referral started
 * @param {Date} earningDate - When the earning occurred
 * @returns {object} Referral bonus calculation
 */
function calculateReferralBonus(referredEarnings, referralStartDate, earningDate = new Date()) {
  const earnings = parseFloat(referredEarnings || 0);
  const startDate = new Date(referralStartDate);
  const earnDate = new Date(earningDate);
  
  if (earnings <= 0) {
    return {
      bonusAmount: 0,
      isEligible: false,
      reason: 'No earnings to calculate bonus from'
    };
  }
  
  // Check if within 6 month window
  const sixMonthsLater = new Date(startDate);
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + BUSINESS_RULES.REFERRAL_DURATION_MONTHS);
  
  const isWithinTimeWindow = earnDate >= startDate && earnDate <= sixMonthsLater;
  
  if (!isWithinTimeWindow) {
    return {
      bonusAmount: 0,
      isEligible: false,
      reason: 'Outside 6-month referral window',
      windowStart: startDate.toISOString(),
      windowEnd: sixMonthsLater.toISOString()
    };
  }
  
  // Calculate 10% bonus
  const bonusAmount = (earnings * BUSINESS_RULES.REFERRAL_BONUS_PERCENTAGE) / 100;
  
  return {
    bonusAmount: parseFloat(bonusAmount.toFixed(2)),
    isEligible: true,
    reason: 'Eligible for referral bonus',
    referralPercentage: BUSINESS_RULES.REFERRAL_BONUS_PERCENTAGE,
    windowStart: startDate.toISOString(),
    windowEnd: sixMonthsLater.toISOString()
  };
}

/**
 * Calculate total earnings for a creator including all types
 * @param {object} earningsData - Object containing different earning types
 * @returns {object} Total earnings breakdown
 */
function calculateTotalEarnings(earningsData) {
  const {
    commissions = [],
    salesBonuses = [],
    referralBonuses = [],
    creatorCommissionRate = BUSINESS_RULES.DEFAULT_CREATOR_COMMISSION
  } = earningsData;
  
  // Calculate commission earnings
  let totalCommissionGross = 0;
  let totalCommissionNet = 0;
  
  commissions.forEach(commission => {
    const calc = calculateCreatorCommission(commission.amount, creatorCommissionRate);
    totalCommissionGross += calc.grossAmount;
    totalCommissionNet += calc.creatorAmount;
  });
  
  // Calculate sales bonuses (creator gets full amount)
  const totalSalesBonuses = salesBonuses.reduce((sum, bonus) => sum + parseFloat(bonus.amount || 0), 0);
  
  // Calculate referral bonuses (creator gets full amount)
  const totalReferralBonuses = referralBonuses.reduce((sum, bonus) => sum + parseFloat(bonus.amount || 0), 0);
  
  // Total earnings
  const totalEarnings = totalCommissionNet + totalSalesBonuses + totalReferralBonuses;
  
  return {
    totalEarnings: parseFloat(totalEarnings.toFixed(2)),
    breakdown: {
      commissions: {
        gross: parseFloat(totalCommissionGross.toFixed(2)),
        net: parseFloat(totalCommissionNet.toFixed(2)),
        count: commissions.length
      },
      salesBonuses: {
        total: parseFloat(totalSalesBonuses.toFixed(2)),
        count: salesBonuses.length
      },
      referralBonuses: {
        total: parseFloat(totalReferralBonuses.toFixed(2)),
        count: referralBonuses.length
      }
    },
    eligibleForPayout: totalEarnings >= BUSINESS_RULES.MINIMUM_PAYOUT
  };
}

/**
 * Calculate platform revenue from creator earnings
 * @param {number} grossCommissions - Total gross commission amount
 * @param {number} creatorCommissionRate - Creator's commission rate
 * @returns {object} Platform revenue calculation
 */
function calculatePlatformRevenue(grossCommissions, creatorCommissionRate = BUSINESS_RULES.DEFAULT_CREATOR_COMMISSION) {
  const gross = parseFloat(grossCommissions || 0);
  const rate = parseInt(creatorCommissionRate || BUSINESS_RULES.DEFAULT_CREATOR_COMMISSION);
  
  if (gross <= 0) {
    return {
      grossCommissions: 0,
      platformRevenue: 0,
      creatorPayout: 0,
      platformPercentage: 0
    };
  }
  
  const commission = calculateCreatorCommission(gross, rate);
  
  return {
    grossCommissions: commission.grossAmount,
    platformRevenue: commission.platformAmount,
    creatorPayout: commission.creatorAmount,
    platformPercentage: commission.platformRate
  };
}

/**
 * Validate if a creator is eligible for payout
 * @param {number} totalEarnings - Creator's total earnings
 * @param {object} paymentAccount - Creator's payment account info
 * @returns {object} Payout eligibility
 */
function validatePayoutEligibility(totalEarnings, paymentAccount) {
  const earnings = parseFloat(totalEarnings || 0);
  const hasPaymentAccount = paymentAccount && paymentAccount.isActive;
  
  const eligibilityChecks = {
    minimumAmount: earnings >= BUSINESS_RULES.MINIMUM_PAYOUT,
    hasPaymentAccount,
    hasValidAccountDetails: hasPaymentAccount && paymentAccount.accountDetails,
    totalEarnings: earnings
  };
  
  const isEligible = Object.values(eligibilityChecks).every(check => 
    typeof check === 'boolean' ? check : true
  );
  
  return {
    isEligible,
    eligibilityChecks,
    minimumRequired: BUSINESS_RULES.MINIMUM_PAYOUT,
    shortfall: Math.max(0, BUSINESS_RULES.MINIMUM_PAYOUT - earnings)
  };
}

/**
 * Calculate Impact.com earning to creator earning conversion
 * @param {object} impactEarning - Raw Impact.com earning data
 * @param {object} creator - Creator data with commission rate
 * @returns {object} Converted earning for database
 */
function convertImpactEarningToCreatorEarning(impactEarning, creator) {
  const {
    Amount = 0,
    Payout = 0,
    Commission = 0,
    EventDate,
    Id: impactTransactionId,
    State = 'PENDING'
  } = impactEarning;
  
  // Use the highest available amount (some Impact.com responses vary)
  const grossAmount = parseFloat(Amount || Payout || Commission || 0);
  
  if (grossAmount <= 0) {
    return null;
  }
  
  // Calculate creator's commission
  const commission = calculateCreatorCommission(grossAmount, creator.commissionRate);
  
  // Map Impact.com status to our system
  const statusMap = {
    'APPROVED': 'COMPLETED',
    'CONFIRMED': 'COMPLETED', 
    'PENDING': 'PENDING',
    'LOCKED': 'PENDING',
    'REJECTED': 'CANCELLED',
    'REVERSED': 'CANCELLED'
  };
  
  return {
    creatorId: creator.id,
    amount: commission.creatorAmount, // Creator gets their commission rate
    type: 'COMMISSION',
    status: statusMap[State.toUpperCase()] || 'PENDING',
    impactTransactionId,
    createdAt: EventDate ? new Date(EventDate) : new Date(),
    metadata: {
      grossAmount: commission.grossAmount,
      platformAmount: commission.platformAmount,
      commissionRate: commission.creatorRate,
      originalImpactData: impactEarning
    }
  };
}

/**
 * Calculate monthly payout summary for admin
 * @param {array} earnings - Array of earnings to process
 * @returns {object} Monthly payout summary
 */
function calculateMonthlyPayoutSummary(earnings) {
  if (!Array.isArray(earnings) || earnings.length === 0) {
    return {
      totalCreators: 0,
      totalGross: 0,
      totalCreatorPayouts: 0,
      totalPlatformRevenue: 0,
      eligibleCreators: 0,
      pendingAmount: 0
    };
  }
  
  const summary = earnings.reduce((acc, earning) => {
    const amount = parseFloat(earning.amount || 0);
    const creatorId = earning.creatorId;
    
    // Track unique creators
    if (!acc.creators.has(creatorId)) {
      acc.creators.add(creatorId);
      acc.creatorEarnings[creatorId] = 0;
    }
    
    acc.creatorEarnings[creatorId] += amount;
    acc.totalCreatorPayouts += amount;
    
    return acc;
  }, {
    creators: new Set(),
    creatorEarnings: {},
    totalCreatorPayouts: 0
  });
  
  // Count eligible creators (meeting minimum payout)
  const eligibleCreators = Object.values(summary.creatorEarnings)
    .filter(amount => amount >= BUSINESS_RULES.MINIMUM_PAYOUT).length;
  
  const pendingAmount = Object.values(summary.creatorEarnings)
    .filter(amount => amount < BUSINESS_RULES.MINIMUM_PAYOUT)
    .reduce((sum, amount) => sum + amount, 0);
  
  // Estimate platform revenue (assuming average 70% creator rate)
  const estimatedGross = summary.totalCreatorPayouts / 0.7;
  const estimatedPlatformRevenue = estimatedGross - summary.totalCreatorPayouts;
  
  return {
    totalCreators: summary.creators.size,
    totalGross: parseFloat(estimatedGross.toFixed(2)),
    totalCreatorPayouts: parseFloat(summary.totalCreatorPayouts.toFixed(2)),
    totalPlatformRevenue: parseFloat(estimatedPlatformRevenue.toFixed(2)),
    eligibleCreators,
    pendingAmount: parseFloat(pendingAmount.toFixed(2)),
    minimumPayout: BUSINESS_RULES.MINIMUM_PAYOUT
  };
}

module.exports = {
  // Main calculation functions
  calculateCreatorCommission,
  calculateReferralBonus,
  calculateTotalEarnings,
  calculatePlatformRevenue,
  
  // Validation functions
  validatePayoutEligibility,
  
  // Conversion functions
  convertImpactEarningToCreatorEarning,
  
  // Summary functions
  calculateMonthlyPayoutSummary,
  
  // Business rules constants
  BUSINESS_RULES
};

