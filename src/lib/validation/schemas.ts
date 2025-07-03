/**
 * Request Validation Schemas
 * 
 * Zod schemas for validating API request parameters and body data.
 * Provides type-safe validation with detailed error messages.
 */

import { z } from 'zod';

// Common validation patterns
const walletAddressSchema = z.string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format');

// MongoDB ObjectId schema (available for future use)
// const mongoIdSchema = z.string()
//   .regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId format');

const dateStringSchema = z.string()
  .refine((date) => !isNaN(Date.parse(date)), 'Invalid date format');

// Pagination schemas
export const paginationSchema = z.object({
  page: z.string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 1)
    .refine((val) => val > 0, 'Page must be greater than 0'),
  
  limit: z.string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 10)
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100')
});

// Date range schema (base object without refinement)
const baseDateRangeSchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional()
});

// Date range schema with validation
export const dateRangeSchema = baseDateRangeSchema.refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'Start date must be before or equal to end date',
    path: ['dateRange']
  }
);

// Lottery Winners API schemas
export const lotteryWinnersQuerySchema = paginationSchema.merge(
  baseDateRangeSchema
).extend({
  walletAddress: walletAddressSchema.optional()
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'Start date must be before or equal to end date',
    path: ['dateRange']
  }
);

export const lotteryWinnerCreateSchema = z.object({
  walletAddress: walletAddressSchema,
  amount: z.number().positive('Amount must be positive'),
  date: dateStringSchema.optional().default(() => new Date().toISOString()),
  transactionHash: z.string().optional()
});

// User API schemas
export const userQuerySchema = paginationSchema.extend({
  nodeStatus: z.enum(['active', 'inactive', 'pending']).optional(),
  isVerified: z.string()
    .optional()
    .transform((val) => val === 'true')
    .pipe(z.boolean()),
  minPoints: z.string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : undefined)
    .pipe(z.number().min(0).optional())
});

export const userUpdateSchema = z.object({
  walletAddress: walletAddressSchema,
  nodeStatus: z.enum(['active', 'inactive', 'pending']).optional(),
  isVerified: z.boolean().optional(),
  points: z.number().min(0).optional()
});

// Points History schemas
export const pointsHistoryQuerySchema = paginationSchema.merge(
  baseDateRangeSchema
).extend({
  walletAddress: walletAddressSchema.optional(),
  source: z.string().optional(),
  minAmount: z.string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : undefined)
    .pipe(z.number().min(0).optional())
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'Start date must be before or equal to end date',
    path: ['dateRange']
  }
);

export const pointsHistoryCreateSchema = z.object({
  walletAddress: walletAddressSchema,
  amount: z.number(),
  source: z.string().min(1, 'Source is required'),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

// Node Session schemas
export const nodeSessionQuerySchema = paginationSchema.merge(
  baseDateRangeSchema
).extend({
  walletAddress: walletAddressSchema.optional(),
  isActive: z.string()
    .optional()
    .transform((val) => val === 'true')
    .pipe(z.boolean().optional())
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'Start date must be before or equal to end date',
    path: ['dateRange']
  }
);

export const nodeSessionCreateSchema = z.object({
  walletAddress: walletAddressSchema,
  startTime: dateStringSchema.optional().default(() => new Date().toISOString()),
  endTime: dateStringSchema.optional(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional()
});

// Admin schemas
export const adminQuerySchema = paginationSchema.merge(
  baseDateRangeSchema
).extend({
  sortBy: z.enum(['date', 'amount', 'walletAddress', 'points']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional()
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'Start date must be before or equal to end date',
    path: ['dateRange']
  }
);

// Contact form schema
export const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  category: z.enum(['general', 'technical', 'billing', 'feedback']).optional()
});

// Referral schema
export const referralSchema = z.object({
  referrerAddress: walletAddressSchema,
  refereeAddress: walletAddressSchema,
  code: z.string().min(6, 'Referral code must be at least 6 characters')
}).refine(
  (data) => data.referrerAddress !== data.refereeAddress,
  {
    message: 'Referrer and referee cannot be the same address',
    path: ['refereeAddress']
  }
);

// Health check schema
export const healthCheckSchema = z.object({
  includeDatabase: z.string()
    .optional()
    .transform((val) => val === 'true')
    .pipe(z.boolean().optional()),
  includeExternal: z.string()
    .optional()
    .transform((val) => val === 'true')
    .pipe(z.boolean().optional())
});

// Export types for TypeScript inference
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type DateRangeQuery = z.infer<typeof dateRangeSchema>;
export type LotteryWinnersQuery = z.infer<typeof lotteryWinnersQuerySchema>;
export type LotteryWinnerCreate = z.infer<typeof lotteryWinnerCreateSchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type PointsHistoryQuery = z.infer<typeof pointsHistoryQuerySchema>;
export type PointsHistoryCreate = z.infer<typeof pointsHistoryCreateSchema>;
export type NodeSessionQuery = z.infer<typeof nodeSessionQuerySchema>;
export type NodeSessionCreate = z.infer<typeof nodeSessionCreateSchema>;
export type AdminQuery = z.infer<typeof adminQuerySchema>;
export type ContactForm = z.infer<typeof contactFormSchema>;
export type Referral = z.infer<typeof referralSchema>;
export type HealthCheck = z.infer<typeof healthCheckSchema>;

/**
 * Validation helper function
 */
export function validateRequest<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
}

/**
 * Format Zod errors for API responses
 */
export function formatValidationErrors(error: z.ZodError): Array<{
  field: string;
  message: string;
  value?: unknown;
}> {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    value: err.code === 'invalid_type' ? undefined : (err as unknown as z.ZodInvalidTypeIssue).received
  }));
}