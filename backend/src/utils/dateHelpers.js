// Date Helper Utilities - Standardized date calculations for earnings and analytics
// Ensures consistency across all API endpoints

/**
 * Calculate standardized date range for API queries
 * @param {Object} options - Date range options
 * @param {number} options.days - Number of days (for preset ranges)
 * @param {string} options.startDate - Custom start date (YYYY-MM-DD)
 * @param {string} options.endDate - Custom end date (YYYY-MM-DD)
 * @returns {Object} Standardized date range
 */
function calculateDateRange(options = {}) {
  const { days, startDate: customStart, customEnd } = options;
  const now = new Date();
  
  // Format date to YYYY-MM-DD (UTC to avoid timezone issues)
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };
  
  // Validate YYYY-MM-DD format
  const isValidDateFormat = (dateStr) => {
    return typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  };
  
  let startDate, endDate, effectiveDays, requestedDays;
  
  // Use custom date range if provided and valid
  if (isValidDateFormat(customStart) && isValidDateFormat(customEnd)) {
    try {
      startDate = customStart;
      endDate = customEnd;
      
      // SAFETY: Validate dates can be parsed
      const startDateObj = new Date(customStart + 'T00:00:00Z');
      const endDateObj = new Date(customEnd + 'T23:59:59Z');
      
      // SAFETY: Check for invalid dates
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        throw new Error(`Invalid date objects: start=${startDateObj}, end=${endDateObj}`);
      }
      
      // SAFETY: Check date order
      if (startDateObj > endDateObj) {
        throw new Error(`Start date ${customStart} is after end date ${customEnd}`);
      }
      
      effectiveDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      
      // SAFETY: Validate reasonable date range
      if (effectiveDays > 365) {
        throw new Error(`Date range too large: ${effectiveDays} days (max 365)`);
      }
      
      requestedDays = effectiveDays;
      console.log(`[DateHelper] Using custom date range: ${startDate} to ${endDate} (${effectiveDays} days)`);
    } catch (error) {
      console.error(`[DateHelper] Custom date range error: ${error.message}, falling back to preset`);
      // SAFETY: Fallback to preset range if custom dates fail
      requestedDays = 30;
      effectiveDays = requestedDays;
      endDate = formatDate(now);
      const startDateObj = new Date(now.getTime() - (effectiveDays * 24 * 60 * 60 * 1000));
      startDate = formatDate(startDateObj);
    }
  } else {
    // Use preset days range
    try {
      requestedDays = Math.max(1, Math.min(90, Number(days) || 30));
      effectiveDays = requestedDays;
      
      // Calculate dates using consistent method
      endDate = formatDate(now);
      const startDateObj = new Date(now.getTime() - (effectiveDays * 24 * 60 * 60 * 1000));
      
      // SAFETY: Validate calculated date
      if (isNaN(startDateObj.getTime())) {
        throw new Error(`Invalid calculated start date: ${startDateObj}`);
      }
      
      startDate = formatDate(startDateObj);
      console.log(`[DateHelper] Using preset range: ${requestedDays} days (${startDate} to ${endDate})`);
    } catch (error) {
      console.error(`[DateHelper] Preset date calculation error: ${error.message}, using safe defaults`);
      // SAFETY: Ultimate fallback
      requestedDays = 30;
      effectiveDays = 30;
      endDate = now.toISOString().split('T')[0];
      startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    }
  }
  
  return {
    startDate,
    endDate,
    effectiveDays,
    requestedDays,
    isCustomRange: isValidDateFormat(customStart) && isValidDateFormat(customEnd),
    // Additional formats for different APIs
    startDateISO: `${startDate}T00:00:00Z`,
    endDateISO: `${endDate}T23:59:59Z`,
    // Impact.com format (MM/DD/YYYY)
    startDateImpact: convertToImpactFormat(startDate),
    endDateImpact: convertToImpactFormat(endDate)
  };
}

/**
 * Convert YYYY-MM-DD to MM/DD/YYYY format for Impact.com API
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string} Date in MM/DD/YYYY format
 */
function convertToImpactFormat(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  const [year, month, day] = dateStr.split('-');
  return `${month}/${day}/${year}`;
}

/**
 * Validate that two date ranges are identical (for consistency checks)
 * @param {Object} range1 - First date range
 * @param {Object} range2 - Second date range
 * @returns {boolean} True if ranges match
 */
function validateDateRangeConsistency(range1, range2) {
  return range1.startDate === range2.startDate && 
         range1.endDate === range2.endDate &&
         range1.effectiveDays === range2.effectiveDays;
}

/**
 * Create cache key from date range for caching purposes
 * @param {Object} dateRange - Date range object
 * @param {string} prefix - Cache key prefix
 * @returns {string} Cache key
 */
function createCacheKey(dateRange, prefix = 'data') {
  return `${prefix}_${dateRange.startDate}_${dateRange.endDate}_${dateRange.effectiveDays}`;
}

module.exports = {
  calculateDateRange,
  convertToImpactFormat,
  validateDateRangeConsistency,
  createCacheKey
};
