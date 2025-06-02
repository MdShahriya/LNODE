import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import UserHistory from '@/models/UserHistory';

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
    
    // Create a device connection history record
    await UserHistory.create({
      user: user._id,
      walletAddress: user.walletAddress,
      deviceIP: clientIP,
      connectionType: 'login',
      timestamp: new Date(),
      deviceInfo: deviceInfo || 'Unknown device',
      deviceType: deviceType || 'Unknown',
      browser: browser || 'Unknown',
      platform: platform || 'Unknown',
      sessionId: `${user._id}-${Date.now()}` // Generate a unique sessionId
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Device tracked successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error tracking device:', error);
    return NextResponse.json(
      { error: 'Failed to track device' },
      { status: 500 }
    );
  }
}