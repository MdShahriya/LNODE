import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import UserHistory from '@/models/UserHistory';

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
    
    if (isRunning) {
      // If node is being turned on, store the current time as the start time
      user.nodeStartTime = new Date();
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
      
      // Get client IP address
      const forwardedFor = request.headers.get('x-forwarded-for');
      const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || '0.0.0.0';
      
      // Create history record
      await UserHistory.create({
        user: user._id,
        walletAddress: user.walletAddress,
        deviceIP: clientIP,
        earnings: pointsEarned,
        earningType: 'node',
        uptime: elapsedSeconds,
        timestamp: now
      });
      
      console.log(`User ${user.walletAddress} earned ${pointsEarned.toFixed(3)} points for ${elapsedMinutes.toFixed(2)} minutes (${elapsedSeconds} seconds) of uptime`);
    }
    
    await user.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Node status updated',
      user
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating node status:', error);
    return NextResponse.json(
      { error: 'Failed to update node status' },
      { status: 500 }
    );
  }
}