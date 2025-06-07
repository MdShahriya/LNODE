import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { walletAddress, amount } = await request.json();
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
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
    
    const currentBalance = user.credits || 0;
    const newBalance = currentBalance + amount;
    
    // Update user credits
    user.credits = newBalance;
    await user.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Credits added successfully',
      creditsAdded: amount,
      newBalance: newBalance,
      user: {
        walletAddress: user.walletAddress,
        credits: user.credits,
        points: user.points
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error adding credits:', error);
    return NextResponse.json(
      { error: 'Failed to add credits' },
      { status: 500 }
    );
  }
}