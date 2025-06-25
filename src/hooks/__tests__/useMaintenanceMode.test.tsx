/* eslint-disable @typescript-eslint/no-require-imports */
import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
// Import jest-dom matchers
require('@testing-library/jest-dom');
import { useMaintenanceMode, useMaintenanceAwareApi, withMaintenanceMode } from '../useMaintenanceMode';
import { checkMaintenanceStatus } from '@/lib/utils/api-handler';

// Mock the API handler
jest.mock('@/lib/utils/api-handler', () => ({
  checkMaintenanceStatus: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('useMaintenanceMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with default state', () => {
    let hookResult: unknown;
    
    function TestComponent() {
      hookResult = useMaintenanceMode({ autoCheck: false });
      return <div>Test</div>;
    }

    render(<TestComponent />);

    expect((hookResult as ReturnType<typeof useMaintenanceMode>).isMaintenanceMode).toBe(false);
    expect((hookResult as ReturnType<typeof useMaintenanceMode>).isChecking).toBe(false);
    expect((hookResult as ReturnType<typeof useMaintenanceMode>).lastChecked).toBeNull();
    expect((hookResult as ReturnType<typeof useMaintenanceMode>).error).toBeNull();
  });
  it('should check maintenance status on mount when autoCheck is true', async () => {
    (checkMaintenanceStatus as jest.Mock).mockResolvedValue(false);
    
    function TestComponent() {
      useMaintenanceMode({ checkInterval: 1000 });
      return <div>Test</div>;
    }

    render(<TestComponent />);

    await waitFor(() => {
      expect(checkMaintenanceStatus).toHaveBeenCalled();
    });
  });

  it('should detect maintenance mode', async () => {
    (checkMaintenanceStatus as jest.Mock).mockResolvedValue(true);
    const onMaintenanceDetected = jest.fn();
    
    let hookResult: ReturnType<typeof useMaintenanceMode>;
    
    function TestComponent() {
      hookResult = useMaintenanceMode({ 
        autoCheck: false,
        onMaintenanceDetected 
      });
      return <div>Test</div>;
    }

    render(<TestComponent />);

    await act(async () => {
      await hookResult.checkMaintenance();
    });

    expect(hookResult!.isMaintenanceMode).toBe(true);
    expect(onMaintenanceDetected).toHaveBeenCalled();
  });

  it('should handle errors during maintenance check', async () => {
    (checkMaintenanceStatus as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    let hookResult: ReturnType<typeof useMaintenanceMode>;
    
    function TestComponent() {
      hookResult = useMaintenanceMode({ autoCheck: false });
      return <div>Test</div>;
    }

    render(<TestComponent />);

    await act(async () => {
      await hookResult.checkMaintenance();
    });
    expect(hookResult!.error).toBe('Network error');
    expect(hookResult!.isMaintenanceMode).toBe(false);
  });

  it('should set up periodic checks with correct interval', async () => {
    (checkMaintenanceStatus as jest.Mock).mockResolvedValue(false);
    
    function TestComponent() {
      useMaintenanceMode({ checkInterval: 5000 });
      return <div>Test</div>;
    }

    render(<TestComponent />);

    // Wait for initial check
    await waitFor(() => {
      expect(checkMaintenanceStatus).toHaveBeenCalledTimes(1);
    });

    // Fast-forward time and check if periodic check happens
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(checkMaintenanceStatus).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useMaintenanceAwareApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should make requests when not in maintenance mode', async () => {
    (checkMaintenanceStatus as jest.Mock).mockResolvedValue(false);
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' }),
    });

    let hookResult: ReturnType<typeof useMaintenanceAwareApi>;
    
    function TestComponent() {
      hookResult = useMaintenanceAwareApi();
      return <div>Test</div>;
    }

    render(<TestComponent />);

    // Wait for maintenance check to complete
    await waitFor(() => {
      expect(hookResult.isMaintenanceMode).toBe(false);
    });

    const response = await hookResult!.makeRequest('/api/test');
    expect(fetch).toHaveBeenCalledWith('/api/test', {});
    expect(response.ok).toBe(true);
  });

  it('should prevent requests when in maintenance mode', async () => {
    (checkMaintenanceStatus as jest.Mock).mockResolvedValue(true);
    const onMaintenanceMode = jest.fn();

    let hookResult: ReturnType<typeof useMaintenanceAwareApi>;
    
    function TestComponent() {
      hookResult = useMaintenanceAwareApi();
      return <div>Test</div>;
    }

    render(<TestComponent />);

    // Wait for maintenance check to complete
    await waitFor(() => {
      expect(hookResult.isMaintenanceMode).toBe(true);
    });

    await expect(
      hookResult!.makeRequest('/api/test', {}, onMaintenanceMode)
    ).rejects.toThrow('Service is currently under maintenance');

    expect(onMaintenanceMode).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should handle 503 responses from server', async () => {
    (checkMaintenanceStatus as jest.Mock).mockResolvedValue(false);
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ maintenance: true, message: 'Under maintenance' }),
    });

    const onMaintenanceMode = jest.fn();
    let hookResult: ReturnType<typeof useMaintenanceAwareApi>;
    
    function TestComponent() {
      hookResult = useMaintenanceAwareApi();
      return <div>Test</div>;
    }

    render(<TestComponent />);

    await waitFor(() => {
      expect(hookResult.isMaintenanceMode).toBe(false);
    });

    await expect(
      hookResult!.makeRequest('/api/test', {}, onMaintenanceMode)
    ).rejects.toThrow('Under maintenance');

    expect(onMaintenanceMode).toHaveBeenCalled();
  });
});

describe('withMaintenanceMode HOC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render wrapped component when not in maintenance', async () => {
    (checkMaintenanceStatus as jest.Mock).mockResolvedValue(false);
    
    const TestComponent = () => <div>Normal Content</div>;
    const WrappedComponent = withMaintenanceMode(TestComponent);

    render(<WrappedComponent /> as React.ReactElement);

    await waitFor(() => {
      expect(document.body.textContent).toContain('Normal Content');
    });
  });

  it('should show loading state while checking', () => {
    (checkMaintenanceStatus as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(false), 1000))
    );
    
    const TestComponent = () => <div>Normal Content</div>;
    const WrappedComponent = withMaintenanceMode(TestComponent);

    render(<WrappedComponent /> as React.ReactElement);

    expect(screen.getByText('Checking service status...')).toBeInTheDocument();
  });

  it('should show maintenance message when in maintenance mode', async () => {
    (checkMaintenanceStatus as jest.Mock).mockResolvedValue(true);
    
    const TestComponent = () => <div>Normal Content</div>;
    const WrappedComponent = withMaintenanceMode(TestComponent);

    render(<WrappedComponent /> as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText('Under Maintenance')).toBeInTheDocument();
      expect(screen.getByText(/currently performing maintenance/)).toBeInTheDocument();
    });
  });

  it('should render custom maintenance component when provided', async () => {
    (checkMaintenanceStatus as jest.Mock).mockResolvedValue(true);
    
    const TestComponent = () => <div>Normal Content</div>;
    const CustomMaintenanceComponent = () => <div>Custom Maintenance Message</div>;
    const WrappedComponent = withMaintenanceMode(TestComponent, CustomMaintenanceComponent);

    render(<WrappedComponent /> as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText('Custom Maintenance Message')).toBeInTheDocument();
      expect(screen.queryByText('Normal Content')).not.toBeInTheDocument();
    });
  });

  it('should handle refresh button click', async () => {
    // Mock the maintenance check to return true (in maintenance mode)
    (checkMaintenanceStatus as jest.Mock).mockResolvedValue(true);
    
    // Create a custom mock for the refresh functionality
    let refreshCalled = false;
    const CustomMaintenanceComponent = () => (
      <div>
        <div>Custom Maintenance Message</div>
        <button 
          onClick={() => { refreshCalled = true; }}
          data-testid="custom-refresh"
        >
          Refresh Page
        </button>
      </div>
    );
    
    const TestComponent = () => <div>Test Component</div>;
    const WrappedComponent = withMaintenanceMode(TestComponent, CustomMaintenanceComponent);

    render(<WrappedComponent /> as React.ReactElement);

    await waitFor(() => {
      const refreshButton = screen.getByTestId('custom-refresh');
      refreshButton.click();
      expect(refreshCalled).toBe(true);
    });
  });
});