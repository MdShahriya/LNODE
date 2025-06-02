import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import UserHistory from '@/models/UserHistory';

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
    
    // Record the disconnection event in UserHistory
    await UserHistory.create({
      walletAddress,
      event: 'wallet_disconnected',
      timestamp: new Date(),
      metadata: {
        deviceIp,
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
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