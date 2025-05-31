import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import UserHistory from '@/models/UserHistory';

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
      earningType: 'node'
    }).then(addresses => addresses.length);
    
    // Get total earnings in the period
    const earningsResult = await UserHistory.aggregate([
      { 
        $match: { 
          timestamp: { $gte: startDate, $lte: endDate } 
        } 
      },
      {
        $group: {
          _id: '$earningType',
          totalEarnings: { $sum: '$earnings' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get device statistics
    const deviceStats = await UserHistory.aggregate([
      { 
        $match: { 
          timestamp: { $gte: startDate, $lte: endDate },
          deviceInfo: { $exists: true, $ne: null }
        } 
      },
      {
        $addFields: {
          parsedDevice: { 
            $function: {
              body: function(deviceInfo: string) {
                try {
                  const info = JSON.parse(deviceInfo);
                  return {
                    platform: info.platform || 'Unknown',
                    browser: info.userAgent ? (info.userAgent.includes('Chrome') ? 'Chrome' : 
                                              info.userAgent.includes('Firefox') ? 'Firefox' : 
                                              info.userAgent.includes('Safari') ? 'Safari' : 
                                              info.userAgent.includes('Edge') ? 'Edge' : 'Other') : 'Unknown'
                  };
                } catch {
                  return { platform: 'Unknown', browser: 'Unknown' };
                }
              },
              args: ["$deviceInfo"],
              lang: "js"
            }
          }
        }
      },
      {
        $group: {
          _id: {
            platform: "$parsedDevice.platform",
            browser: "$parsedDevice.browser"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get daily activity
    const dailyActivity = await UserHistory.aggregate([
      { 
        $match: { 
          timestamp: { $gte: startDate, $lte: endDate } 
        } 
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            type: "$earningType"
          },
          earnings: { $sum: "$earnings" },
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
      totalEarnings: number;
      totalUptime: number;
    }> = [];
    const dateMap = new Map();
    
    dailyActivity.forEach(item => {
      const dateStr = item._id.date;
      const type = item._id.type;
      
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, {
          date: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          node: 0,
          referral: 0,
          task: 0,
          checkin: 0,
          other: 0,
          totalEarnings: 0,
          totalUptime: 0
        });
      }
      
      const dateData = dateMap.get(dateStr);
      dateData[type] = item.earnings;
      dateData.totalEarnings += item.earnings;
      dateData.totalUptime += item.uptime;
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