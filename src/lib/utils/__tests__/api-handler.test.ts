import { apiRequest, handleApiResponse, MaintenanceAwareApiClient } from '../api-handler';

// Mock fetch globally
global.fetch = jest.fn();

describe('API Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to prevent test output pollution
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('apiRequest', () => {
    it('should handle successful API responses', async () => {
      const mockData = { id: 1, name: 'Test' };
      (fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await apiRequest('/api/test');
      
      expect(result).toBeDefined();
      expect(result).toStrictEqual({ data: mockData });
      expect(fetch).toHaveBeenCalledWith('/api/test', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should handle maintenance mode responses', async () => {
      const maintenanceResponse = {
        error: 'Service Unavailable',
        message: 'Service is under maintenance',
        maintenance: true,
        timestamp: '2024-01-15T10:30:00.000Z',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => maintenanceResponse,
      });

      const result = await apiRequest('/api/test');
      
      expect(result).toEqual({
        error: 'maintenance',
        message: 'Service is under maintenance',
        maintenance: true,
        timestamp: '2024-01-15T10:30:00.000Z',
      });
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await apiRequest('/api/test');
      
      expect(result).toEqual({
        error: 'network',
        message: 'Network error occurred. Please check your connection.',
      });
    });

    it('should handle HTTP errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad Request', message: 'Invalid data' }),
      });

      const result = await apiRequest('/api/test');
      
      expect(result).toEqual({
        error: 'Bad Request',
        message: 'Invalid data',
      });
    });
  });

  describe('handleApiResponse', () => {
    it('should return data for successful responses', () => {
      const response = { data: { id: 1, name: 'Test' } };
      const result = handleApiResponse(response);
      
      expect(result).toEqual({ id: 1, name: 'Test' });
    });

    it('should handle maintenance mode with callback', () => {
      const onMaintenance = jest.fn();
      const response = {
        error: 'maintenance',
        message: 'Service is under maintenance',
        maintenance: true,
      };
      
      const result = handleApiResponse(response, onMaintenance);
      
      expect(result).toBeNull();
      expect(onMaintenance).toHaveBeenCalled();
    });

    it('should handle errors with callback', () => {
      const onError = jest.fn();
      const response = {
        error: 'validation',
        message: 'Invalid input',
      };
      
      const result = handleApiResponse(response, undefined, onError);
      
      expect(result).toBeNull();
      expect(onError).toHaveBeenCalledWith('validation', 'Invalid input');
    });
  });

  describe('MaintenanceAwareApiClient', () => {
    let client: MaintenanceAwareApiClient;
    let onMaintenanceMode: jest.Mock;

    beforeEach(() => {
      onMaintenanceMode = jest.fn();
      client = new MaintenanceAwareApiClient('/api', onMaintenanceMode);
    });

    it('should make GET requests', async () => {
      const mockData = { id: 1 };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await client.get('/users');
      
      expect(result).toEqual({ data: mockData });
      expect(fetch).toHaveBeenCalledWith('/api/users', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should make POST requests with data', async () => {
      const postData = { name: 'Test User' };
      const responseData = { id: 1, ...postData };
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => responseData,
      });

      const result = await client.post('/users', postData);
      
      expect(result).toEqual({ data: responseData });
      expect(fetch).toHaveBeenCalledWith('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });
    });

    it('should trigger maintenance callback when detected', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ maintenance: true, message: 'Under maintenance' }),
      });

      await client.get('/users');
      
      expect(onMaintenanceMode).toHaveBeenCalled();
    });

    it('should make PUT requests', async () => {
      const putData = { name: 'Updated User' };
      const responseData = { id: 1, ...putData };
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => responseData,
      });

      const result = await client.put('/users/1', putData);
      
      expect(result).toEqual({ data: responseData });
      expect(fetch).toHaveBeenCalledWith('/api/users/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(putData),
      });
    });

    it('should make DELETE requests', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
      });

      const result = await client.delete('/users/1');
      
      expect(result).toEqual({ data: {} });
      expect(fetch).toHaveBeenCalledWith('/api/users/1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });
});

// These functions are provided by Jest, no need to redefine them
