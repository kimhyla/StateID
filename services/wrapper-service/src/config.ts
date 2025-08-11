export const config = {
  // Server configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.WRAPPER_SERVICE_PORT || '3001', 10),
  
  // Critical performance requirements from spec
  REDIRECT_TIMEOUT_MS: parseInt(process.env.REDIRECT_TIMEOUT_MS || '200', 10),
  FAIL_OPEN_THRESHOLD_MS: parseInt(process.env.FAIL_OPEN_THRESHOLD_MS || '200', 10),
  BACKGROUND_RETRY_ATTEMPTS: parseInt(process.env.BACKGROUND_RETRY_ATTEMPTS || '3', 10),
  
  // Database connections
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://stateid:stateid_password@localhost:5432/stateid',
  
  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'dev-key-32-characters-long-here!',
  
  // Geo-location providers
  MAXMIND_LICENSE_KEY: process.env.MAXMIND_LICENSE_KEY || '',
  MAXMIND_DATABASE_PATH: process.env.MAXMIND_DATABASE_PATH || './data/GeoLite2-City.mmdb',
  IP2LOCATION_API_KEY: process.env.IP2LOCATION_API_KEY || '',
  IPGEOLOCATION_API_KEY: process.env.IPGEOLOCATION_API_KEY || '',
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING === 'true',
  
  // External services
  CALENDAR_SERVICE_URL: process.env.CALENDAR_SERVICE_URL || 'http://localhost:3002',
  
  // Development mode settings
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  SKIP_GEO_VERIFICATION: process.env.SKIP_GEO_VERIFICATION === 'true'
} as const;