import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import PointsHistory from '@/models/PointsHistory';
import NodeSession from '@/models/NodeSession';

// Points earned per minute (same as in update-node-status)
const POINTS_PER_MINUTE = 12;
// Points earned per update (60 seconds = 1 minute)
const POINTS_PER_UPDATE = POINTS_PER_MINUTE;

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { walletAddress, deviceIp } = await request.json();
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
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
    
    // Only update points if the node is actually running
    if (!user.nodeStatus) {
      return NextResponse.json(
        { error: 'Node is not running' },
        { status: 400 }
      );
    }
    
    // Get client IP address from request or use provided deviceIp
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIP = deviceIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || '0.0.0.0');
    
    const now = new Date();
    const pointsToAdd = POINTS_PER_UPDATE;
    const currentBalance = user.points || 0;
    const newBalance = currentBalance + pointsToAdd;
    
    // Update user points
    user.points = newBalance;
    user.lastActiveTime = now;
    
    // Update uptime (add 60 seconds)
    user.uptime += 60;
    
    // Update total earnings
    if (!user.totalEarnings) {
      user.totalEarnings = { daily: 0, weekly: 0, monthly: 0 };
    }
    user.totalEarnings.daily += pointsToAdd;
    user.totalEarnings.weekly += pointsToAdd;
    user.totalEarnings.monthly += pointsToAdd;
    
    await user.save();
    
    // Create points history record
    const pointsHistory = new PointsHistory({
      user: user._id,
      walletAddress: walletAddress.toLowerCase(),
      points: pointsToAdd,
      basePoints: pointsToAdd,
      source: 'node',
      description: `Earned for 1 minute of node uptime (periodic update)`,
      timestamp: now,
      multiplier: 1,
      transactionType: 'credit',
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      isVerified: true,
      verifiedBy: 'system',
      verificationDate: now,
      metadata: {
        deviceIp: clientIP,
        updateMethod: 'periodic',
        apiVersion: '1.0'
      },
      ipAddress: clientIP
    });
    
    await pointsHistory.save();
    
    // Find active session or create a new one for this heartbeat
    const activeSession = await NodeSession.findOne({
      walletAddress: user.walletAddress,
      status: 'active',
      deviceIP: clientIP
    }).sort({ startTime: -1 });
    
    if (activeSession) {
      // Update existing session with heartbeat
      activeSession.lastHeartbeat = now;
      activeSession.pointsEarned = (activeSession.pointsEarned || 0) + pointsToAdd;
      await activeSession.save();
    } else {
      // Create a new session for this heartbeat
      await NodeSession.create({
        user: user._id,
        walletAddress: user.walletAddress,
        deviceIP: clientIP,
        status: 'active',
        startTime: now,
        lastHeartbeat: now,
        sessionId: `heartbeat_${user._id}_${Date.now()}`,
        pointsEarned: pointsToAdd,
        metadata: {
          event: 'node_heartbeat',
          source: 'points_update'
        }
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Node points updated',
      pointsAdded: pointsToAdd,
      newBalance: newBalance,
      user: {
        walletAddress: user.walletAddress,
        points: user.points,
        uptime: user.uptime,
        totalEarnings: user.totalEarnings,
        lastActiveTime: user.lastActiveTime
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating node points:', error);
    return NextResponse.json(
      { error: 'Failed to update node points' },
      { status: 500 }
    );
  }
}