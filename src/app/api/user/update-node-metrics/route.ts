import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import NodeSession from '@/models/NodeSession';
import User from '@/models/User';
import { calculatePerformanceScore, determineNodeQuality } from '../node-sessions/helpers';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const {
      walletAddress,
      sessionId,
      performanceMetrics,
      networkInfo,
      geolocation,
      errorCount = 0,
      warningCount = 0
    } = await request.json();
    
    if (!walletAddress || !sessionId) {
      return NextResponse.json(
        { error: 'Wallet address and session ID are required' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find the active session
    const session = await NodeSession.findOne({
      walletAddress: walletAddress.toLowerCase(),
      sessionId,
      status: 'active'
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Active session not found' },
        { status: 404 }
      );
    }

    // Update last heartbeat
    const now = new Date();
    session.lastHeartbeat = now;

    // Update performance metrics if provided
    if (performanceMetrics) {
      session.performanceMetrics = {
        ...session.performanceMetrics,
        ...performanceMetrics
      };
    }

    // Update network info if provided
    if (networkInfo) {
      session.networkInfo = {
        ...session.networkInfo,
        ...networkInfo
      };
    }

    // Update geolocation if provided
    if (geolocation) {
      session.geolocation = {
        ...session.geolocation,
        ...geolocation
      };
    }

    // Update error and warning counts
    if (errorCount > 0) {
      session.errorCount = (session.errorCount || 0) + errorCount;
    }

    if (warningCount > 0) {
      session.warningCount = (session.warningCount || 0) + warningCount;
    }

    // Calculate current uptime
    const startTime = new Date(session.startTime);
    const currentUptime = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    session.uptime = currentUptime;

    // Calculate performance score
    const performanceScore = calculatePerformanceScore({
      cpuUsage: session.performanceMetrics?.cpuUsage,
      memoryUsage: session.performanceMetrics?.memoryUsage,
      networkLatency: session.performanceMetrics?.networkLatency,
      errorCount: session.errorCount,
      warningCount: session.warningCount
    });
    session.performanceScore = performanceScore;

    // Determine node quality
    const nodeQuality = determineNodeQuality(
      performanceScore,
      currentUptime / 3600, // Convert seconds to hours
      session.errorCount || 0
    );
    session.nodeQuality = nodeQuality;

    // Save the updated session
    await session.save();

    return NextResponse.json({
      success: true,
      message: 'Node metrics updated',
      session: {
        sessionId: session.sessionId,
        uptime: session.uptime,
        lastHeartbeat: session.lastHeartbeat,
        performanceScore,
        nodeQuality
      }
    });

  } catch (error) {
    console.error('Error updating node metrics:', error);
    return NextResponse.json(
      { error: 'Failed to update node metrics' },
      { status: 500 }
    );
  }
}