/**
 * Maintenance Mode Configuration Validator
 * 
 * This utility validates the maintenance mode configuration to ensure
 * all settings are properly configured and secure.
 */

import { MAINTENANCE_CONFIG } from '@/config/maintenance';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  allowedEndpoints: string[];
  allowedAdminRoutes: string[];
}

/**
 * Validates the maintenance configuration
 */
export function validateMaintenanceConfig(config: MaintenanceConfig = MAINTENANCE_CONFIG): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  };

  // Validate enabled flag
  if (typeof config.enabled !== 'boolean') {
    result.errors.push('enabled must be a boolean value');
    result.isValid = false;
  }

  // Validate message
  if (typeof config.message !== 'string') {
    result.errors.push('message must be a string');
    result.isValid = false;
  } else {
    if (config.message.trim().length === 0) {
      result.warnings.push('message is empty - users will see a generic maintenance message');
    }
    if (config.message.length > 500) {
      result.warnings.push('message is very long - consider shortening for better UX');
    }
    if (!config.message.includes('maintenance') && !config.message.includes('update')) {
      result.suggestions.push('Consider including "maintenance" or "update" in the message for clarity');
    }
  }

  // Validate allowedEndpoints
  if (!Array.isArray(config.allowedEndpoints)) {
    result.errors.push('allowedEndpoints must be an array');
    result.isValid = false;
  } else {
    config.allowedEndpoints.forEach((endpoint, index) => {
      if (typeof endpoint !== 'string') {
        result.errors.push(`allowedEndpoints[${index}] must be a string`);
        result.isValid = false;
      } else {
        if (!endpoint.startsWith('/')) {
          result.warnings.push(`allowedEndpoints[${index}] should start with '/' for consistency`);
        }
        if (endpoint.includes('*') || endpoint.includes('?')) {
          result.warnings.push(`allowedEndpoints[${index}] contains wildcards - ensure this is intentional`);
        }
      }
    });

    // Check for essential endpoints
    const hasHealthCheck = config.allowedEndpoints.some(ep => ep.includes('health'));
    if (!hasHealthCheck) {
      result.suggestions.push('Consider adding a health check endpoint to allowedEndpoints');
    }

    const hasAuth = config.allowedEndpoints.some(ep => ep.includes('auth'));
    if (!hasAuth) {
      result.suggestions.push('Consider adding authentication endpoints to allowedEndpoints');
    }
  }

  // Validate allowedAdminRoutes
  if (!Array.isArray(config.allowedAdminRoutes)) {
    result.errors.push('allowedAdminRoutes must be an array');
    result.isValid = false;
  } else {
    config.allowedAdminRoutes.forEach((route, index) => {
      if (typeof route !== 'string') {
        result.errors.push(`allowedAdminRoutes[${index}] must be a string`);
        result.isValid = false;
      } else {
        if (!route.startsWith('/')) {
          result.warnings.push(`allowedAdminRoutes[${index}] should start with '/' for consistency`);
        }
        if (!route.includes('admin') && !route.includes('maintenance')) {
          result.warnings.push(`allowedAdminRoutes[${index}] doesn't appear to be an admin or maintenance route`);
        }
      }
    });
  }

  return result;
}

/**
 * Validates endpoint patterns for security
 */
export function validateEndpointSecurity(endpoints: string[]): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  };

  const dangerousPatterns = [
    { pattern: /\/admin(?!\/maintenance|\/status)/, message: 'Admin endpoints should be carefully reviewed' },
    { pattern: /\/api\/.*\/(delete|remove|destroy)/, message: 'Destructive operations should not be allowed during maintenance' },
    { pattern: /\/api\/.*\/(create|add|insert)/, message: 'Creation operations should not be allowed during maintenance' },
    { pattern: /\/api\/.*\/(update|edit|modify)/, message: 'Modification operations should not be allowed during maintenance' },
    { pattern: /\*/, message: 'Wildcard patterns can be overly permissive' },
    { pattern: /\.\.\//, message: 'Path traversal patterns detected' }
  ];

  endpoints.forEach((endpoint, index) => {
    dangerousPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(endpoint)) {
        result.warnings.push(`allowedEndpoints[${index}] (${endpoint}): ${message}`);
      }
    });

    // Check for overly broad patterns
    if (endpoint === '/api' || endpoint === '/api/') {
      result.errors.push(`allowedEndpoints[${index}] is too broad - this would allow all API access`);
      result.isValid = false;
    }
  });

  return result;
}

/**
 * Checks if the current configuration is production-ready
 */
export function validateProductionReadiness(config: MaintenanceConfig = MAINTENANCE_CONFIG): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  };

  // Check if maintenance is enabled in production
  if (config.enabled && process.env.NODE_ENV === 'production') {
    result.warnings.push('Maintenance mode is currently ENABLED in production');
  }

  // Check message quality for production
  if (config.enabled && config.message.toLowerCase().includes('test')) {
    result.warnings.push('Maintenance message contains "test" - ensure this is appropriate for production');
  }

  // Check for development-specific endpoints
  const devEndpoints = config.allowedEndpoints.filter(ep => 
    ep.includes('dev') || ep.includes('debug') || ep.includes('test')
  );
  if (devEndpoints.length > 0 && process.env.NODE_ENV === 'production') {
    result.warnings.push(`Development endpoints found in production: ${devEndpoints.join(', ')}`);
  }

  // Check for proper monitoring endpoints
  const hasMonitoring = config.allowedEndpoints.some(ep => 
    ep.includes('health') || ep.includes('status') || ep.includes('metrics')
  );
  if (!hasMonitoring) {
    result.suggestions.push('Add monitoring endpoints for production observability');
  }

  return result;
}

/**
 * Comprehensive validation that runs all checks
 */
export function validateMaintenanceSystem(config: MaintenanceConfig = MAINTENANCE_CONFIG): ValidationResult {
  const configValidation = validateMaintenanceConfig(config);
  const securityValidation = validateEndpointSecurity(config.allowedEndpoints);
  const productionValidation = validateProductionReadiness(config);

  return {
    isValid: configValidation.isValid && securityValidation.isValid && productionValidation.isValid,
    errors: [
      ...configValidation.errors,
      ...securityValidation.errors,
      ...productionValidation.errors
    ],
    warnings: [
      ...configValidation.warnings,
      ...securityValidation.warnings,
      ...productionValidation.warnings
    ],
    suggestions: [
      ...configValidation.suggestions,
      ...securityValidation.suggestions,
      ...productionValidation.suggestions
    ]
  };
}

/**
 * Formats validation results for console output
 */
export function formatValidationResults(result: ValidationResult): string {
  const lines: string[] = [];
  
  lines.push('🔧 Maintenance Mode Configuration Validation');
  lines.push('=' .repeat(50));
  
  if (result.isValid) {
    lines.push('✅ Configuration is valid');
  } else {
    lines.push('❌ Configuration has errors');
  }
  
  if (result.errors.length > 0) {
    lines.push('\n🚨 Errors:');
    result.errors.forEach(error => lines.push(`  • ${error}`));
  }
  
  if (result.warnings.length > 0) {
    lines.push('\n⚠️  Warnings:');
    result.warnings.forEach(warning => lines.push(`  • ${warning}`));
  }
  
  if (result.suggestions.length > 0) {
    lines.push('\n💡 Suggestions:');
    result.suggestions.forEach(suggestion => lines.push(`  • ${suggestion}`));
  }
  
  lines.push('\n' + '='.repeat(50));
  
  return lines.join('\n');
}

/**
 * Validates configuration and logs results to console
 */
export function validateAndLog(config: MaintenanceConfig = MAINTENANCE_CONFIG): boolean {
  const result = validateMaintenanceSystem(config);
  console.log(formatValidationResults(result));
  return result.isValid;
}

/**
 * Runtime configuration checker for development
 */
export function checkMaintenanceConfigAtRuntime(): void {
  if (process.env.NODE_ENV === 'development') {
    const result = validateMaintenanceSystem();
    
    if (!result.isValid) {
      console.error('❌ Maintenance configuration validation failed:');
      result.errors.forEach(error => console.error(`  • ${error}`));
    }
    
    if (result.warnings.length > 0) {
      console.warn('⚠️  Maintenance configuration warnings:');
      result.warnings.forEach(warning => console.warn(`  • ${warning}`));
    }
  }
}

// Auto-run validation in development
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  checkMaintenanceConfigAtRuntime();
}