// Data Consistency Validation Utilities
// Ensures data integrity across different API endpoints and sources

const { validateDateRangeConsistency } = require('./dateHelpers');

/**
 * Validate data consistency between multiple API responses
 * @param {Object} responses - Object containing responses from different APIs
 * @param {Object} metadata - Metadata about the requests
 * @returns {Object} Consistency validation result
 */
function validateDataConsistency(responses, metadata = {}) {
  const validation = {
    isConsistent: true,
    warnings: [],
    errors: [],
    metadata: {
      timestamp: new Date().toISOString(),
      creatorId: metadata.creatorId,
      requestId: metadata.requestId || generateRequestId()
    }
  };
  
  // 1. Validate date range consistency
  if (metadata.dateRanges && Array.isArray(metadata.dateRanges)) {
    const dateRangeConsistency = validateMultipleDateRanges(metadata.dateRanges);
    if (!dateRangeConsistency.isConsistent) {
      validation.isConsistent = false;
      validation.errors.push({
        type: 'DATE_RANGE_MISMATCH',
        message: 'Inconsistent date ranges between API calls',
        details: dateRangeConsistency
      });
    }
  }
  
  // 2. Validate SubId1 consistency
  if (responses.earnings && responses.analytics) {
    const subIdConsistency = validateSubIdConsistency(responses.earnings, responses.analytics, metadata.expectedSubId1);
    if (!subIdConsistency.isConsistent) {
      validation.isConsistent = false;
      validation.errors.push({
        type: 'SUBID_INCONSISTENCY',
        message: 'SubId1 mismatch between earnings and analytics data',
        details: subIdConsistency
      });
    }
  }
  
  // 3. Validate data source consistency
  const sourceConsistency = validateDataSources(responses);
  if (sourceConsistency.warnings.length > 0) {
    validation.warnings.push(...sourceConsistency.warnings);
  }
  
  // 4. Validate numerical consistency
  const numericalConsistency = validateNumericalConsistency(responses);
  if (!numericalConsistency.isConsistent) {
    validation.warnings.push({
      type: 'NUMERICAL_INCONSISTENCY',
      message: 'Potential numerical inconsistencies detected',
      details: numericalConsistency
    });
  }
  
  // Log validation results
  if (!validation.isConsistent) {
    console.error(`[DataConsistency] Validation failed for creator ${metadata.creatorId}:`, validation.errors);
  }
  
  if (validation.warnings.length > 0) {
    console.warn(`[DataConsistency] Validation warnings for creator ${metadata.creatorId}:`, validation.warnings);
  }
  
  return validation;
}

/**
 * Validate consistency between multiple date ranges
 * @param {Array} dateRanges - Array of date range objects
 * @returns {Object} Date range consistency validation
 */
function validateMultipleDateRanges(dateRanges) {
  if (!Array.isArray(dateRanges) || dateRanges.length < 2) {
    return { isConsistent: true, message: 'Insufficient date ranges to compare' };
  }
  
  const baseRange = dateRanges[0];
  const inconsistencies = [];
  
  for (let i = 1; i < dateRanges.length; i++) {
    const currentRange = dateRanges[i];
    if (!validateDateRangeConsistency(baseRange, currentRange)) {
      inconsistencies.push({
        index: i,
        expected: baseRange,
        actual: currentRange
      });
    }
  }
  
  return {
    isConsistent: inconsistencies.length === 0,
    inconsistencies,
    baseRange
  };
}

/**
 * Validate SubId1 consistency across different data sources
 * @param {Object} earningsData - Earnings data
 * @param {Object} analyticsData - Analytics data
 * @param {string} expectedSubId1 - Expected SubId1
 * @returns {Object} SubId1 consistency validation
 */
function validateSubIdConsistency(earningsData, analyticsData, expectedSubId1) {
  const validation = {
    isConsistent: true,
    issues: []
  };
  
  // Extract SubId1s from earnings data
  const earningsSubIds = extractSubIdsFromData(earningsData);
  
  // Extract SubId1s from analytics data
  const analyticsSubIds = extractSubIdsFromData(analyticsData);
  
  // Check if all SubId1s match expected
  const allSubIds = [...earningsSubIds, ...analyticsSubIds];
  const invalidSubIds = allSubIds.filter(subId => subId !== expectedSubId1);
  
  if (invalidSubIds.length > 0) {
    validation.isConsistent = false;
    validation.issues.push({
      type: 'UNEXPECTED_SUBIDS',
      expectedSubId1,
      invalidSubIds: [...new Set(invalidSubIds)]
    });
  }
  
  return validation;
}

/**
 * Extract SubId1 values from data object
 * @param {Object} data - Data object containing actions or earnings
 * @returns {Array} Array of unique SubId1 values
 */
function extractSubIdsFromData(data) {
  const subIds = [];
  
  // Handle different data structures
  if (data.actions && Array.isArray(data.actions)) {
    data.actions.forEach(action => {
      const subId1 = action.SubId1 || action.Subid1 || action.SubID1 || action.TrackingValue;
      if (subId1) {
        subIds.push(subId1.toString().trim());
      }
    });
  }
  
  if (data.recentSales && Array.isArray(data.recentSales)) {
    data.recentSales.forEach(sale => {
      const subId1 = sale._debug?.subId1;
      if (subId1) {
        subIds.push(subId1.toString().trim());
      }
    });
  }
  
  if (data.earnings && Array.isArray(data.earnings)) {
    data.earnings.forEach(earning => {
      const subId1 = earning.metadata?.subId1;
      if (subId1) {
        subIds.push(subId1.toString().trim());
      }
    });
  }
  
  return [...new Set(subIds)]; // Return unique values
}

/**
 * Validate data source consistency
 * @param {Object} responses - API responses
 * @returns {Object} Data source validation
 */
function validateDataSources(responses) {
  const validation = {
    warnings: [],
    sources: {}
  };
  
  // Track data sources
  Object.keys(responses).forEach(key => {
    const response = responses[key];
    if (response && response.dataSource) {
      validation.sources[key] = response.dataSource;
    }
  });
  
  // Check for mixed data sources
  const uniqueSources = [...new Set(Object.values(validation.sources))];
  if (uniqueSources.length > 1 && uniqueSources.includes('database_fallback')) {
    validation.warnings.push({
      type: 'MIXED_DATA_SOURCES',
      message: 'Mixing Impact.com and database fallback data may cause inconsistencies',
      sources: validation.sources
    });
  }
  
  return validation;
}

/**
 * Validate numerical consistency between related data points
 * @param {Object} responses - API responses
 * @returns {Object} Numerical consistency validation
 */
function validateNumericalConsistency(responses) {
  const validation = {
    isConsistent: true,
    issues: []
  };
  
  // Check earnings vs sales consistency
  if (responses.earnings && responses.sales) {
    const earningsTotal = responses.earnings.totalEarnings || 0;
    const salesTotal = responses.sales.totalSales || 0;
    
    // Basic sanity check: earnings shouldn't exceed sales
    if (earningsTotal > salesTotal && salesTotal > 0) {
      validation.issues.push({
        type: 'EARNINGS_EXCEED_SALES',
        earningsTotal,
        salesTotal,
        message: 'Earnings total exceeds sales total'
      });
    }
  }
  
  // Check analytics vs earnings consistency
  if (responses.analytics && responses.earnings) {
    const analyticsRevenue = responses.analytics.performanceMetrics?.revenue || 0;
    const earningsRevenue = responses.earnings.totalEarnings || 0;
    
    // Allow for some variance due to commission rates
    const variance = Math.abs(analyticsRevenue - earningsRevenue) / Math.max(analyticsRevenue, earningsRevenue, 1);
    
    if (variance > 0.5 && analyticsRevenue > 0 && earningsRevenue > 0) { // 50% variance threshold
      validation.issues.push({
        type: 'REVENUE_VARIANCE',
        analyticsRevenue,
        earningsRevenue,
        variance: variance * 100,
        message: 'Large variance between analytics and earnings revenue'
      });
    }
  }
  
  validation.isConsistent = validation.issues.length === 0;
  return validation;
}

/**
 * Generate unique request ID for tracking
 * @returns {string} Request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create consistency report for debugging
 * @param {Object} validation - Validation result
 * @param {Object} responses - Original responses
 * @returns {Object} Detailed consistency report
 */
function createConsistencyReport(validation, responses) {
  const report = {
    summary: {
      isConsistent: validation.isConsistent,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
      timestamp: validation.metadata.timestamp
    },
    details: {
      errors: validation.errors,
      warnings: validation.warnings,
      metadata: validation.metadata
    },
    dataOverview: {}
  };
  
  // Add data overview
  Object.keys(responses).forEach(key => {
    const response = responses[key];
    report.dataOverview[key] = {
      hasData: !!response,
      dataSource: response?.dataSource,
      cached: response?._cached,
      recordCount: getRecordCount(response)
    };
  });
  
  return report;
}

/**
 * Get record count from response
 * @param {Object} response - API response
 * @returns {number} Number of records
 */
function getRecordCount(response) {
  if (!response) return 0;
  
  if (response.actions && Array.isArray(response.actions)) {
    return response.actions.length;
  }
  
  if (response.recentSales && Array.isArray(response.recentSales)) {
    return response.recentSales.length;
  }
  
  if (response.earnings && Array.isArray(response.earnings)) {
    return response.earnings.length;
  }
  
  if (response.topLinks && Array.isArray(response.topLinks)) {
    return response.topLinks.length;
  }
  
  return 0;
}

module.exports = {
  validateDataConsistency,
  validateMultipleDateRanges,
  validateSubIdConsistency,
  validateDataSources,
  validateNumericalConsistency,
  createConsistencyReport,
  generateRequestId
};
