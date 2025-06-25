// API handler utility for maintenance mode and error handling

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  maintenance?: boolean;
  timestamp?: string;
}


/**
 * Enhanced fetch wrapper that handles maintenance mode and provides consistent error handling
 */
export async function apiRequest<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    // Handle maintenance mode
    if (response.status === 503 && data.maintenance) {
      return {
        error: 'maintenance',
        message: data.message || 'Service is currently under maintenance',
        maintenance: true,
        timestamp: data.timestamp,
      };
    }

    // Handle other errors
    if (!response.ok) {
      return {
        error: data.error || 'Request failed',
        message: data.message || `HTTP ${response.status}`,
      };
    }

    return { data };
  } catch (error) {
    console.error('API Request failed:', error);
    return {
      error: 'network',
      message: 'Network error occurred. Please check your connection.',
    };
  }
}

/**
 * Hook for handling API responses with maintenance mode awareness
 */
export function handleApiResponse<T>(
  response: ApiResponse<T>,
  onMaintenance?: () => void,
  onError?: (error: string, message: string) => void
): T | null {
  if (response.maintenance) {
    if (onMaintenance) {
      onMaintenance();
    } else {
      // Default maintenance handling
      console.warn('Service is under maintenance:', response.message);
      // You could show a toast notification here
    }
    return null;
  }

  if (response.error) {
    if (onError) {
      onError(response.error, response.message || 'Unknown error');
    } else {
      console.error('API Error:', response.error, response.message);
    }
    return null;
  }

  return response.data || null;
}

/**
 * Utility to check if the application is in maintenance mode
 */
export async function checkMaintenanceStatus(): Promise<boolean> {
  try {
    const response = await fetch('/api/health-check', {
      method: 'HEAD',
    });
    return response.status === 503;
  } catch {
    // If we can't reach the server, assume it's not maintenance
    return false;
  }
}

/**
 * Create a maintenance-aware API client
 */
export class MaintenanceAwareApiClient {
  private baseUrl: string;
  private onMaintenanceMode?: () => void;

  constructor(baseUrl = '', onMaintenanceMode?: () => void) {
    this.baseUrl = baseUrl;
    this.onMaintenanceMode = onMaintenanceMode;
  }

  async request<T = unknown>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await apiRequest<T>(url, options);

    if (response.maintenance && this.onMaintenanceMode) {
      this.onMaintenanceMode();
    }

    return response;
  }

  async get<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = unknown>(
    endpoint: string,
    data?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = unknown>(
    endpoint: string,
    data?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}