import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import NodeSession from '@/models/NodeSession';

// GET /api/node/uptime-check - Verify node uptime for task completion
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get walletAddress from query params
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json({ 
        error: 'Wallet address is required for uptime verification',
        verified: false 
      }, { status: 400 });
    }
    
    // Find the user
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found. Please ensure your wallet is registered.',
        verified: false 
      }, { status: 404 });
    }
    
    // Check for active node sessions
    const activeSessions = await NodeSession.find({
      userId: user._id,
      status: 'active',
      endTime: { $exists: false }
    });
    
    // Check if user has any recent node activity (within last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSessions = await NodeSession.find({
      userId: user._id,
      $or: [
        { startTime: { $gte: twentyFourHoursAgo } },
        { lastHeartbeat: { $gte: twentyFourHoursAgo } }
      ]
    });
    
    // Verify uptime requirements
    const hasActiveNode = activeSessions.length > 0;
    const hasRecentActivity = recentSessions.length > 0;
    
    if (!hasActiveNode && !hasRecentActivity) {
      return NextResponse.json({ 
        error: 'No active node detected. Please ensure your node is running and connected.',
        verified: false,
        details: {
          activeSessions: activeSessions.length,
          recentActivity: hasRecentActivity
        }
      }, { status: 200 });
    }
    
    // Calculate total uptime for verification
    let totalUptime = 0;
    for (const session of recentSessions) {
      if (typeof session.uptime === 'number') {
        totalUptime += session.uptime;
      } else if (typeof session.uptime === 'string') {
        totalUptime += parseFloat(session.uptime) || 0;
      }
    }
    
    // Minimum uptime requirement (1 hour = 3600 seconds)
    const minimumUptime = 3600;
    const verified = totalUptime >= minimumUptime;
    
    return NextResponse.json({ 
      verified,
      message: verified 
        ? 'Node uptime verification successful!' 
        : `Insufficient uptime. Required: ${minimumUptime}s, Current: ${totalUptime}s`,
      details: {
        totalUptime,
        minimumRequired: minimumUptime,
        activeSessions: activeSessions.length,
        recentSessions: recentSessions.length
      }
    });
    
  } catch (error) {
    console.error('Error verifying node uptime:', error);
    return NextResponse.json({ 
      error: 'Failed to verify node uptime. Please try again later.',
      verified: false 
    }, { status: 500 });
  }
}