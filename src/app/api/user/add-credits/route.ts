import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import PointsHistory from '@/models/PointsHistory';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { walletAddress, amount, source, description } = await request.json();
    
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
    
    // Get client IP address from request
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || '0.0.0.0';
    
    const now = new Date();
    const currentBalance = user.credits || 0;
    const newBalance = currentBalance + amount;
    
    // Update user credits
    user.credits = newBalance;
    await user.save();
    
    // Create points history record (for tracking purposes)
    const pointsHistory = new PointsHistory({
      user: user._id,
      walletAddress: walletAddress.toLowerCase(),
      points: 0, // Not affecting points
      basePoints: 0,
      source: source || 'credits_addition',
      subSource: 'manual_addition',
      description: description || `Added ${amount} credits to account`,
      timestamp: now,
      multiplier: 1,
      transactionType: 'credit',
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      isVerified: true,
      verifiedBy: 'system',
      verificationDate: now,
      metadata: {
        creditsAdded: amount,
        source: source || 'manual',
        apiVersion: '1.0'
      },
      ipAddress: clientIP
    });
    
    await pointsHistory.save();
    
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