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

  // Note: API endpoints are now handled by middleware logic
  // Only auth endpoints (/api/auth/*) are allowed during maintenance
  result.suggestions.push('During maintenance, only authentication endpoints (/api/auth/*) are accessible');

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
 * Note: Endpoint security is now handled by middleware
 * Only auth endpoints (/api/auth/*) are allowed during maintenance
 */

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

  // Note: API endpoint validation is now handled by middleware
  // All non-auth endpoints are blocked during maintenance
  if (process.env.NODE_ENV === 'production' && config.enabled) {
    result.suggestions.push('Ensure monitoring systems can still access health endpoints via alternative methods');
  }

  return result;
}

/**
 * Comprehensive validation that runs all checks
 */
export function validateMaintenanceSystem(config: MaintenanceConfig = MAINTENANCE_CONFIG): ValidationResult {
  const configValidation = validateMaintenanceConfig(config);
  const productionValidation = validateProductionReadiness(config);

  return {
    isValid: configValidation.isValid && productionValidation.isValid,
    errors: [
      ...configValidation.errors,
      ...productionValidation.errors
    ],
    warnings: [
      ...configValidation.warnings,
      ...productionValidation.warnings
    ],
    suggestions: [
      ...configValidation.suggestions,
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