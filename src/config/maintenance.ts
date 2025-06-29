// Maintenance mode configuration
// This file centralizes maintenance mode settings

export const MAINTENANCE_MODE = true;

// Optional: Add maintenance message and allowed endpoints
export const MAINTENANCE_CONFIG = {
  enabled: MAINTENANCE_MODE,
  message: 'TOPAY Dashboard is currently under maintenance. Please try again later.',
  // API endpoints that should remain accessible during maintenance
  allowedEndpoints: [
    '/api/auth', // Keep auth endpoints for admin access
  ],
  // All API endpoints that should be blocked during maintenance
  blockedEndpoints: [
    '/api/user',
    '/api/admin',
    '/api/tasks',
    '/api/lottery',
    '/api/referral',
    '/api/social',
    '/api/discord',
    '/api/node',
    '/api/leaderboard',
  ],
  // Admin routes that should remain accessible
  allowedAdminRoutes: [
    '/admin',
  ],
};

export default MAINTENANCE_CONFIG;