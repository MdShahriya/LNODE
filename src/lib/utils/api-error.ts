/**
 * API Error Handling Utilities
 * 
 * Provides structured error handling for API routes with consistent
 * error responses and proper HTTP status codes.
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, PaginationInfo } from '@/types/api';

export class ApiErrorClass extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code: string, statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiErrorClass);
    }
  }
}

// Predefined error types
export const ApiErrors = {
  // Client Errors (4xx)
  VALIDATION_ERROR: (message: string, details?: unknown) => 
    new ApiErrorClass(message, 'VALIDATION_ERROR', 400, details),
  
  UNAUTHORIZED: (message: string = 'Unauthorized access') => 
    new ApiErrorClass(message, 'UNAUTHORIZED', 401),
  
  FORBIDDEN: (message: string = 'Access forbidden') => 
    new ApiErrorClass(message, 'FORBIDDEN', 403),
  
  NOT_FOUND: (message: string = 'Resource not found') => 
    new ApiErrorClass(message, 'NOT_FOUND', 404),
  
  METHOD_NOT_ALLOWED: (method: string) => 
    new ApiErrorClass(`Method ${method} not allowed`, 'METHOD_NOT_ALLOWED', 405),
  
  CONFLICT: (message: string) => 
    new ApiErrorClass(message, 'CONFLICT', 409),
  
  RATE_LIMIT_EXCEEDED: (message: string = 'Rate limit exceeded') => 
    new ApiErrorClass(message, 'RATE_LIMIT_EXCEEDED', 429),
  
  // Server Errors (5xx)
  INTERNAL_SERVER_ERROR: (message: string = 'Internal server error') => 
    new ApiErrorClass(message, 'INTERNAL_SERVER_ERROR', 500),
  
  DATABASE_ERROR: (message: string = 'Database operation failed') => 
    new ApiErrorClass(message, 'DATABASE_ERROR', 500),
  
  EXTERNAL_SERVICE_ERROR: (service: string, message?: string) => 
    new ApiErrorClass(
      message || `External service ${service} is unavailable`, 
      'EXTERNAL_SERVICE_ERROR', 
      502
    ),
  
  SERVICE_UNAVAILABLE: (message: string = 'Service temporarily unavailable') => 
    new ApiErrorClass(message, 'SERVICE_UNAVAILABLE', 503),
};

/**
 * Handles API errors and returns consistent error responses
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error('API Error:', error);

  // Handle our custom ApiError
  if (error instanceof ApiErrorClass) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details || undefined
      },
      { status: error.statusCode }
    );
  }

  // Handle MongoDB errors
  if (error && typeof error === 'object' && 'code' in error) {
    const mongoError = error as unknown;
    
    switch ((mongoError as { code: number }).code) {
      case 11000: // Duplicate key error
        return NextResponse.json(
          {
            success: false,
            error: 'Duplicate entry found',
            code: 'DUPLICATE_ENTRY'
          },
          { status: 409 }
        );
      
      case 121: // Document validation failed
        return NextResponse.json(
          {
            success: false,
            error: 'Document validation failed',
            code: 'VALIDATION_ERROR',
            details: (mongoError as { errInfo?: unknown }).errInfo
          },
          { status: 400 }
        );
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'An unexpected error occurred',
        code: 'INTERNAL_SERVER_ERROR',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      { status: 500 }
    );
  }

  // Fallback for unknown errors
  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    },
    { status: 500 }
  );
}

/**
 * Creates a success response with optional data and pagination
 */
export function createSuccessResponse<T>(
  data?: T,
  message?: string,
  pagination?: PaginationInfo
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
    ...(pagination && { pagination })
  });
}

/**
 * Validates that required environment variables are set
 */
export function validateEnvironment(requiredVars: string[]): void {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw ApiErrors.INTERNAL_SERVER_ERROR(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

/**
 * Async wrapper that automatically handles errors
 */
export function withErrorHandling<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<NextResponse<ApiResponse<R>>> => {
    try {
      const result = await handler(...args);
      // If result is already a NextResponse, return it; otherwise wrap it
      if (result && typeof result === 'object' && 'json' in result) {
        return result as unknown as NextResponse<ApiResponse<R>>;
      }
      return createSuccessResponse(result as R);
    } catch (error) {
      return handleApiError(error) as NextResponse<ApiResponse<R>>;
    }
  };
}