# TOPAY Dashboard - Maintenance Mode System

## Overview

The TOPAY Dashboard includes a comprehensive maintenance mode system that allows for graceful service interruption during updates, deployments, or system maintenance. This system provides complete API protection, user-friendly messaging, and seamless reactivation.

## Quick Start

### Enable Maintenance Mode

1. Open `src/config/maintenance.ts`
2. Set `enabled: true` in the `MAINTENANCE_CONFIG` object
3. Optionally customize the maintenance message
4. Deploy the changes

```typescript
export const MAINTENANCE_CONFIG = {
  enabled: true, // Enable maintenance mode
  message: "We're currently performing scheduled maintenance. Please check back in a few minutes.",
  // ... other config
};
```

### Disable Maintenance Mode

1. Open `src/config/maintenance.ts`
2. Set `enabled: false` in the `MAINTENANCE_CONFIG` object
3. Deploy the changes

## System Architecture

### Core Components

1. **Configuration** (`src/config/maintenance.ts`)
   - Centralized maintenance mode settings
   - Customizable messages and allowed endpoints
   - Easy enable/disable toggle

2. **Middleware** (`middleware.ts`)
   - Intercepts all incoming requests
   - Blocks API calls during maintenance
   - Allows specific endpoints (health checks, auth)
   - Redirects admin routes appropriately

3. **Layout Integration** (`src/app/layout.tsx`)
   - Displays maintenance page to users
   - Prevents normal app rendering during maintenance
   - Maintains consistent user experience

4. **API Handler** (`src/lib/utils/api-handler.ts`)
   - Graceful API error handling
   - Maintenance-aware request wrapper
   - Client-side maintenance detection

5. **React Hooks** (`src/hooks/useMaintenanceMode.tsx`)
   - Real-time maintenance status monitoring
   - Maintenance-aware API requests
   - Higher-order component for automatic handling

6. **Health Check API** (`src/app/api/health-check/route.ts`)
   - Service status endpoint
   - Returns 503 during maintenance
   - Monitoring and alerting integration

## Features

### 🛡️ Complete API Protection

- All API routes are blocked during maintenance
- Returns 503 status with maintenance information
- Prevents data corruption or inconsistent states

### 🎯 Selective Access

- Configure allowed endpoints (e.g., authentication, health checks)
- Admin route protection and redirection
- Granular control over service availability

### 👥 User Experience

- Clean, informative maintenance page
- Customizable maintenance messages
- Automatic refresh functionality
- Loading states and error handling

### 🔧 Developer Tools

- React hooks for maintenance-aware components
- Higher-order component for automatic handling
- Comprehensive testing utilities
- TypeScript support throughout

### 📊 Monitoring

- Health check endpoint for external monitoring
- Real-time status detection
- Error logging and reporting

## Usage Examples

### Basic Maintenance Check

```typescript
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';

function MyComponent() {
  const { isMaintenanceMode, checkMaintenance } = useMaintenanceMode();

  if (isMaintenanceMode) {
    return <div>Service is under maintenance</div>;
  }

  return <div>Normal content</div>;
}
```

### Maintenance-Aware API Requests

```typescript
import { useMaintenanceAwareApi } from '@/hooks/useMaintenanceMode';

function DataComponent() {
  const { makeRequest, isMaintenanceMode } = useMaintenanceAwareApi();

  const fetchData = async () => {
    try {
      const response = await makeRequest('/api/data');
      // Handle response
    } catch (error) {
      // Automatically handles maintenance mode errors
    }
  };

  return (
    <button onClick={fetchData} disabled={isMaintenanceMode}>
      {isMaintenanceMode ? 'Service Unavailable' : 'Load Data'}
    </button>
  );
}
```

### Higher-Order Component

```typescript
import { withMaintenanceMode } from '@/hooks/useMaintenanceMode';

const MyComponent = () => <div>Protected content</div>;

// Automatically shows maintenance page when needed
export default withMaintenanceMode(MyComponent);
```

### Custom Maintenance Component

```typescript
const CustomMaintenanceComponent = () => (
  <div className="custom-maintenance">
    <h1>We'll be right back!</h1>
    <p>Upgrading our systems for a better experience.</p>
  </div>
);

export default withMaintenanceMode(MyComponent, CustomMaintenanceComponent);
```

## Configuration Options

### Maintenance Config (`src/config/maintenance.ts`)

```typescript
export const MAINTENANCE_CONFIG = {
  enabled: false, // Main toggle
  message: "Custom maintenance message",
  allowedEndpoints: [
    '/api/auth/login',
    '/api/auth/logout',
    '/api/health-check'
  ],
  allowedAdminRoutes: [
    '/admin/maintenance',
    '/admin/status'
  ]
};
```

### Hook Options

```typescript
const options = {
  autoCheck: true,           // Auto-check on mount
  checkInterval: 30000,      // Check every 30 seconds
  onMaintenanceDetected: () => {
    // Custom callback when maintenance is detected
  },
  onMaintenanceResolved: () => {
    // Custom callback when maintenance ends
  }
};

const { isMaintenanceMode } = useMaintenanceMode(options);
```

## Testing

### Running Tests

```bash
# Run all maintenance mode tests
npm test -- --testPathPattern="maintenance"

# Run specific test files
npm test src/hooks/__tests__/useMaintenanceMode.test.tsx
npm test src/lib/utils/__tests__/api-handler.test.ts
```

### Test Coverage

The system includes comprehensive tests for:

- Maintenance mode detection and state management
- API request handling during maintenance
- Higher-order component behavior
- Error handling and edge cases
- Configuration changes and updates

## Deployment

### Zero-Downtime Deployment

1. **Pre-deployment**: Enable maintenance mode
2. **Deploy**: Update application code
3. **Verify**: Check health endpoints
4. **Activate**: Disable maintenance mode

### Rollback Procedure

1. **Immediate**: Enable maintenance mode
2. **Rollback**: Deploy previous version
3. **Verify**: Test critical functionality
4. **Restore**: Disable maintenance mode

## Monitoring and Alerting

### Health Check Endpoint

```bash
# Check service status
curl -I http://localhost:3000/api/health-check

# Response during maintenance:
# HTTP/1.1 503 Service Unavailable

# Response when healthy:
# HTTP/1.1 200 OK
```

### Integration with Monitoring Tools

```javascript
// Example monitoring script
const checkHealth = async () => {
  try {
    const response = await fetch('/api/health-check');
    if (response.status === 503) {
      // Alert: Service in maintenance mode
    } else if (response.status === 200) {
      // Service is healthy
    }
  } catch (error) {
    // Alert: Service unreachable
  }
};
```

## Security Considerations

### Access Control

- Admin routes are protected during maintenance
- Authentication endpoints remain accessible
- Sensitive operations are completely blocked

### Data Protection

- No API modifications allowed during maintenance
- Read operations are blocked to prevent inconsistencies
- Database connections can be safely updated

## Troubleshooting

### Common Issues

1. **Maintenance mode not activating**
   - Check `MAINTENANCE_CONFIG.enabled` value
   - Verify middleware is properly configured
   - Check for caching issues

2. **API calls still working during maintenance**
   - Verify endpoint is not in `allowedEndpoints`
   - Check middleware execution order
   - Review route patterns

3. **Users not seeing maintenance page**
   - Check layout.tsx integration
   - Verify client-side routing
   - Clear browser cache

### Debug Mode

```typescript
// Enable debug logging
const { isMaintenanceMode, error } = useMaintenanceMode({
  autoCheck: true,
  onMaintenanceDetected: () => console.log('Maintenance detected'),
  onMaintenanceResolved: () => console.log('Maintenance resolved')
});

console.log('Maintenance status:', { isMaintenanceMode, error });
```

## Best Practices

### 1. Communication

- Notify users in advance of scheduled maintenance
- Provide estimated duration and expected completion time
- Use clear, friendly language in maintenance messages

### 2. Timing

- Schedule maintenance during low-traffic periods
- Consider different time zones for global users
- Keep maintenance windows as short as possible

### 3. Testing

- Test maintenance mode in staging environment
- Verify all critical paths are properly blocked
- Test the reactivation process

### 4. Monitoring

- Set up alerts for maintenance mode activation
- Monitor system resources during maintenance
- Track user impact and feedback

### 5. Documentation

- Keep maintenance logs for future reference
- Document any issues encountered
- Update procedures based on lessons learned

## Contributing

When contributing to the maintenance mode system:

1. **Add tests** for any new functionality
2. **Update documentation** for configuration changes
3. **Test thoroughly** in development environment
4. **Consider backward compatibility** for existing integrations
5. **Follow TypeScript** best practices

## Support

For issues or questions about the maintenance mode system:

1. Check this documentation first
2. Review the test files for usage examples
3. Check the troubleshooting section
4. Contact the development team

---

*This documentation is part of the TOPAY Dashboard project. Keep it updated as the system evolves.*
