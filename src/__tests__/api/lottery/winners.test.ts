/**
 * Example API Test for Lottery Winners Endpoint
 * 
 * This test demonstrates how to use the testing utilities
 * to test API endpoints with proper setup and teardown.
 * 
 * To run this test:
 * 1. Install dependencies: npm install --save-dev node-mocks-http mongodb-memory-server @types/node-mocks-http
 * 2. Run: npm test
 */

import { GET } from '@/app/api/lottery/winners/route';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
  createMockNextRequest,
  expectSuccessResponse,
  expectPaginationResponse,
  expectErrorResponse,
  seedLotteryWinners,
  testApiEndpoint
} from '@/lib/test/api-test-utils';

// Test suite for lottery winners API
describe('/api/lottery/winners', () => {
  // Setup and teardown
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('GET /api/lottery/winners', () => {
    it('should return paginated lottery winners', async () => {
      // Seed test data
      await seedLotteryWinners(15);

      // Test request
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/lottery/winners?page=1&limit=10'
      });

      const response = await GET(request);
      const data = await response.json();

      // Assertions
      expectSuccessResponse(data);
      expectPaginationResponse(data, 1, 10, 15);
      expect(data.data).toHaveLength(10);
      expect(data.data[0]).toHaveProperty('walletAddress');
      expect(data.data[0]).toHaveProperty('amount');
      expect(data.data[0]).toHaveProperty('date');
    });

    it('should filter by wallet address', async () => {
      // Seed test data
      await seedLotteryWinners(5);
      const targetWallet = '0x0000000000000000000000000000000000000000';

      // Test request with wallet filter
      const request = createMockNextRequest({
        url: `http://localhost:3000/api/lottery/winners?walletAddress=${targetWallet}`
      });

      const response = await GET(request);
      const data = await response.json();

      // Assertions
      expectSuccessResponse(data);
      expect(data.data.every((winner: { walletAddress: string }) => 
        winner.walletAddress === targetWallet
      )).toBe(true);
    });

    it('should filter by date range', async () => {
      // Seed test data
      await seedLotteryWinners(10);
      
      const startDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      const endDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

      // Test request with date range
      const request = createMockNextRequest({
        url: `http://localhost:3000/api/lottery/winners?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      });

      const response = await GET(request);
      const data = await response.json();

      // Assertions
      expectSuccessResponse(data);
      expect(data.data.every((winner: { date: string }) => {
        const winnerDate = new Date(winner.date);
        return winnerDate >= startDate && winnerDate <= endDate;
      })).toBe(true);
    });

    it('should handle invalid pagination parameters', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/lottery/winners?page=-1&limit=0'
      });

      const response = await GET(request);
      const data = await response.json();

      // Should use default values for invalid parameters
      expectSuccessResponse(data);
      expectPaginationResponse(data, 1, 10); // Default values
    });

    it('should handle large limit values', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/lottery/winners?limit=1000'
      });

      const response = await GET(request);
      const data = await response.json();

      // Should cap at maximum limit
      expectSuccessResponse(data);
      expect(data.pagination.limit).toBeLessThanOrEqual(100);
    });

    it('should return empty array when no winners exist', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/lottery/winners'
      });

      const response = await GET(request);
      const data = await response.json();

      expectSuccessResponse(data);
      expect(data.data).toEqual([]);
      expectPaginationResponse(data, 1, 10, 0);
    });

    it('should handle database errors gracefully', async () => {
      // Simulate database error by closing connection
      await teardownTestDatabase();

      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/lottery/winners'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expectErrorResponse(data, 'DATABASE_ERROR');

      // Restore database for other tests
      await setupTestDatabase();
    });
  });

  describe('Performance Tests', () => {
    it('should respond within acceptable time limits', async () => {
      // Seed large dataset
      await seedLotteryWinners(100);

      const startTime = Date.now();
      
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/lottery/winners?page=1&limit=50'
      });

      const response = await GET(request);
      const data = await response.json();
      
      const duration = Date.now() - startTime;

      expectSuccessResponse(data);
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests', async () => {
      await seedLotteryWinners(50);

      // Create multiple concurrent requests
      const requests = Array.from({ length: 10 }, () => 
        createMockNextRequest({
          url: 'http://localhost:3000/api/lottery/winners'
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(
        requests.map(req => GET(req))
      );
      const duration = Date.now() - startTime;

      // All requests should succeed
      for (const response of responses) {
        const data = await response.json();
        expectSuccessResponse(data);
      }

      // Should handle concurrent requests efficiently
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed wallet addresses', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/lottery/winners?walletAddress=invalid'
      });

      const response = await GET(request);
      const data = await response.json();

      // Should return empty results for invalid wallet address
      expectSuccessResponse(data);
      expect(data.data).toEqual([]);
    });

    it('should handle invalid date formats', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/lottery/winners?startDate=invalid-date'
      });

      const response = await GET(request);
      const data = await response.json();

      // Should ignore invalid date and return all results
      expectSuccessResponse(data);
    });

    it('should handle very large page numbers', async () => {
      await seedLotteryWinners(10);

      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/lottery/winners?page=999999'
      });

      const response = await GET(request);
      const data = await response.json();

      expectSuccessResponse(data);
      expect(data.data).toEqual([]);
      expect(data.pagination.hasNext).toBe(false);
    });
  });

  // Use the common test patterns
  describe('Common API Patterns', () => {
    it('should handle pagination correctly', async () => {
      await seedLotteryWinners(25);
      await testApiEndpoint.testPagination(GET, 'http://localhost:3000/api/lottery/winners');
    });

    it('should handle errors correctly', async () => {
      await testApiEndpoint.testErrorHandling(GET, 'http://localhost:3000/api/lottery/winners');
    });
  });
});