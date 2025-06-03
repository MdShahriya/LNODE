import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import NodeSession from '@/models/NodeSession';
import User from '@/models/User';

export async function POST(request: Request) {
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
    
    // Find user to get user ID
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find any active sessions for this wallet and mark them as disconnected
    await NodeSession.updateMany(
      { walletAddress: walletAddress.toLowerCase(), status: 'connected' },
      { 
        $set: { 
          status: 'disconnected',
          endTime: new Date()
        }
      }
    );
    
    // Get user agent information
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Check if the request is coming from the extension
    const isExtension = userAgent.toLowerCase().includes('extension') || false;
    
    // Record the disconnection event in NodeSession only if it's from the extension
    if (isExtension) {
      await NodeSession.create({
        user: user._id,
        walletAddress: walletAddress.toLowerCase(),
        sessionId: `disconnect_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        deviceIP: deviceIp || '0.0.0.0',
        status: 'disconnected',
        startTime: new Date(),
        endTime: new Date(),
        userAgent: userAgent,
        deviceInfo: userAgent,
        browser: userAgent.split(' ')[0] || 'Unknown',
        platform: userAgent.includes('Windows') ? 'Windows' : 
                 userAgent.includes('Mac') ? 'Mac' : 
                 userAgent.includes('Linux') ? 'Linux' : 'Unknown',
        deviceType: userAgent.includes('Mobile') ? 'mobile' : 'desktop',
        metadata: {
          event: 'wallet_disconnected',
          source: 'extension'
        }
      });
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Wallet disconnection recorded successfully',
      walletAddress,
    });
  } catch (error) {
    console.error('Error recording wallet disconnection:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to record wallet disconnection', error: String(error) },
      { status: 500 }
    );
  }
}