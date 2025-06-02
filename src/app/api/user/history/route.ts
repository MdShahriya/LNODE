import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import UserHistory, { IUserHistory } from '@/models/UserHistory';
import PointsHistory, { IPointsHistory } from '@/models/PointsHistory';
import { FilterQuery } from 'mongoose';
import { getGroupingId, processPointsAggregationForChart, calculatePointsSummary, processConnectionAggregationForChart, calculateConnectionsSummary } from './helpers';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const days = parseInt(searchParams.get('days') || '7', 10);
    const type = searchParams.get('type') || 'all';
    const dataType = searchParams.get('dataType') || 'points'; // 'points' or 'connections'
    const granularity = searchParams.get('granularity') || 'daily'; // 'hourly', 'daily', 'weekly'
    const includeMetrics = searchParams.get('includeMetrics') === 'true';
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    // Calculate date range with better handling
    const endDate = new Date();
    const startDate = new Date();
    
    // Adjust date range based on granularity
    if (granularity === 'hourly') {
      startDate.setHours(endDate.getHours() - Math.min(days * 24, 168)); // Max 7 days for hourly
    } else if (granularity === 'weekly') {
      startDate.setDate(endDate.getDate() - (days * 7));
    } else {
      startDate.setDate(endDate.getDate() - days);
    }
    
    // Determine which data to fetch based on dataType
    if (dataType === 'points') {
      // Build enhanced query for PointsHistory
      const query: FilterQuery<IPointsHistory> = {
        walletAddress: walletAddress.toLowerCase(),
        timestamp: { $gte: startDate, $lte: endDate },
        isVerified: true // Only include verified transactions
      };
      
      // Filter by source type if specified
      if (type !== 'all') {
        if (type.includes(',')) {
          query.source = { $in: type.split(',') };
        } else {
          query.source = type;
        }
      }
      
      // Get points history with enhanced aggregation
      const pointsAggregation = await PointsHistory.aggregate([
        { $match: query },
        {
          $group: {
            _id: getGroupingId(granularity),
            totalPoints: { $sum: '$points' },
            totalBasePoints: { $sum: '$basePoints' },
            totalBonusPoints: { $sum: { $subtract: ['$points', { $ifNull: ['$basePoints', '$points'] }] } },
            transactionCount: { $sum: 1 },
            creditTransactions: {
              $sum: { $cond: [{ $eq: ['$transactionType', 'credit'] }, 1, 0] }
            },
            debitTransactions: {
              $sum: { $cond: [{ $eq: ['$transactionType', 'debit'] }, 1, 0] }
            },
            sources: { $addToSet: '$source' },
            avgMultiplier: { $avg: '$multiplier' },
            maxPoints: { $max: '$points' },
            minPoints: { $min: '$points' },
            firstTransaction: { $min: '$timestamp' },
            lastTransaction: { $max: '$timestamp' }
          }
        },
        { $sort: { '_id': 1 } }
      ]);
      
      // Get detailed records if requested
      const detailedRecords = includeMetrics ? await PointsHistory.find(query)
        .sort({ timestamp: -1 })
        .limit(100)
        .lean() : [];
      
      // Process data for chart display
      const processedData = processPointsAggregationForChart(pointsAggregation, startDate, endDate, granularity);
      
      // Calculate summary statistics
      const summary = calculatePointsSummary(pointsAggregation);
      
      return NextResponse.json({ 
        success: true,
        dataType: 'points',
        granularity,
        data: processedData,
        summary,
        detailedRecords: includeMetrics ? detailedRecords : undefined,
        dateRange: { startDate, endDate }
      }, { status: 200 });
    } else {
      // Build enhanced query for UserHistory (connections)
      const query: FilterQuery<IUserHistory> = {
        walletAddress: walletAddress.toLowerCase(),
        timestamp: { $gte: startDate, $lte: endDate }
      };
      
      // Filter by connection type if specified
      if (type !== 'all') {
        if (type.includes(',')) {
          query.connectionType = { $in: type.split(',') };
        } else {
          query.connectionType = type;
        }
      }
      
      // Get connection history with enhanced aggregation
      const connectionAggregation = await UserHistory.aggregate([
        { $match: query },
        {
          $group: {
            _id: getGroupingId(granularity),
            totalSessions: { $sum: 1 },
            uniqueSessions: { $addToSet: '$sessionId' },
            totalUptime: { $sum: '$uptime' },
            totalSessionDuration: { $sum: '$sessionDuration' },
            totalPointsEarned: { $sum: '$pointsEarned' },
            connectionTypes: { $addToSet: '$connectionType' },
            activityTypes: { $addToSet: '$activityType' },
            deviceTypes: { $addToSet: '$deviceType' },
            uniqueIPs: { $addToSet: '$deviceIP' },
            totalErrors: { $sum: '$errorCount' },
            totalWarnings: { $sum: '$warningCount' },
            // Performance metrics
            avgCpuUsage: { $avg: '$performanceMetrics.cpuUsage' },
            avgMemoryUsage: { $avg: '$performanceMetrics.memoryUsage' },
            avgNetworkLatency: { $avg: '$performanceMetrics.networkLatency' },
            // Network info
            networkTypes: { $addToSet: '$networkInfo.connectionType' },
            effectiveTypes: { $addToSet: '$networkInfo.effectiveType' },
            // Geographic data
            countries: { $addToSet: '$geolocation.country' },
            regions: { $addToSet: '$geolocation.region' },
            cities: { $addToSet: '$geolocation.city' },
            firstConnection: { $min: '$timestamp' },
            lastConnection: { $max: '$timestamp' },
            lastHeartbeat: { $max: '$lastHeartbeat' }
          }
        },
        {
          $addFields: {
            uniqueSessionCount: { $size: '$uniqueSessions' },
            avgSessionDuration: {
              $cond: [
                { $gt: ['$uniqueSessionCount', 0] },
                { $divide: ['$totalSessionDuration', '$uniqueSessionCount'] },
                0
              ]
            }
          }
        },
        { $sort: { '_id': 1 } }
      ]);
      
      // Get detailed records if requested
      const detailedRecords = includeMetrics ? await UserHistory.find(query)
        .sort({ timestamp: -1 })
        .limit(100)
        .lean() : [];
      
      // Process data for chart display
      const processedData = processConnectionAggregationForChart(connectionAggregation, startDate, endDate, granularity);
      
      // Calculate summary statistics
      const summary = calculateConnectionsSummary(connectionAggregation);
      
      return NextResponse.json({ 
        success: true,
        dataType: 'connections',
        granularity,
        data: processedData,
        summary,
        detailedRecords: includeMetrics ? detailedRecords : undefined,
        dateRange: { startDate, endDate }
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error fetching user history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user history' },
      { status: 500 }
    );
  }
}
