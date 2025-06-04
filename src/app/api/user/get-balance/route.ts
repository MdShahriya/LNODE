import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { walletAddress } = await request.json();
    
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
    
    // Return the user's points (balance)
    return NextResponse.json({
      success: true,
      user: {
        walletAddress: user.walletAddress,
        points: user.points || 0
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user balance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user balance' },
      { status: 500 }
    );
  }
}