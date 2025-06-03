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
    
    // Record the disconnection event in NodeSession
    await NodeSession.create({
      user: user._id,
      walletAddress: walletAddress.toLowerCase(),
      sessionId: `disconnect_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      deviceIP: deviceIp || '0.0.0.0',
      status: 'disconnected',
      startTime: new Date(),
      endTime: new Date(),
      userAgent: request.headers.get('user-agent') || 'unknown',
      deviceInfo: request.headers.get('user-agent') || 'unknown',
      browser: (request.headers.get('user-agent') || 'unknown').split(' ')[0] || 'Unknown',
      platform: (request.headers.get('user-agent') || '').includes('Windows') ? 'Windows' : 
               (request.headers.get('user-agent') || '').includes('Mac') ? 'Mac' : 
               (request.headers.get('user-agent') || '').includes('Linux') ? 'Linux' : 'Unknown',
      deviceType: (request.headers.get('user-agent') || '').includes('Mobile') ? 'mobile' : 'desktop',
      metadata: {
        event: 'wallet_disconnected'
      }
    });
    
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