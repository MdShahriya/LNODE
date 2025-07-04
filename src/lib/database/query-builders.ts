/**
 * Database Query Builders
 * 
 * Reusable query builders for common database operations.
 * Provides type-safe aggregation pipeline construction.
 */

import type { AggregationPipeline, PaginationInfo } from '@/types/api';

/**
 * Base Query Builder class
 */
export class AggregationBuilder {
  private pipeline: AggregationPipeline = [];

  /**
   * Add a match stage to filter documents
   */
  match(conditions: Record<string, unknown>): this {
    this.pipeline.push({ $match: conditions });
    return this;
  }

  /**
   * Add a sort stage
   */
  sort(sortFields: Record<string, 1 | -1>): this {
    // Ensure proper typing for MongoDB sort values
    const typedSort: Record<string, 1 | -1> = {};
    Object.entries(sortFields).forEach(([key, value]) => {
      typedSort[key] = value as 1 | -1;
    });
    
    this.pipeline.push({ $sort: typedSort });
    return this;
  }

  /**
   * Add pagination (skip and limit)
   */
  paginate(page: number, limit: number): this {
    const skip = (page - 1) * limit;
    this.pipeline.push({ $skip: skip });
    this.pipeline.push({ $limit: limit });
    return this;
  }

  /**
   * Add a projection stage to select specific fields
   */
  project(fields: Record<string, 0 | 1 | unknown>): this {
    this.pipeline.push({ $project: fields });
    return this;
  }

  /**
   * Add a count stage
   */
  count(fieldName: string = 'total'): this {
    this.pipeline.push({ $count: fieldName });
    return this;
  }

  /**
   * Get the built pipeline
   */
  build(): AggregationPipeline {
    return [...this.pipeline];
  }

  /**
   * Reset the pipeline
   */
  reset(): this {
    this.pipeline = [];
    return this;
  }

  /**
   * Clone the current builder
   */
  clone(): AggregationBuilder {
    const newBuilder = new AggregationBuilder();
    newBuilder.pipeline = [...this.pipeline];
    return newBuilder;
  }
}

/**
 * Lottery Winners Query Builder
 */
export class LotteryWinnersQueryBuilder extends AggregationBuilder {
  /**
   * Filter by today's date
   */
  filterToday(): this {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    return this.match({
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });
  }

  /**
   * Filter by date range
   */
  filterDateRange(startDate: Date, endDate: Date): this {
    return this.match({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
  }

  /**
   * Filter by wallet address
   */
  filterByWallet(walletAddress: string): this {
    return this.match({ walletAddress });
  }

  /**
   * Sort by date (newest first by default)
   */
  sortByDate(order: 'asc' | 'desc' = 'desc'): this {
    return this.sort({ 
      date: (order === 'desc' ? -1 : 1) as -1 | 1,
      _id: 1 as const
    });
  }

  /**
   * Project only necessary fields for public API
   */
  projectPublicFields(): this {
    return this.project({
      _id: 1,
      walletAddress: 1,
      date: 1,
      amount: 1
    });
  }

  /**
   * Project all fields for admin API
   */
  projectAdminFields(): this {
    return this.project({
      _id: 1,
      walletAddress: 1,
      date: 1,
      amount: 1,
      transactionHash: 1,
      createdAt: 1,
      updatedAt: 1
    });
  }
}

/**
 * Users Query Builder
 */
export class UsersQueryBuilder extends AggregationBuilder {
  /**
   * Filter by node status
   */
  filterByNodeStatus(status: 'active' | 'inactive' | 'pending'): this {
    return this.match({ nodeStatus: status });
  }

  /**
   * Filter by verification status
   */
  filterByVerification(isVerified: boolean): this {
    return this.match({ isVerified });
  }

  /**
   * Filter by minimum points
   */
  filterByMinPoints(minPoints: number): this {
    return this.match({ points: { $gte: minPoints } });
  }

  /**
   * Sort by points (highest first by default)
   */
  sortByPoints(order: 'asc' | 'desc' = 'desc'): this {
    return this.sort({ 
      points: (order === 'desc' ? -1 : 1) as -1 | 1,
      _id: 1 as const
    });
  }

  /**
   * Search by wallet address or username
   */
  search(searchTerm: string): this {
    return this.match({
      $or: [
        { walletAddress: { $regex: searchTerm, $options: 'i' } },
        { username: { $regex: searchTerm, $options: 'i' } }
      ]
    });
  }

  /**
   * Project leaderboard fields
   */
  projectLeaderboardFields(): this {
    return this.project({
      _id: 1,
      walletAddress: 1,
      points: 1,
      nodeStatus: 1,
      isVerified: 1,
      username: 1
    });
  }
}

/**
 * Points History Query Builder
 */
export class PointsHistoryQueryBuilder extends AggregationBuilder {
  /**
   * Filter by wallet address
   */
  filterByWallet(walletAddress: string): this {
    return this.match({ walletAddress });
  }

  /**
   * Filter by source
   */
  filterBySource(source: string): this {
    return this.match({ source });
  }

  /**
   * Filter by date range
   */
  filterDateRange(startDate: Date, endDate: Date): this {
    return this.match({
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    });
  }

  /**
   * Filter by minimum amount
   */
  filterByMinAmount(minAmount: number): this {
    return this.match({ amount: { $gte: minAmount } });
  }

  /**
   * Sort by timestamp (newest first by default)
   */
  sortByTimestamp(order: 'asc' | 'desc' = 'desc'): this {
    return this.sort({ 
      timestamp: (order === 'desc' ? -1 : 1) as -1 | 1,
      _id: 1 as const
    });
  }
}

/**
 * Node Sessions Query Builder
 */
export class NodeSessionsQueryBuilder extends AggregationBuilder {
  /**
   * Filter by wallet address
   */
  filterByWallet(walletAddress: string): this {
    return this.match({ walletAddress });
  }

  /**
   * Filter by active status
   */
  filterByActiveStatus(isActive: boolean): this {
    return this.match({ isActive });
  }

  /**
   * Filter by date range
   */
  filterDateRange(startDate: Date, endDate: Date): this {
    return this.match({
      startTime: {
        $gte: startDate,
        $lte: endDate
      }
    });
  }

  /**
   * Sort by start time (newest first by default)
   */
  sortByStartTime(order: 'asc' | 'desc' = 'desc'): this {
    return this.sort({ 
      startTime: (order === 'desc' ? -1 : 1) as -1 | 1,
      _id: 1 as const
    });
  }
}

/**
 * Helper function to create pagination info
 */
export function createPaginationInfo(
  page: number,
  limit: number,
  total: number
): PaginationInfo {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

/**
 * Helper function to get count pipeline
 */
export function getCountPipeline(matchConditions: Record<string, unknown>): AggregationPipeline {
  return new AggregationBuilder()
    .match(matchConditions)
    .count('total')
    .build();
}

/**
 * Helper function to get today's date range
 */
export function getTodayDateRange(): { startOfDay: Date; endOfDay: Date } {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  
  return { startOfDay, endOfDay };
}

/**
 * Pre-built query for today's lottery winners
 */
export function getTodaysWinnersPipeline(page: number = 1, limit: number = 10): AggregationPipeline {
  return new LotteryWinnersQueryBuilder()
    .filterToday()
    .sortByDate('desc')
    .paginate(page, limit)
    .projectPublicFields()
    .build();
}

/**
 * Pre-built query for user leaderboard - optimized for compound indexes
 */
export function getLeaderboardPipeline(page: number = 1, limit: number = 10): AggregationPipeline {
  return new UsersQueryBuilder()
    .match({ nodeStatus: true, isActive: true }) // Use compound index
    .sort({ points: -1, _id: 1 }) // Efficient pagination
    .paginate(page, limit)
    .projectLeaderboardFields()
    .build();
}

/**
 * Optimized query for active users with points filtering
 */
export function getActiveUsersWithMinPointsPipeline(
  minPoints: number, 
  page: number = 1, 
  limit: number = 10
): AggregationPipeline {
  return new UsersQueryBuilder()
    .match({ 
      isActive: true, 
      points: { $gte: minPoints }
    })
    .sort({ points: -1, _id: 1 })
    .paginate(page, limit)
    .projectLeaderboardFields()
    .build();
}

/**
 * Optimized query for user analytics with date range
 */
export function getUserAnalyticsPipeline(
  startDate: Date,
  endDate: Date
): AggregationPipeline {
  return new UsersQueryBuilder()
    .match({
      createdAt: { $gte: startDate, $lte: endDate }
    })
    .sort({ createdAt: -1, _id: 1 })
    .build();
}