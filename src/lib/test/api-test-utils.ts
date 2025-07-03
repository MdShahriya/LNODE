/**
 * API Testing Utilities
 * 
 * Provides utilities for testing API routes with mock data,
 * database setup/teardown, and common test patterns.
 */

// Note: Install these dependencies for full testing functionality:
// npm install --save-dev node-mocks-http mongodb-memory-server @types/node-mocks-http

// Type definitions for optional dependencies
type CreateMocksFunction = <T = NextApiRequest, U = NextApiResponse>(
  options: {
    method?: string;
    url?: string;
    query?: Record<string, string | string[]>;
    body?: unknown;
    headers?: Record<string, string>;
  }
) => { req: T; res: U };

type MongoMemoryServerClass = {
  create(): Promise<{
    getUri(): string;
    stop(): Promise<void>;
  }>;
};

// Conditional imports for optional testing dependencies
let createMocks: CreateMocksFunction | undefined;
let MongoMemoryServer: MongoMemoryServerClass | undefined;

// Initialize optional dependencies asynchronously
const initializeTestDependencies = async () => {
  try {
    // Use eval to prevent TypeScript from analyzing the import at build time
    const nodeMocksHttp = await eval('import("node-mocks-http")');
    createMocks = nodeMocksHttp.createMocks;
  } catch {
    console.warn('node-mocks-http not installed. Some test utilities will be unavailable.');
  }

  try {
    // Use eval to prevent TypeScript from analyzing the import at build time
    const mongoMemoryServer = await eval('import("mongodb-memory-server")');
    MongoMemoryServer = mongoMemoryServer.MongoMemoryServer;
  } catch {
    console.warn('mongodb-memory-server not installed. In-memory database testing will be unavailable.');
  }
};

// Export a function to get dependencies when needed
export const getTestDependencies = async () => {
  if (!createMocks || !MongoMemoryServer) {
    await initializeTestDependencies();
  }
  return { createMocks, MongoMemoryServer };
};

// Only initialize in test environment or when explicitly requested
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  // Don't initialize immediately to avoid build-time import issues
  // Dependencies will be loaded when first needed
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';

// Jest globals are provided by @types/jest - no need to redeclare

// Mock data generators
export const mockLotteryWinner = (overrides: Partial<Record<string, unknown>> = {}) => ({
  _id: new mongoose.Types.ObjectId().toString(),
  walletAddress: '0x1234567890123456789012345678901234567890',
  amount: 100,
  date: new Date(),
  transactionHash: '0xabcdef1234567890',
  ...overrides
});

export const mockUser = (overrides: Partial<unknown> = {}) => ({
  _id: new mongoose.Types.ObjectId().toString(),
  walletAddress: '0x1234567890123456789012345678901234567890',
  points: 1000,
  nodeStatus: 'active',
  isVerified: true,
  joinedAt: new Date(),
  ...overrides
});

export const mockPointsHistory = (overrides: Partial<Record<string, unknown>> = {}) => ({
  _id: new mongoose.Types.ObjectId().toString(),
  walletAddress: '0x1234567890123456789012345678901234567890',
  amount: 50,
  source: 'daily_bonus',
  timestamp: new Date(),
  description: 'Daily login bonus',
  ...overrides
});

export const mockNodeSession = (overrides: Partial<Record<string, unknown>> = {}) => ({
  _id: new mongoose.Types.ObjectId().toString(),
  walletAddress: '0x1234567890123456789012345678901234567890',
  startTime: new Date(),
  endTime: null,
  isActive: true,
  duration: 0,
  ...overrides
});

// HTTP Mock utilities
export interface MockRequestOptions {
  method?: string;
  url?: string;
  query?: Record<string, string | string[]>;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function createMockRequest(options: MockRequestOptions = {}) {
  // Ensure dependencies are initialized
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test' && !createMocks) {
    await initializeTestDependencies();
  }
  
  if (!createMocks) {
    throw new Error('node-mocks-http is required for createMockRequest. Install with: npm install --save-dev node-mocks-http');
  }
  
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: options.method || 'GET',
    url: options.url || '/api/test',
    query: options.query || {},
    body: options.body,
    headers: options.headers || {}
  });

  return { req, res };
}

export function createMockNextRequest(options: MockRequestOptions = {}): NextRequest {
  const url = options.url || 'http://localhost:3000/api/test';
  const searchParams = new URLSearchParams();
  
  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, v));
      } else {
        searchParams.set(key, value);
      }
    });
  }

  const fullUrl = searchParams.toString() 
    ? `${url}?${searchParams.toString()}`
    : url;

  return new NextRequest(fullUrl, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
}

// Database testing utilities
let mongoServer: { getUri(): string; stop(): Promise<void> } | undefined;

export async function setupTestDatabase(): Promise<string> {
  // Ensure dependencies are initialized
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test' && !MongoMemoryServer) {
    await initializeTestDependencies();
  }
  
  if (!MongoMemoryServer) {
    throw new Error('mongodb-memory-server is required for setupTestDatabase. Install with: npm install --save-dev mongodb-memory-server');
  }
  
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  await mongoose.connect(uri);
  return uri;
}

export async function teardownTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  
  if (mongoServer) {
    await mongoServer.stop();
  }
}

export async function clearTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
}

// Test data seeding
export async function seedLotteryWinners(count: number = 5): Promise<unknown[]> {
  const LotteryWinner = mongoose.model('LotteryWinner');
  const winners = Array.from({ length: count }, (_, i) => 
    mockLotteryWinner({
      walletAddress: `0x${i.toString().padStart(40, '0')}`,
      amount: (i + 1) * 100,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000) // i days ago
    })
  );
  
  return await LotteryWinner.insertMany(winners);
}

export async function seedUsers(count: number = 5): Promise<unknown[]> {
  const User = mongoose.model('User');
  const users = Array.from({ length: count }, (_, i) => 
    mockUser({
      walletAddress: `0x${i.toString().padStart(40, '0')}`,
      points: (i + 1) * 1000,
      nodeStatus: i % 2 === 0 ? 'active' : 'inactive'
    })
  );
  
  return await User.insertMany(users);
}

// Response testing utilities
export function expectSuccessResponse(response: unknown, expectedData?: unknown) {
  const res = response as { success: boolean; error?: unknown; data?: unknown };
  expect(res.success).toBe(true);
  expect(res.error).toBeUndefined();
  
  if (expectedData) {
    expect(res.data).toEqual(expect.objectContaining(expectedData as Record<string, unknown>));
  }
}

export function expectErrorResponse(
  response: unknown, 
  expectedCode?: string, 
  expectedMessage?: string
) {
  const res = response as { success: boolean; error?: string; code?: string };
  expect(res.success).toBe(false);
  expect(res.error).toBeDefined();
  
  if (expectedCode) {
    expect(res.code).toBe(expectedCode);
  }
  
  if (expectedMessage && res.error) {
    expect(res.error).toContain(expectedMessage);
  }
}

export function expectPaginationResponse(
  response: unknown,
  expectedPage: number,
  expectedLimit: number,
  expectedTotal?: number
) {
  const res = response as {
    pagination: {
      page: number;
      limit: number;
      total?: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  expect(res.pagination).toBeDefined();
  expect(res.pagination.page).toBe(expectedPage);
  expect(res.pagination.limit).toBe(expectedLimit);
  
  if (expectedTotal !== undefined) {
    expect(res.pagination.total).toBe(expectedTotal);
  }
  
  expect(res.pagination.totalPages).toBeGreaterThanOrEqual(1);
  expect(typeof res.pagination.hasNext).toBe('boolean');
  expect(typeof res.pagination.hasPrev).toBe('boolean');
}

// Performance testing utilities
export function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      resolve({ result, duration });
    } catch (error) {
      reject(error);
    }
  });
}

export function expectPerformance(
  duration: number,
  maxDuration: number,
  operation: string
) {
  if (duration > maxDuration) {
    console.warn(
      `Performance warning: ${operation} took ${duration}ms (max: ${maxDuration}ms)`
    );
  }
  
  expect(duration).toBeLessThanOrEqual(maxDuration);
}

// Environment setup for tests
export function setupTestEnvironment() {
  // Set test environment variables
  (process.env as { NODE_ENV?: string }).NODE_ENV = 'test';
  process.env.NEXT_MONGO_URI = 'mongodb://localhost:27017/test';
  
  // Mock console methods to reduce noise in tests
  const originalConsole = { ...console };
  
  beforeAll(() => {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });
  
  afterAll(() => {
    Object.assign(console, originalConsole);
  });
}

// Common test patterns
export const testApiEndpoint = {
  /**
   * Test GET endpoint with pagination
   */
  async testPagination(
    handler: (req: NextRequest) => Promise<Response>,
    baseUrl: string = '/api/test'
  ) {
    // Test default pagination
    const req1 = createMockNextRequest({ url: baseUrl });
    const res1 = await handler(req1);
    const data1 = await res1.json();
    
    expectSuccessResponse(data1);
    expectPaginationResponse(data1, 1, 10);
    
    // Test custom pagination
    const req2 = createMockNextRequest({
      url: baseUrl,
      query: { page: '2', limit: '5' }
    });
    const res2 = await handler(req2);
    const data2 = await res2.json();
    
    expectSuccessResponse(data2);
    expectPaginationResponse(data2, 2, 5);
  },
  
  /**
   * Test endpoint error handling
   */
  async testErrorHandling(
    handler: (req: NextRequest) => Promise<Response>,
    baseUrl: string = '/api/test'
  ) {
    // Test invalid method
    const req = createMockNextRequest({
      method: 'DELETE',
      url: baseUrl
    });
    const res = await handler(req);
    const data = await res.json();
    
    expect(res.status).toBe(405);
    expectErrorResponse(data, 'METHOD_NOT_ALLOWED');
  },
  
  /**
   * Test input validation
   */
  async testValidation(
    handler: (req: NextRequest) => Promise<Response>,
    baseUrl: string = '/api/test',
    invalidInputs: Record<string, unknown>[]
  ) {
    for (const invalidInput of invalidInputs) {
      const req = createMockNextRequest({
        method: 'POST',
        url: baseUrl,
        body: invalidInput
      });
      const res = await handler(req);
      const data = await res.json();
      
      expect(res.status).toBe(400);
      expectErrorResponse(data, 'VALIDATION_ERROR');
    }
  }
};

// Export commonly used test setup
export const commonTestSetup = {
  beforeAll: async () => {
    await setupTestDatabase();
  },
  
  afterAll: async () => {
    await teardownTestDatabase();
  },
  
  beforeEach: async () => {
    await clearTestDatabase();
  }
};