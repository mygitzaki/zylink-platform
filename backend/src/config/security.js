/**
 * Security Configuration
 * Centralized security settings and validations
 */

class SecurityConfig {
  constructor() {
    this.validateEnvironment();
  }

  /**
   * Validate all required environment variables
   */
  validateEnvironment() {
    const required = [
      'JWT_SECRET',
      'DATABASE_URL',
      'IMPACT_ACCOUNT_SID',
      'IMPACT_AUTH_TOKEN',
      'IMPACT_PROGRAM_ID'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('🚨 CRITICAL: Missing required environment variables:');
      missing.forEach(key => console.error(`   - ${key}`));
      console.error('Application may not function properly without these variables.');
      
      if (process.env.NODE_ENV === 'production') {
        console.error('🚨 PRODUCTION: Missing critical environment variables may cause crashes!');
      }
    }

    // Validate JWT secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      console.warn('⚠️ WARNING: JWT_SECRET should be at least 32 characters long for security.');
    }

    // Validate database URL format
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('postgresql://')) {
      console.warn('⚠️ WARNING: DATABASE_URL should be a valid PostgreSQL connection string.');
    }
  }

  /**
   * Get security headers configuration
   */
  getSecurityHeaders() {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    };
  }

  /**
   * Validate API credentials
   */
  validateApiCredentials(service) {
    if (!service.isConfigured()) {
      throw new Error(`Service not properly configured. Check environment variables.`);
    }
    return true;
  }

  /**
   * Sanitize sensitive data for logging
   */
  sanitizeForLogs(data) {
    if (typeof data === 'object') {
      const sanitized = { ...data };
      const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
      
      sensitiveKeys.forEach(key => {
        if (sanitized[key]) {
          sanitized[key] = '[REDACTED]';
        }
      });
      
      return sanitized;
    }
    return data;
  }

  /**
   * Rate limiting configuration
   */
  getRateLimitConfig() {
    return {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    };
  }
}

module.exports = SecurityConfig;
