import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import NodeSession from '@/models/NodeSession';
import User from '@/models/User';
import {
  calculatePerformanceScore,
  determineNodeQuality,
  getQualityMultiplier,
  getStatusIcon,
  determineNodeType,
  formatLocation
} from './helpers';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Get user data for points calculation
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() }).lean();
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get enhanced session data with better aggregation
    const sessions = await NodeSession.aggregate([
      {
        $match: {
          walletAddress: walletAddress.toLowerCase()
        }
      },
      {
        $group: {
          _id: {
            sessionId: '$sessionId',
            deviceIP: '$deviceIP',
            deviceInfo: '$deviceInfo',
            browser: '$browser',
            platform: '$platform',
            deviceType: '$deviceType'
          },
          firstConnection: { $min: '$startTime' },
          lastConnection: { $max: '$endTime' },
          endTimestamp: { $max: '$endTime' },
          totalConnections: { $sum: 1 },
          statusTypes: { $addToSet: '$status' },
          activityTypes: { $addToSet: '$activityType' },
          totalUptime: { $sum: '$uptime' },
          totalSessionDuration: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$startTime', null] }, { $ne: ['$endTime', null] }] },
                { $divide: [{ $subtract: ['$endTime', '$startTime'] }, 1000] },
                0
              ]
            }
          },
          totalPointsEarned: { $sum: '$pointsEarned' },
          lastHeartbeat: { $max: '$lastHeartbeat' },
          errorCount: { $sum: '$errorCount' },
          warningCount: { $sum: '$warningCount' },
          // Performance metrics
          avgCpuUsage: { $avg: '$performanceMetrics.cpuUsage' },
          avgMemoryUsage: { $avg: '$performanceMetrics.memoryUsage' },
          avgNetworkLatency: { $avg: '$performanceMetrics.networkLatency' },
          // Network info
          networkTypes: { $addToSet: '$networkInfo.connectionType' },
          effectiveTypes: { $addToSet: '$networkInfo.effectiveType' },
          // Geolocation
          countries: { $addToSet: '$geolocation.country' },
          regions: { $addToSet: '$geolocation.region' },
          cities: { $addToSet: '$geolocation.city' },
          nodeStartSessions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          },
          nodeStopSessions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'disconnected'] }, 1, 0]
            }
          },
          heartbeatSessions: {
            $sum: {
              $cond: [{ $ne: ['$lastHeartbeat', null] }, 1, 0]
            }
          },
          nodeQuality: { $last: '$nodeQuality' },
          performanceScore: { $avg: '$performanceScore' }
        }
      },
      {
        $sort: { lastConnection: -1 }
      }
    ]);

    // Get recent points history for accurate earnings calculation

    // Process sessions with enhanced data
    const processedSessions = sessions.map((session, index) => {
      const sessionId = session._id.sessionId || `session_${index}`;
      const deviceInfo = session._id.deviceInfo || 'Unknown Device';
      const deviceIP = session._id.deviceIP;
      const browser = session._id.browser || 'Unknown';
      const platform = session._id.platform || 'Unknown';
      const deviceType = session._id.deviceType || 'unknown';
      
      // Determine current status based on multiple factors
      const hasRecentHeartbeat = session.lastHeartbeat && 
        (new Date().getTime() - new Date(session.lastHeartbeat).getTime()) < 5 * 60 * 1000; // 5 minutes
      const isNodeRunning = (session.nodeStartSessions > session.nodeStopSessions) || hasRecentHeartbeat;
      const hasActiveActivity = session.statusTypes?.includes('active');
      
      // Calculate session metrics
      const totalUptimeHours = Math.round((session.totalUptime || 0) / 3600 * 100) / 100;
      const totalSessionHours = Math.round((session.totalSessionDuration || 0) / 3600 * 100) / 100;
      const actualPointsEarned = session.totalPointsEarned || 0;
      
      // Calculate performance score
      const performanceScore = calculatePerformanceScore({
        cpuUsage: session.avgCpuUsage,
        memoryUsage: session.avgMemoryUsage,
        networkLatency: session.avgNetworkLatency,
        errorCount: session.errorCount,
        warningCount: session.warningCount
      });
      
      // Determine node quality/tier
      const nodeQuality = determineNodeQuality(performanceScore, totalUptimeHours, session.errorCount);
      
      // Calculate current points per hour rate
      const basePointsPerSecond = session.pointsPerSecond || 0.2;
      const basePointsPerHour = basePointsPerSecond * 3600; // Convert per second to per hour
      const qualityMultiplier = getQualityMultiplier(nodeQuality);
      const currentPointsPerHour = basePointsPerHour * qualityMultiplier;
      
      // Generate enhanced unique ID
      const uniqueId = sessionId.substring(0, 8) + '_' + index.toString().padStart(2, '0');
      
      return {
        id: uniqueId,
        sessionId,
        status: isNodeRunning ? 'Connected' : 'Disconnected',
        statusIcon: getStatusIcon(isNodeRunning, hasActiveActivity, performanceScore),
        nodeType: determineNodeType(deviceInfo, deviceType),
        nodeQuality,
        deviceIP,
        browser,
        platform,
        deviceType,
        deviceInfo,
        // Performance metrics
        performanceScore: `${performanceScore}%`,
        cpuUsage: session.avgCpuUsage ? `${Math.round(session.avgCpuUsage)}%` : 'N/A',
        memoryUsage: session.avgMemoryUsage ? `${Math.round(session.avgMemoryUsage)} MB` : 'N/A',
        networkLatency: session.avgNetworkLatency ? `${Math.round(session.avgNetworkLatency)} ms` : 'N/A',
        // Points and earnings
        pointsPerSecond: basePointsPerSecond.toFixed(4),
        pointsPerHour: currentPointsPerHour.toFixed(2),
        totalUptime: `${totalUptimeHours} hrs`,
        sessionDuration: `${totalSessionHours} hrs`,
        pointsEarned: `${actualPointsEarned.toFixed(2)} pt`,
        // Connection details
        firstConnection: session.firstConnection,
        lastConnection: session.lastConnection,
        lastHeartbeat: session.lastHeartbeat,
        totalConnections: session.totalConnections,
        heartbeatCount: session.heartbeatSessions,
        // Status flags
        isActive: isNodeRunning,
        hasRecentActivity: hasActiveActivity,
        hasErrors: session.errorCount > 0,
        hasWarnings: session.warningCount > 0,
        // Network and location
        networkType: session.networkTypes?.[0] || 'unknown',
        effectiveType: session.effectiveTypes?.[0] || 'unknown',
        location: formatLocation(session.countries, session.regions, session.cities),
        // Counts
        errorCount: session.errorCount || 0,
        warningCount: session.warningCount || 0
      };
    });

    // Calculate summary statistics
    const totalSessions = processedSessions.length;
    const activeSessions = processedSessions.filter(s => s.isActive).length;
    const highPerformanceSessions = processedSessions.filter(s => 
      parseFloat(s.performanceScore) >= 80
    ).length;
    const totalPointsEarned = processedSessions.reduce((sum, s) => 
      sum + parseFloat(s.pointsEarned.replace(' pt', '')), 0
    );
    const totalUptime = processedSessions.reduce((sum, s) => 
      sum + parseFloat(s.totalUptime.replace(' hrs', '')), 0
    );
    
    return NextResponse.json({
      success: true,
      sessions: processedSessions,
      summary: {
        totalSessions,
        activeSessions,
        inactiveSessions: totalSessions - activeSessions,
        highPerformanceSessions,
        totalPointsEarned: totalPointsEarned.toFixed(2),
        totalUptime: `${totalUptime.toFixed(2)} hrs`,
        averagePerformance: processedSessions.length > 0 ? 
          (processedSessions.reduce((sum, s) => sum + parseFloat(s.performanceScore), 0) / processedSessions.length).toFixed(1) + '%' : '0%'
      }
    });

  } catch (error) {
    console.error('Error fetching user sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}