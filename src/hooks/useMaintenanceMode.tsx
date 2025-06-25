'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { checkMaintenanceStatus } from '../lib/utils/api-handler';

interface MaintenanceModeState {
  isMaintenanceMode: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  error: string | null;
}

interface UseMaintenanceModeOptions {
  checkInterval?: number; // in milliseconds
  onMaintenanceDetected?: () => void;
  autoCheck?: boolean;
}

/**
 * Hook to monitor and handle maintenance mode
 */
export function useMaintenanceMode(options: UseMaintenanceModeOptions = {}) {
  const {
    checkInterval = 60000, // Check every minute by default
    onMaintenanceDetected,
    autoCheck = true,
  } = options;

  const [state, setState] = useState<MaintenanceModeState>({
    isMaintenanceMode: false,
    isChecking: false,
    lastChecked: null,
    error: null,
  });

  const checkMaintenance = useCallback(async () => {
    setState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      const isInMaintenance = await checkMaintenanceStatus();
      
      setState(prev => ({
        ...prev,
        isMaintenanceMode: isInMaintenance,
        isChecking: false,
        lastChecked: new Date(),
        error: null,
      }));

      // Trigger callback if maintenance mode is detected
      if (isInMaintenance && onMaintenanceDetected) {
        onMaintenanceDetected();
      }

      return isInMaintenance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check maintenance status';
      
      setState(prev => ({
        ...prev,
        isChecking: false,
        error: errorMessage,
      }));

      return false;
    }
  }, [onMaintenanceDetected]);

  // Auto-check maintenance status
  useEffect(() => {
    if (!autoCheck) return;

    // Initial check
    checkMaintenance();

    // Set up interval for periodic checks
    const interval = setInterval(checkMaintenance, checkInterval);

    return () => clearInterval(interval);
  }, [checkMaintenance, checkInterval, autoCheck]);

  // Manual refresh function
  const refresh = useCallback(() => {
    return checkMaintenance();
  }, [checkMaintenance]);

  return {
    ...state,
    refresh,
    checkMaintenance,
  };
}

/**
 * Hook for handling API calls with maintenance mode awareness
 */
export function useMaintenanceAwareApi() {
  const { isMaintenanceMode } = useMaintenanceMode();

  const makeRequest = useCallback(async (
    url: string,
    options: RequestInit = {},
    onMaintenanceMode?: () => void
  ) => {
    // If we know we're in maintenance mode, don't make the request
    if (isMaintenanceMode) {
      if (onMaintenanceMode) {
        onMaintenanceMode();
      }
      throw new Error('Service is currently under maintenance');
    }

    try {
      const response = await fetch(url, options);
      
      // Check if the response indicates maintenance mode
      if (response.status === 503) {
        const data = await response.json().catch(() => ({}));
        if (data.maintenance && onMaintenanceMode) {
          onMaintenanceMode();
        }
        throw new Error(data.message || 'Service is under maintenance');
      }

      return response;
    } catch (error) {
      throw error;
    }
  }, [isMaintenanceMode]);

  return {
    isMaintenanceMode,
    makeRequest,
  };
}

/**
 * Higher-order component to wrap components with maintenance mode handling
 */
export function withMaintenanceMode<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  MaintenanceComponent?: React.ComponentType
): React.FC<P> {
  return function MaintenanceAwareComponent(props: P) {
    const { isMaintenanceMode, isChecking } = useMaintenanceMode();

    if (isChecking) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking service status...</p>
          </div>
        </div>
      );
    }

    if (isMaintenanceMode) {
      if (MaintenanceComponent) {
        return <MaintenanceComponent />;
      }
      
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🔧</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Under Maintenance</h2>
            <p className="text-gray-600 mb-4">
              We&apos;re currently performing maintenance to improve your experience. 
              Please check back in a few minutes.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}