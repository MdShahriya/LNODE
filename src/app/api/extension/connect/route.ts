import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import NodeSession from '@/models/NodeSession';

export async function POST(request: NextRequest) {
  try {
    // Connect to the database
    await connectDB();
    
    // Parse the request body
    const { walletAddress, deviceIp } = await request.json();
    
    // Validate required fields
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, message: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    // Get client IP address if not provided
    const clientIp = deviceIp || (
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '0.0.0.0'
    );
    
    // Get user agent information
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    
    // Check if user exists, create if not
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      user = await User.create({
        walletAddress: walletAddress.toLowerCase(),
        points: 0,
        tasksCompleted: 0,
        uptime: 0,
        nodeStatus: false,
        lastActiveTime: new Date(),
        deviceCount: 1
      });
    }
    
    // Record the connection event in NodeSession
    await NodeSession.create({
      user: user._id,
      walletAddress: walletAddress.toLowerCase(),
      sessionId: `ext_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      deviceIP: clientIp,
      status: 'connected',
      startTime: new Date(),
      userAgent,
      deviceInfo: userAgent,
      browser: userAgent.split(' ')[0] || 'Unknown',
      platform: userAgent.includes('Windows') ? 'Windows' : 
               userAgent.includes('Mac') ? 'Mac' : 
               userAgent.includes('Linux') ? 'Linux' : 'Unknown',
      deviceType: userAgent.includes('Mobile') ? 'mobile' : 'desktop',
      metadata: {
        event: 'extension_connected'
      }
    });
    
    // Return success response with the wallet address
    return NextResponse.json({
      success: true,
      message: 'Extension connected successfully',
      walletAddress: walletAddress.toLowerCase(),
      user
    });
  } catch (error) {
    console.error('Error connecting extension:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to connect extension', error: String(error) },
      { status: 500 }
    );
  }
}