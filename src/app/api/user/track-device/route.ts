import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import NodeSession from '@/models/NodeSession';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { walletAddress, deviceInfo, deviceType, browser, platform } = await request.json();
    
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
    
    // Get client IP address
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || '0.0.0.0';
    
    // Generate a stable sessionId based on user ID and device info to prevent duplicate sessions
    const deviceHash = crypto
      .createHash('md5')
      .update(`${deviceInfo || ''}${clientIP}`)
      .digest('hex')
      .substring(0, 8);
    
    const sessionId = `${user._id}-${deviceHash}`;
    
    // Check if a session with this ID already exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingSession = await NodeSession.findOne({
      user: user._id,
      walletAddress: user.walletAddress,
      deviceIP: clientIP,
      sessionId: sessionId,
      startTime: { $gte: today }
    });
    
    // Check if the request is coming from the extension
    const isExtension = deviceInfo?.toLowerCase().includes('extension') || false;
    
    if (!existingSession && isExtension) {
      // Only create a new session if one doesn't exist for today AND the request is from the extension
      await NodeSession.create({
        user: user._id,
        walletAddress: user.walletAddress,
        deviceIP: clientIP,
        status: 'active',
        startTime: new Date(),
        deviceInfo: deviceInfo || 'Unknown device',
        deviceType: deviceType || 'Unknown',
        browser: browser || 'Unknown',
        platform: platform || 'Unknown',
        sessionId: sessionId,
        metadata: {
          event: 'login',
          source: 'extension_tracking'
        }
      });
    } else if (existingSession) {
      // Update the existing session's last heartbeat
      existingSession.lastHeartbeat = new Date();
      await existingSession.save();
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Device tracked successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error tracking device:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}