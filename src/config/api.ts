/**
 * API Configuration
 * 
 * Centralized configuration for API routes, pagination,
 * caching, and other API-related settings.
 */

import type { ApiConfig } from '@/types/api';

// Default pagination settings
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1
} as const;

// Default sorting settings
export const SORT_DEFAULTS = {
  FIELD: 'date',
  ORDER: -1 as const, // -1 for descending, 1 for ascending
  ALLOWED_FIELDS: ['date', 'amount', 'points', 'timestamp', 'walletAddress'] as const
} as const;

// Cache settings
export const CACHE_SETTINGS = {
  ENABLED: process.env.NODE_ENV === 'production',
  DEFAULT_TTL: 5 * 60, // 5 minutes in seconds
  LONG_TTL: 60 * 60, // 1 hour in seconds
  SHORT_TTL: 60, // 1 minute in seconds
  KEYS: {
    LOTTERY_WINNERS: 'lottery:winners',
    USER_STATS: 'user:stats',
    LEADERBOARD: 'leaderboard',
    TODAY_WINNER: 'lottery:today'
  }
} as const;

// Rate limiting settings
export const RATE_LIMIT_SETTINGS = {
  ENABLED: process.env.NODE_ENV === 'production',
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100, // per window
  ADMIN_MAX_REQUESTS: 1000, // higher limit for admin endpoints
  SKIP_SUCCESSFUL_REQUESTS: false
} as const;

// Database settings
export const DATABASE_SETTINGS = {
  CONNECTION_TIMEOUT: 30000, // 30 seconds
  SOCKET_TIMEOUT: 45000, // 45 seconds
  MAX_POOL_SIZE: 10,
  MIN_POOL_SIZE: 2,
  MAX_IDLE_TIME: 30000, // 30 seconds
  RETRY_WRITES: true,
  W: 'majority' as const
} as const;

// API response settings
export const RESPONSE_SETTINGS = {
  INCLUDE_STACK_TRACE: process.env.NODE_ENV === 'development',
  INCLUDE_REQUEST_ID: true,
  DEFAULT_ERROR_MESSAGE: 'An unexpected error occurred',
  CORS_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
} as const;

// Validation settings
export const VALIDATION_SETTINGS = {
  WALLET_ADDRESS_REGEX: /^0x[a-fA-F0-9]{40}$/,
  MONGO_ID_REGEX: /^[0-9a-fA-F]{24}$/,
  MAX_STRING_LENGTH: 1000,
  MAX_ARRAY_LENGTH: 100
} as const;

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_CACHING: process.env.ENABLE_CACHING === 'true',
  ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING !== 'false',
  ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING !== 'false',
  ENABLE_PERFORMANCE_MONITORING: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
  ENABLE_DETAILED_ERRORS: process.env.NODE_ENV === 'development'
} as const;

// API endpoints configuration
export const API_ENDPOINTS = {
  LOTTERY: {
    WINNERS: '/api/lottery/winners',
    TODAY: '/api/lottery/today',
    STATS: '/api/lottery/stats'
  },
  ADMIN: {
    LOTTERY_WINNERS: '/api/admin/lottery/winners',
    USERS: '/api/admin/users',
    STATS: '/api/admin/stats'
  },
  USER: {
    PROFILE: '/api/user/profile',
    POINTS: '/api/user/points',
    SESSIONS: '/api/user/sessions'
  },
  HEALTH: '/api/health-check'
} as const;

// Collection names
export const COLLECTIONS = {
  LOTTERY_WINNERS: 'lotterywinners',
  USERS: 'users',
  POINTS_HISTORY: 'pointshistories',
  NODE_SESSIONS: 'nodesessions',
  ACHIEVEMENTS: 'achievements',
  TASKS: 'tasks',
  USER_TASKS: 'usertasks'
} as const;

// Environment-specific configurations
const getEnvironmentConfig = (): Partial<ApiConfig> => {
  switch (process.env.NODE_ENV) {
    case 'development':
      return {
        defaultPageSize: 5,
        maxPageSize: 50,
        enableCaching: false,
        cacheTimeout: 60
      };
    
    case 'test':
      return {
        defaultPageSize: 3,
        maxPageSize: 10,
        enableCaching: false,
        cacheTimeout: 0
      };
    
    case 'production':
    default:
      return {
        defaultPageSize: 10,
        maxPageSize: 100,
        enableCaching: true,
        cacheTimeout: 300
      };
  }
};

// Main API configuration
export const API_CONFIG: ApiConfig = {
  defaultPageSize: PAGINATION_DEFAULTS.LIMIT,
  maxPageSize: PAGINATION_DEFAULTS.MAX_LIMIT,
  defaultSortField: SORT_DEFAULTS.FIELD,
  defaultSortOrder: SORT_DEFAULTS.ORDER,
  enableCaching: CACHE_SETTINGS.ENABLED,
  cacheTimeout: CACHE_SETTINGS.DEFAULT_TTL,
  ...getEnvironmentConfig()
};

// Helper functions
export const getValidatedPage = (page?: string | number): number => {
  const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
  return pageNum && pageNum > 0 ? pageNum : PAGINATION_DEFAULTS.PAGE;
};

export const getValidatedLimit = (limit?: string | number): number => {
  const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
  if (!limitNum || limitNum < PAGINATION_DEFAULTS.MIN_LIMIT) {
    return PAGINATION_DEFAULTS.LIMIT;
  }
  return Math.min(limitNum, PAGINATION_DEFAULTS.MAX_LIMIT);
};

export const getValidatedSortOrder = (order?: string): 1 | -1 => {
  return order === 'asc' ? 1 : -1;
};

export const isValidSortField = (field: string): boolean => {
  return SORT_DEFAULTS.ALLOWED_FIELDS.includes(field as typeof SORT_DEFAULTS.ALLOWED_FIELDS[number]);
};

// Environment validation
export const validateRequiredEnvVars = (): void => {
  const required = ['NEXT_MONGO_URI'];
  const missing = required.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Database connection options
export const getMongoOptions = () => ({
  connectTimeoutMS: DATABASE_SETTINGS.CONNECTION_TIMEOUT,
  socketTimeoutMS: DATABASE_SETTINGS.SOCKET_TIMEOUT,
  maxPoolSize: DATABASE_SETTINGS.MAX_POOL_SIZE,
  minPoolSize: DATABASE_SETTINGS.MIN_POOL_SIZE,
  maxIdleTimeMS: DATABASE_SETTINGS.MAX_IDLE_TIME,
  retryWrites: DATABASE_SETTINGS.RETRY_WRITES,
  w: DATABASE_SETTINGS.W,
  bufferCommands: false
});

// CORS configuration
export const getCorsOptions = () => ({
  origin: RESPONSE_SETTINGS.CORS_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

export default API_CONFIG;