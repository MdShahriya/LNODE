import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { walletAddress, pointsToAdd } = await request.json();
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!pointsToAdd || pointsToAdd <= 0) {
      return NextResponse.json(
        { error: 'Valid points amount is required' },
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
    
    // Add the points to the user's total
    user.points += pointsToAdd;
    
    await user.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Points updated successfully',
      user
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating points:', error);
    return NextResponse.json(
      { error: 'Failed to update points' },
      { status: 500 }
    );
  }
}