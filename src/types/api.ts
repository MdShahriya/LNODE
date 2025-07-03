/**
 * API Types and Interfaces for TOPAY Foundation Dashboard
 * 
 * This file contains TypeScript interfaces for API responses,
 * aggregation pipelines, and common data structures.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface LotteryWinnerResponse {
  _id: string;
  walletAddress: string;
  date: string;
  amount: number;
  transactionHash?: string;
}

export interface UserStatsResponse {
  _id: string;
  walletAddress: string;
  points: number;
  nodeStatus: 'active' | 'inactive' | 'pending';
  isVerified: boolean;
  joinedAt: string;
}

// MongoDB Aggregation Pipeline Types
export interface SortStage {
  $sort: Record<string, 1 | -1>;
}

export interface MatchStage {
  $match: Record<string, unknown>;
}

export interface ProjectStage {
  $project: Record<string, 0 | 1 | unknown>;
}

export interface SkipStage {
  $skip: number;
}

export interface LimitStage {
  $limit: number;
}

export interface CountStage {
  $count: string;
}

export type AggregationStage = 
  | SortStage 
  | MatchStage 
  | ProjectStage 
  | SkipStage 
  | LimitStage 
  | CountStage;

export type AggregationPipeline = AggregationStage[];

// Query Parameters
export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
}

export interface LotteryWinnersQuery extends PaginationQuery, DateRangeQuery {
  walletAddress?: string;
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

// Database Query Builders
export interface QueryBuilder<T = unknown> {
  build(): T;
  addMatch(conditions: Record<string, unknown>): QueryBuilder<T>;
  addSort(sort: Record<string, 1 | -1>): QueryBuilder<T>;
  addPagination(page: number, limit: number): QueryBuilder<T>;
  addProjection(fields: Record<string, 0 | 1>): QueryBuilder<T>;
}

// Configuration Types
export interface ApiConfig {
  defaultPageSize: number;
  maxPageSize: number;
  defaultSortField: string;
  defaultSortOrder: 1 | -1;
  enableCaching: boolean;
  cacheTimeout: number;
}

// Monitoring and Logging
export interface QueryMetrics {
  executionTime: number;
  documentsScanned: number;
  documentsReturned: number;
  indexesUsed: string[];
  queryPlan?: unknown;
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}