import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import PointsHistory from '@/models/PointsHistory';
import User, { IUser } from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const dateParam = searchParams.get('date');
    const includeDetails = searchParams.get('includeDetails') === 'true';
    const includeComparison = searchParams.get('includeComparison') === 'true';
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    // Parse date or use today's date
    let targetDate: Date;
    if (dateParam) {
      targetDate = new Date(dateParam);
    } else {
      targetDate = new Date();
    }
    
    // Set time to beginning of the day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    // Set time to end of the day
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Enhanced aggregation pipeline for detailed analytics
    const aggregationPipeline = [
      {
        $match: {
          walletAddress: walletAddress.toLowerCase(),
          timestamp: { $gte: startOfDay, $lte: endOfDay },
          isExpired: { $ne: true }
        }
      },
      {
        $group: {
          _id: null,
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
          avgMultiplier: { $avg: { $ifNull: ['$multiplier', 1] } },
          maxSingleTransaction: { $max: '$points' },
          minSingleTransaction: { $min: '$points' },
          sources: { $addToSet: '$source' },
          subSources: { $addToSet: '$subSource' },
          sessionIds: { $addToSet: '$sessionId' },
          verifiedTransactions: {
            $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
          },
          pendingTransactions: {
            $sum: { $cond: [{ $eq: ['$isVerified', false] }, 1, 0] }
          }
        }
      }
    ];
    
    const [aggregationResult] = await PointsHistory.aggregate(aggregationPipeline);
    
    // Get detailed breakdown by source and sub-source
    const sourceBreakdown = await PointsHistory.aggregate([
      {
        $match: {
          walletAddress: walletAddress.toLowerCase(),
          timestamp: { $gte: startOfDay, $lte: endOfDay },
          isExpired: { $ne: true }
        }
      },
      {
        $group: {
          _id: {
            source: '$source',
            subSource: '$subSource'
          },
          points: { $sum: '$points' },
          basePoints: { $sum: '$basePoints' },
          transactionCount: { $sum: 1 },
          avgMultiplier: { $avg: { $ifNull: ['$multiplier', 1] } },
          maxPoints: { $max: '$points' },
          minPoints: { $min: '$points' },
          verifiedCount: {
            $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
          }
        }
      },
      {
        $sort: { points: -1 }
      }
    ]);
    
    // Get hourly breakdown for the day
    const hourlyBreakdown = await PointsHistory.aggregate([
      {
        $match: {
          walletAddress: walletAddress.toLowerCase(),
          timestamp: { $gte: startOfDay, $lte: endOfDay },
          isExpired: { $ne: true }
        }
      },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          points: { $sum: '$points' },
          transactionCount: { $sum: 1 },
          avgMultiplier: { $avg: { $ifNull: ['$multiplier', 1] } }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);
    
    // Fill missing hours with zero values
    const completeHourlyBreakdown = Array.from({ length: 24 }, (_, hour) => {
      const hourData = hourlyBreakdown.find(h => h._id === hour);
      return {
        hour,
        totalPoints: hourData?.points || 0,
        totalBasePoints: hourData?.basePoints || 0,
        totalBonusPoints: hourData?.bonusPoints || 0,
        transactionCount: hourData?.transactionCount || 0,
        creditTransactions: hourData?.creditTransactions || 0,
        debitTransactions: hourData?.debitTransactions || 0,
        avgMultiplier: hourData?.avgMultiplier || 1,
        sources: hourData?.sources || []
      };
    });
    
    let comparisonData = null;
    if (includeComparison) {
      // Get previous day data for comparison
      const previousDay = new Date(startOfDay);
      previousDay.setDate(previousDay.getDate() - 1);
      const previousDayEnd = new Date(previousDay);
      previousDayEnd.setHours(23, 59, 59, 999);
      
      const [previousDayResult] = await PointsHistory.aggregate([
        {
          $match: {
            walletAddress: walletAddress.toLowerCase(),
            timestamp: { $gte: previousDay, $lte: previousDayEnd },
            isExpired: { $ne: true }
          }
        },
        {
          $group: {
            _id: null,
            totalPoints: { $sum: '$points' },
            transactionCount: { $sum: 1 }
          }
        }
      ]);
      
      if (previousDayResult) {
        const pointsChange = (aggregationResult?.totalPoints || 0) - previousDayResult.totalPoints;
        const transactionChange = (aggregationResult?.transactionCount || 0) - previousDayResult.transactionCount;
        
        comparisonData = {
          previousDay: {
            totalPoints: previousDayResult.totalPoints,
            totalBasePoints: previousDayResult.totalBasePoints || 0,
            totalBonusPoints: previousDayResult.totalBonusPoints || 0,
            transactionCount: previousDayResult.transactionCount,
            creditTransactions: previousDayResult.creditTransactions || 0,
            debitTransactions: previousDayResult.debitTransactions || 0,
            avgMultiplier: previousDayResult.avgMultiplier || 1
          },
          changes: {
            pointsChange: pointsChange,
            pointsPercentage: previousDayResult.totalPoints > 0 ? 
              (pointsChange / previousDayResult.totalPoints) * 100 : 0,
            transactionChange: transactionChange,
            transactionsPercentage: previousDayResult.transactionCount > 0 ? 
              (transactionChange / previousDayResult.transactionCount) * 100 : 0
          }
        };
      }
    }
    
    // Get user's current streak and total earnings if requested
    let userStats = null;
    if (includeDetails) {
      const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() }).lean() as IUser | null;
      if (user) {
        userStats = {
          totalEarnings: user.totalEarnings || 0,
          currentStreak: user.currentStreak || 0,
          maxStreak: user.maxStreak || 0,
          totalSessions: user.totalSessions || 0,
          averageSessionDuration: user.averageSessionDuration || 0,
          lastActiveTime: user.lastActiveTime
        };
      }
    }
    
    // Process source breakdown for response
    const processedSourceBreakdown = sourceBreakdown.reduce((acc, item) => {
      const source = item._id.source || 'other';
      const subSource = item._id.subSource;
      
      if (!acc[source]) {
        acc[source] = {
          total: 0,
          basePoints: 0,
          transactions: 0,
          subSources: {},
          avgMultiplier: 0,
          maxPoints: 0,
          verifiedPercentage: 0
        };
      }
      
      acc[source].total += item.points;
      acc[source].basePoints += item.basePoints || 0;
      acc[source].transactions += item.transactionCount;
      acc[source].maxPoints = Math.max(acc[source].maxPoints, item.maxPoints || 0);
      
      if (subSource) {
        acc[source].subSources[subSource] = {
          points: item.points,
          transactions: item.transactionCount,
          avgMultiplier: item.avgMultiplier,
          verifiedPercentage: item.transactionCount > 0 ? 
            (item.verifiedCount / item.transactionCount) * 100 : 0
        };
      }
      
      return acc;
    }, {} as SourceBreakdown);
    
    // Define interface for source breakdown data
    interface SourceBreakdownItem {
      totalPoints: number;
      totalBasePoints: number;
      totalBonusPoints: number;
      transactionCount: number;
      creditTransactions: number;
      debitTransactions: number;
      avgMultiplier: number;
    }
    
    // Use the base type directly instead of an empty interface
    type SourceBreakdownSubSource = SourceBreakdownItem;
    
    interface SourceBreakdownEntry extends SourceBreakdownItem {
      sources: string[];
      subSources: {
        [key: string]: SourceBreakdownSubSource;
      };
    }
    
    type SourceBreakdown = Record<string, SourceBreakdownEntry>;
    
    // Calculate overall statistics
    const sources = aggregationResult?.sources || [];
    const topSourceData = (Object.entries(processedSourceBreakdown) as [string, SourceBreakdownEntry][])
      .sort(([,a], [,b]) => b.totalPoints - a.totalPoints)[0];
    
    const stats = {
      totalPoints: aggregationResult?.totalPoints || 0,
      totalBasePoints: aggregationResult?.totalBasePoints || 0,
      totalBonusPoints: aggregationResult?.totalBonusPoints || 0,
      transactionCount: aggregationResult?.transactionCount || 0,
      creditTransactions: aggregationResult?.creditTransactions || 0,
      debitTransactions: aggregationResult?.debitTransactions || 0,
      avgMultiplier: aggregationResult?.avgMultiplier || 1,
      sources: sources,
      topSource: topSourceData ? topSourceData[0] : 'none',
      topSourcePoints: topSourceData ? (topSourceData[1] as SourceBreakdownEntry).totalPoints : 0,
      maxSingleTransaction: aggregationResult?.maxSingleTransaction || 0,
      minSingleTransaction: aggregationResult?.minSingleTransaction || 0,
      uniqueSources: sources.length,
      uniqueSubSources: aggregationResult?.subSources?.length || 0,
      uniqueSessions: aggregationResult?.sessionIds?.length || 0,
      verifiedTransactions: aggregationResult?.verifiedTransactions || 0,
      pendingTransactions: aggregationResult?.pendingTransactions || 0,
      verificationRate: aggregationResult?.transactionCount > 0 ? 
        (aggregationResult.verifiedTransactions / aggregationResult.transactionCount) * 100 : 0,
      avgPointsPerTransaction: aggregationResult?.transactionCount > 0 ? 
        aggregationResult.totalPoints / aggregationResult.transactionCount : 0,
      bonusPointsPercentage: aggregationResult?.totalPoints > 0 ? 
        (aggregationResult.totalBonusPoints / aggregationResult.totalPoints) * 100 : 0
    };
    
    interface DailyEarningsResponse {
      success: boolean;
      date: string;
      stats: {
        totalPoints: number;
        totalBasePoints: number;
        totalBonusPoints: number;
        transactionCount: number;
        creditTransactions: number;
        debitTransactions: number;
        avgMultiplier: number;
        sources: string[];
        topSource: string;
        topSourcePoints: number;
        maxSingleTransaction: number;
        minSingleTransaction: number;
        uniqueSources: number;
        uniqueSubSources: number;
        uniqueSessions: number;
        verifiedTransactions: number;
        pendingTransactions: number;
        verificationRate: number;
        avgPointsPerTransaction: number;
        bonusPointsPercentage: number;
      };
      sourceBreakdown: Record<string, {
        totalPoints: number;
        totalBasePoints: number;
        totalBonusPoints: number;
        transactionCount: number;
        creditTransactions: number;
        debitTransactions: number;
        avgMultiplier: number;
        sources: string[];
        subSources: {
          [key: string]: {
            totalPoints: number;
            totalBasePoints: number;
            totalBonusPoints: number;
            transactionCount: number;
            creditTransactions: number;
            debitTransactions: number;
            avgMultiplier: number;
          };
        };
      }>;
      hourlyBreakdown: Array<{
        hour: number;
        totalPoints: number;
        totalBasePoints: number;
        totalBonusPoints: number;
        transactionCount: number;
        creditTransactions: number;
        debitTransactions: number;
        avgMultiplier: number;
        sources: string[];
      }>;
      userStats?: {
        totalEarnings: {
          daily: number;
          weekly: number;
          monthly: number;
        };
        currentStreak: number;
        maxStreak: number;
        totalSessions: number;
        averageSessionDuration: number;
        lastActiveTime: Date | null;
      };
      comparison?: {
        previousDay: {
          totalPoints: number;
          totalBasePoints: number;
          totalBonusPoints: number;
          transactionCount: number;
          creditTransactions: number;
          debitTransactions: number;
          avgMultiplier: number;
        };
        changes: {
          pointsChange: number;
          pointsPercentage: number;
          transactionChange: number;
          transactionsPercentage: number;
        };
      };
    }

    const response: DailyEarningsResponse = {
      success: true,
      date: startOfDay.toISOString().split('T')[0],
      stats,
      sourceBreakdown: processedSourceBreakdown,
      hourlyBreakdown: completeHourlyBreakdown
    };
    
    if (includeComparison && comparisonData) {
      response.comparison = comparisonData;
    }
    
    if (includeDetails && userStats) {
      response.userStats = userStats;
    }
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching daily earnings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily earnings' },
      { status: 500 }
    );
  }
}