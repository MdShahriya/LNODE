import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import UserHistory from '@/models/UserHistory';
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
    
    // Get total users
    const totalUsers = await User.countDocuments();
    
    // Get active users (users with node activity in the period)
    const activeUsers = await UserHistory.distinct('walletAddress', {
      timestamp: { $gte: startDate, $lte: endDate },
      connectionType: 'node_start'
    }).then(addresses => addresses.length);
    
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
    
    // Get device statistics from UserHistory
    const deviceStats = await UserHistory.aggregate([
      { 
        $match: { 
          timestamp: { $gte: startDate, $lte: endDate }
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
    
    // Get daily uptime from UserHistory
    const dailyUptimeActivity = await UserHistory.aggregate([
      { 
        $match: { 
          timestamp: { $gte: startDate, $lte: endDate },
          connectionType: 'node_stop',
          uptime: { $exists: true, $gt: 0 }
        } 
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }
          },
          uptime: { $sum: "$uptime" },
          count: { $sum: 1 }
        }
      },
      { 
        $sort: { "_id.date": 1 } 
      }
    ]);
    
    // Format daily activity for chart display
    const formattedDailyActivity: Array<{
      date: string;
      node: number;
      referral: number;
      task: number;
      checkin: number;
      other: number;
      totalPoints: number;
      totalUptime: number;
    }> = [];
    const dateMap = new Map();
    
    // Initialize the date map with all dates in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dateMap.set(dateStr, {
        date: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        node: 0,
        referral: 0,
        task: 0,
        checkin: 0,
        other: 0,
        totalPoints: 0,
        totalUptime: 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Add points data
    dailyPointsActivity.forEach(item => {
      const dateStr = item._id.date;
      const source = item._id.source;
      
      if (dateMap.has(dateStr)) {
        const dateData = dateMap.get(dateStr);
        dateData[source] = item.points;
        dateData.totalPoints += item.points;
      }
    });
    
    // Add uptime data
    dailyUptimeActivity.forEach(item => {
      const dateStr = item._id.date;
      
      if (dateMap.has(dateStr)) {
        const dateData = dateMap.get(dateStr);
        dateData.totalUptime += item.uptime;
      }
    });
    
    // Convert map to array and sort by date
    dateMap.forEach(value => formattedDailyActivity.push(value));
    formattedDailyActivity.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return NextResponse.json({ 
      success: true,
      totalUsers,
      activeUsers,
      earningsByType: earningsResult,
      deviceStats,
      dailyActivity: formattedDailyActivity,
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}