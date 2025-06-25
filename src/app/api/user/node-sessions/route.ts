import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import NodeSession, { INodeSession } from '@/models/NodeSession';
import User from '@/models/User';
import { FilterQuery } from 'mongoose';
import {
  calculatePerformanceScore,
  determineNodeQuality,
  getStatusIcon,
  determineNodeType,
  formatLocation,
  calculateNodeStatistics,
  ProcessedNodeSession
} from './helpers';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const days = parseInt(searchParams.get('days') || '7', 10);
    const status = searchParams.get('status') || 'all';
    const includeMetrics = searchParams.get('includeMetrics') === 'true';
    
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

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    // Build query
    const query: FilterQuery<INodeSession> = {
      walletAddress: walletAddress.toLowerCase(),
      startTime: { $gte: startDate, $lte: endDate }
    };
    
    // Filter by status if specified
    if (status !== 'all') {
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }

    // Get sessions with simple query and sort (avoiding complex aggregation that might miss sessions)
    const rawSessions = await NodeSession.find(query)
      .sort({ startTime: -1 })
      .lean();
    
    // Deduplicate sessions by sessionId, keeping the most recent one
    const sessionMap = new Map();
    rawSessions.forEach(session => {
      const existing = sessionMap.get(session.sessionId);
      if (!existing || session.startTime > existing.startTime) {
        sessionMap.set(session.sessionId, session);
      }
    });
    
    // Convert map back to array and transform to expected format
    const sessions = Array.from(sessionMap.values()).map(session => ({
      _id: {
        sessionId: session.sessionId,
        deviceIP: session.deviceIP,
        deviceInfo: session.deviceInfo,
        browser: session.browser,
        platform: session.platform,
        deviceType: session.deviceType
      },
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      uptime: session.uptime || 0,
      pointsEarned: session.pointsEarned || 0,
      lastHeartbeat: session.lastHeartbeat,
      errorCount: session.errorCount || 0,
      warningCount: session.warningCount || 0,
      avgCpuUsage: session.performanceMetrics?.cpuUsage,
      avgMemoryUsage: session.performanceMetrics?.memoryUsage,
      avgNetworkLatency: session.performanceMetrics?.networkLatency,
      networkTypes: session.networkInfo?.connectionType ? [session.networkInfo.connectionType] : [],
      effectiveTypes: session.networkInfo?.effectiveType ? [session.networkInfo.effectiveType] : [],
      countries: session.geolocation?.country ? [session.geolocation.country] : [],
      regions: session.geolocation?.region ? [session.geolocation.region] : [],
      cities: session.geolocation?.city ? [session.geolocation.city] : [],
      nodeQuality: session.nodeQuality,
      performanceScore: session.performanceScore
    }));

    // Process sessions with additional data
    const processedSessions: ProcessedNodeSession[] = sessions.map(session => {
      // Calculate session duration
      let sessionDuration = 0;
      if (session.endTime) {
        sessionDuration = Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000);
      } else if (session.status === 'active') {
        sessionDuration = Math.floor((new Date().getTime() - new Date(session.startTime).getTime()) / 1000);
      }

      // Calculate performance score if not available
      const performanceScore = session.performanceScore || calculatePerformanceScore({
        cpuUsage: session.avgCpuUsage,
        memoryUsage: session.avgMemoryUsage,
        networkLatency: session.avgNetworkLatency,
        errorCount: session.errorCount,
        warningCount: session.warningCount
      });

      // Determine node quality if not available
      const nodeQuality = session.nodeQuality || determineNodeQuality(
        performanceScore,
        (session.uptime || 0) / 3600, // Convert seconds to hours
        session.errorCount || 0
      );

      // Format location
      const location = formatLocation({
        country: session.countries?.[0],
        region: session.regions?.[0],
        city: session.cities?.[0]
      });

      // Determine node type
      const nodeType = determineNodeType(
        session._id.deviceInfo || '',
        session._id.deviceType || ''
      );

      // Get status icon
      const statusIcon = getStatusIcon(
        session.status === 'active',
        !!session.lastHeartbeat && new Date(session.lastHeartbeat).getTime() > Date.now() - 5 * 60 * 1000, // Active in last 5 minutes
        performanceScore
      );

      return {
        sessionId: session._id.sessionId,
        deviceIP: session._id.deviceIP,
        deviceInfo: session._id.deviceInfo,
        browser: session._id.browser,
        platform: session._id.platform,
        deviceType: session._id.deviceType,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        uptime: session.uptime || 0,
        sessionDuration,
        pointsEarned: session.pointsEarned || 0,
        lastHeartbeat: session.lastHeartbeat,
        errorCount: session.errorCount || 0,
        warningCount: session.warningCount || 0,
        performanceScore,
        nodeQuality,
        nodeType,
        location,
        statusIcon,
        // Include detailed metrics if requested
        ...(includeMetrics ? {
          performanceMetrics: {
            cpuUsage: session.avgCpuUsage,
            memoryUsage: session.avgMemoryUsage,
            networkLatency: session.avgNetworkLatency
          },
          networkInfo: {
            connectionTypes: session.networkTypes?.filter(Boolean) || [],
            effectiveTypes: session.effectiveTypes?.filter(Boolean) || []
          },
          geolocation: {
            countries: session.countries?.filter(Boolean) || [],
            regions: session.regions?.filter(Boolean) || [],
            cities: session.cities?.filter(Boolean) || []
          }
        } : {})
      };
    });

    // Calculate summary statistics using helper function
    const summary = calculateNodeStatistics(processedSessions);

    return NextResponse.json({
      success: true,
      sessions: processedSessions,
      summary
    });

  } catch (error) {
    console.error('Error fetching node sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch node sessions' },
      { status: 500 }
    );
  }
}