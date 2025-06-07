import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user exists
    const user = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is already verified
    if (user.verification === 'verified') {
      return NextResponse.json(
        { error: 'User is already verified' },
        { status: 400 }
      );
    }

    // Check if there's already a pending verification request
    if (user.verification === 'pending') {
      return NextResponse.json(
        { message: 'Verification request already pending' },
        { status: 200 }
      );
    }

    // Update user verification status to pending
    const updateResult = await User.updateOne(
      { walletAddress: walletAddress.toLowerCase() },
      { 
        verification: 'pending',
        verificationRequestedAt: new Date(),
        verificationMethod: 'manual'
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to update user verification status' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Verification request submitted successfully',
        status: 'pending'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing verification request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}