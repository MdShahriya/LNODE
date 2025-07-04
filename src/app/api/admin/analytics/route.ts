import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import NodeSession from '@/models/NodeSession';
import PointsHistory from '@/models/PointsHistory';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week'; // 'day', 'week', 'month', 'all'
    
    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'all':
        startDate.setFullYear(2020); // Set to a date before project started
        break;
      default:
        startDate.setDate(endDate.getDate() - 7); // Default to week
    }
    
    // Get total users - use estimatedDocumentCount for better performance on large collections
    const totalUsers = await User.estimatedDocumentCount();
    
    // Get active users (users with node activity in the period) - optimized aggregation
    const activeUsersResult = await NodeSession.aggregate([
      { 
        $match: { 
          startTime: { $gte: startDate, $lte: endDate },
          status: 'active'
        } 
      },
      {
        $group: {
          _id: '$walletAddress'
        }
      },
      {
        $count: 'activeUsers'
      }
    ]);
    const activeUsers = activeUsersResult[0]?.activeUsers || 0;
    
    // Get total earnings in the period from PointsHistory
    const earningsResult = await PointsHistory.aggregate([
      { 
        $match: { 
          timestamp: { $gte: startDate, $lte: endDate } 
        } 
      },
      {
        $group: {
          _id: '$source',
          totalPoints: { $sum: '$points' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get device statistics from NodeSession
    const deviceStats = await NodeSession.aggregate([
      { 
        $match: { 
          startTime: { $gte: startDate, $lte: endDate }
        } 
      },
      {
        $group: {
          _id: {
            deviceType: "$deviceType",
            browser: "$browser",
            platform: "$platform"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get daily activity from PointsHistory
    const dailyPointsActivity = await PointsHistory.aggregate([
      { 
        $match: { 
          timestamp: { $gte: startDate, $lte: endDate } 
        } 
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            source: "$source"
          },
          points: { $sum: "$points" },
          count: { $sum: 1 }
        }
      },
      { 
        $sort: { "_id.date": 1 } 
      }
    ]);
    
    // Get daily node activity from NodeSession
    const dailyNodeActivity = await NodeSession.aggregate([
      { 
        $match: { 
          startTime: { $gte: startDate, $lte: endDate } 
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$startTime" } },
          sessions: { $sum: 1 },
          uniqueUsers: { $addToSet: "$walletAddress" },
          totalUptime: { $sum: "$uptime" },
          avgUptime: { $avg: "$uptime" }
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          sessions: 1,
          uniqueUsers: { $size: "$uniqueUsers" },
          totalUptime: 1,
          avgUptime: 1
        }
      },
      { $sort: { date: 1 } }
    ]);
    
    // Get user growth over time - optimized with date range filter
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          newUsers: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get top users by points - optimized with compound index
    const topUsers = await User.find({ isActive: true })
      .sort({ points: -1, _id: 1 })
      .limit(10)
      .select('walletAddress points uptime totalSessions nodeStatus')
      .lean(); // Use lean() for better performance when not modifying documents
    
    // Format earnings data
    const earnings: Record<string, { totalPoints: number; count: number }> = {};
    earningsResult.forEach(item => {
      earnings[item._id || 'unknown'] = {
        totalPoints: item.totalPoints,
        count: item.count
      };
    });
    
    // Calculate total points in the period
    const totalPointsInPeriod = earningsResult.reduce((sum, item) => sum + item.totalPoints, 0);
    
    // Format device stats
    const devices = deviceStats.map(item => ({
      deviceType: item._id.deviceType || 'unknown',
      browser: item._id.browser || 'unknown',
      platform: item._id.platform || 'unknown',
      count: item.count
    }));
    
    // Format daily activity
    const dailyActivity: Record<string, Record<string, { points: number; count: number }>> = {};
    dailyPointsActivity.forEach(item => {
      const date = item._id.date;
      const source = item._id.source || 'unknown';
      
      if (!dailyActivity[date]) {
        dailyActivity[date] = {};
      }
      
      dailyActivity[date][source] = {
        points: item.points,
        count: item.count
      };
    });
    
    // Format node activity
    const nodeActivity: Record<string, { 
      sessions: number; 
      uniqueUsers: number; 
      totalUptime: number; 
      avgUptime: number 
    }> = dailyNodeActivity.reduce((acc, item) => {
      acc[item.date] = {
        sessions: item.sessions,
        uniqueUsers: item.uniqueUsers,
        totalUptime: item.totalUptime,
        avgUptime: item.avgUptime
      };
      return acc;
    }, {} as Record<string, { 
      sessions: number; 
      uniqueUsers: number; 
      totalUptime: number; 
      avgUptime: number 
    }>);
    
    // Format user growth
    const growth: Record<string, number> = userGrowth.reduce((acc, item) => {
      acc[item._id] = item.newUsers;
      return acc;
    }, {} as Record<string, number>);
    
    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalPointsInPeriod,
        earnings,
        devices,
        dailyActivity,
        nodeActivity,
        userGrowth: growth,
        topUsers,
        period
      }
    });
  } catch (error) {
    console.error('Error in analytics API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}