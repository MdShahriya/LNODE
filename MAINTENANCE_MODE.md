# Maintenance Mode System

This document explains how to use the comprehensive maintenance mode system implemented for the TOPAY Dashboard.

## Overview

The maintenance mode system provides:

- **Complete API blocking** during maintenance
- **Centralized configuration** for easy management
- **Graceful error handling** for client-side applications
- **Admin access preservation** during maintenance
- **Real-time maintenance detection** for React components

## Quick Start

### Enabling Maintenance Mode

1. Edit `src/config/maintenance.ts`:

```typescript
export const MAINTENANCE_MODE = true; // Enable maintenance mode
```

1. The system will automatically:
   - Block all API calls (except allowed endpoints)
   - Show maintenance page to users
   - Return 503 status codes for API requests

### Disabling Maintenance Mode

1. Edit `src/config/maintenance.ts`:

```typescript
export const MAINTENANCE_MODE = false; // Disable maintenance mode
```

## Configuration

### Maintenance Config (`src/config/maintenance.ts`)

```typescript
export const MAINTENANCE_CONFIG = {
  enabled: MAINTENANCE_MODE,
  message: 'TOPAY Dashboard is currently under maintenance. Please try again later.',
  // API endpoints that remain accessible during maintenance
  allowedEndpoints: [
    '/api/auth', // Keep auth for admin access
  ],
  // Admin routes that remain accessible
  allowedAdminRoutes: [
    '/admin',
  ],
};
```

### Customizing Allowed Endpoints

To allow specific API endpoints during maintenance:

```typescript
allowedEndpoints: [
  '/api/auth',
  '/api/health-check',
  '/api/admin', // Allow all admin APIs
],
```

## Components

### 1. Middleware (`middleware.ts`)

- **Purpose**: Intercepts all requests and blocks API calls during maintenance
- **Location**: Project root
- **Functionality**:
  - Returns 503 status for blocked API calls
  - Allows configured endpoints to pass through
  - Redirects admin routes to maintenance page (if not allowed)

### 2. Layout Integration (`src/app/layout.tsx`)

- **Purpose**: Shows maintenance page when maintenance mode is enabled
- **Functionality**:
  - Renders `MaintenancePage` instead of normal app content
  - Uses centralized configuration

### 3. API Handler (`src/lib/utils/api-handler.ts`)

- **Purpose**: Provides maintenance-aware API client
- **Usage**:

```typescript
import { apiRequest, MaintenanceAwareApiClient } from '@/lib/utils/api-handler';

// Simple API request
const response = await apiRequest('/api/user/profile');
if (response.maintenance) {
  // Handle maintenance mode
}

// Using the API client
const apiClient = new MaintenanceAwareApiClient('', () => {
  // Handle maintenance mode detection
  console.log('Maintenance mode detected!');
});

const userData = await apiClient.get('/api/user/profile');
```

### 4. React Hooks (`src/hooks/useMaintenanceMode.ts`)

#### `useMaintenanceMode`

Monitors maintenance status in real-time:

```typescript
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';

function MyComponent() {
  const { isMaintenanceMode, isChecking, refresh } = useMaintenanceMode({
    checkInterval: 30000, // Check every 30 seconds
    onMaintenanceDetected: () => {
      // Handle maintenance mode detection
      alert('Service is now under maintenance');
    },
  });

  if (isMaintenanceMode) {
    return <div>Service is under maintenance</div>;
  }

  return <div>Normal content</div>;
}
```

#### `useMaintenanceAwareApi`

Makes API calls with maintenance awareness:

```typescript
import { useMaintenanceAwareApi } from '@/hooks/useMaintenanceMode';

function DataComponent() {
  const { makeRequest, isMaintenanceMode } = useMaintenanceAwareApi();

  const fetchData = async () => {
    try {
      const response = await makeRequest('/api/data', {}, () => {
        // Handle maintenance mode
        setError('Service is under maintenance');
      });
      // Handle successful response
    } catch (error) {
      // Handle errors
    }
  };

  return (
    <button onClick={fetchData} disabled={isMaintenanceMode}>
      {isMaintenanceMode ? 'Service Unavailable' : 'Fetch Data'}
    </button>
  );
}
```

#### `withMaintenanceMode` HOC

Wraps components with automatic maintenance handling:

```typescript
import { withMaintenanceMode } from '@/hooks/useMaintenanceMode';

const MyComponent = () => <div>Normal content</div>;

// Wrap with maintenance mode handling
export default withMaintenanceMode(MyComponent);

// Or with custom maintenance component
const CustomMaintenanceComponent = () => <div>Custom maintenance message</div>;
export default withMaintenanceMode(MyComponent, CustomMaintenanceComponent);
```

### 5. Health Check API (`src/app/api/health-check/route.ts`)

- **Purpose**: Provides endpoint to check service status
- **Endpoints**:
  - `GET /api/health-check` - Returns detailed status
  - `HEAD /api/health-check` - Lightweight status check

## API Response Format

During maintenance mode, blocked API calls return:

```json
{
  "error": "Service Unavailable",
  "message": "TOPAY Dashboard is currently under maintenance. Please try again later.",
  "maintenance": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

HTTP Status: `503 Service Unavailable`
Headers: `Retry-After: 3600`

## Best Practices

### 1. Gradual Rollout

```typescript
// Enable maintenance for specific features first
allowedEndpoints: [
  '/api/auth',
  '/api/health-check',
  '/api/user/profile', // Keep user profiles accessible
],
```

### 2. Admin Access

Always keep admin endpoints accessible:

```typescript
allowedEndpoints: [
  '/api/auth',
  '/api/admin', // All admin APIs
],
allowedAdminRoutes: [
  '/admin',
],
```

### 3. Client-Side Handling

Use the provided hooks for consistent maintenance handling:

```typescript
// Good: Use maintenance-aware hooks
const { makeRequest } = useMaintenanceAwareApi();

// Avoid: Direct fetch calls without maintenance handling
// fetch('/api/data') // This won't handle maintenance gracefully
```

### 4. Error Boundaries

Implement error boundaries to catch maintenance-related errors:

```typescript
class MaintenanceErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    if (error.message.includes('maintenance')) {
      // Handle maintenance errors specifically
    }
  }
}
```

## Testing

### Manual Testing

1. Enable maintenance mode in config
2. Try accessing API endpoints
3. Verify 503 responses for blocked endpoints
4. Verify allowed endpoints still work
5. Check that UI shows maintenance page

### Automated Testing

```typescript
// Test maintenance mode middleware
describe('Maintenance Mode', () => {
  it('should block API calls during maintenance', async () => {
    // Enable maintenance mode
    const response = await fetch('/api/user/profile');
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      maintenance: true,
    });
  });
});
```

## Monitoring

### Health Check Monitoring

Set up monitoring for the health check endpoint:

```bash
# Check service status
curl -I https://your-domain.com/api/health-check

# Response during maintenance:
# HTTP/1.1 503 Service Unavailable
# Retry-After: 3600

# Response when healthy:
# HTTP/1.1 200 OK
```

### Logging

The system automatically logs maintenance mode activities. Monitor these logs:

- API request blocks
- Maintenance mode toggles
- Client-side maintenance detection

## Troubleshooting

### Common Issues

1. **Maintenance mode not working**
   - Check `src/config/maintenance.ts` configuration
   - Verify middleware is properly configured
   - Check Next.js middleware matcher patterns

2. **Admin access blocked**
   - Verify admin endpoints in `allowedEndpoints`
   - Check admin routes in `allowedAdminRoutes`

3. **Client-side not detecting maintenance**
   - Ensure components use maintenance-aware hooks
   - Check network connectivity to health check endpoint
   - Verify error handling in API calls

### Debug Mode

Add debug logging to track maintenance mode behavior:

```typescript
// In middleware.ts
console.log('Maintenance check:', {
  pathname,
  maintenanceEnabled: MAINTENANCE_CONFIG.enabled,
  isApiRoute: pathname.startsWith('/api'),
});
```

## Security Considerations

1. **Admin Access**: Ensure admin endpoints remain secure during maintenance
2. **Information Disclosure**: Maintenance messages should not reveal sensitive information
3. **Rate Limiting**: Consider rate limiting for health check endpoints
4. **Authentication**: Maintain authentication requirements for allowed endpoints

## Performance

- Middleware adds minimal overhead (~1ms per request)
- Health check endpoint is lightweight
- Client-side hooks use efficient polling intervals
- Maintenance status is cached to reduce server load

---

**Note**: Always test maintenance mode in a staging environment before enabling in production.
