import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import NodeSession from '@/models/NodeSession';
import PointsHistory from '@/models/PointsHistory';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { walletAddress, isRunning } = await request.json();
    
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
    
    // Update node status
    user.nodeStatus = isRunning;
    
    // Get client IP address
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || '0.0.0.0';
    
    // Get user agent information
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    
    if (isRunning) {
      // If node is being turned on, store the current time as the start time
      const now = new Date();
      user.nodeStartTime = now;
      
      // Generate a unique session ID
      const sessionId = `${user._id}-${Date.now()}`;
      
      // Create a new node session
      await NodeSession.create({
        user: user._id,
        walletAddress: user.walletAddress,
        deviceIP: clientIP,
        status: 'active',
        startTime: now,
        sessionId: sessionId,
        deviceInfo: userAgent,
        // Additional fields can be populated from request headers or client data
      });
    } else if (user.nodeStartTime) {
      // If node is being turned off and we have a start time, calculate uptime and points
      const now = new Date();
      const startTime = new Date(user.nodeStartTime);
      
      // Calculate elapsed time in seconds, minutes and hours (for different purposes)
      const elapsedMilliseconds = now.getTime() - startTime.getTime();
      const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
      const elapsedMinutes = elapsedSeconds / 60;
      
      // Calculate points at 30 points per minute (1800 per hour)
      const pointsEarned = elapsedMinutes * 12;
      
      // Update user points
      user.points += pointsEarned;
      
      // Update uptime (now in seconds)
      user.uptime += elapsedSeconds;
      
      // Reset the start time
      user.nodeStartTime = null;
      
      // Find and update the active session
      const activeSession = await NodeSession.findOne({
        walletAddress: user.walletAddress,
        status: 'active',
        endTime: { $exists: false }
      }).sort({ startTime: -1 });
      
      if (activeSession) {
        activeSession.status = 'inactive';
        activeSession.endTime = now;
        activeSession.uptime = elapsedSeconds;
        activeSession.pointsEarned = pointsEarned;
        await activeSession.save();
      }
      
      // Create points history record
      await PointsHistory.create({
        user: user._id,
        walletAddress: user.walletAddress,
        points: pointsEarned,
        source: 'node',
        description: `Earned for ${elapsedMinutes.toFixed(2)} minutes of node uptime`,
        timestamp: now
      });
      
      console.log(`User ${user.walletAddress} earned ${pointsEarned.toFixed(3)} points for ${elapsedMinutes.toFixed(2)} minutes (${elapsedSeconds} seconds) of uptime`);
    }
    
    await user.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Node status updated',
      user
    });
    
  } catch (error) {
    console.error('Error updating node status:', error);
    return NextResponse.json(
      { error: 'Failed to update node status' },
      { status: 500 }
    );
  }
}