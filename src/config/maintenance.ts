// Maintenance mode configuration
// This file centralizes maintenance mode settings

export const MAINTENANCE_MODE = false;

// Maintenance configuration
export const MAINTENANCE_CONFIG = {
  enabled: MAINTENANCE_MODE,
  message: 'TOPAY Dashboard is currently under maintenance. Please try again later.',
  // Only auth endpoints are allowed during maintenance - all others are blocked
  // Admin routes that should remain accessible
  allowedAdminRoutes: [
    '/admin',
  ],
};

export default MAINTENANCE_CONFIG;