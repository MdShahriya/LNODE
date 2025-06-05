import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const { walletAddress, username, email } = await request.json();
    
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
    
    // Update user profile fields if provided
    if (username !== undefined) user.username = username;
    if (email !== undefined) user.email = email;
    
    // Ensure preferences object exists if it doesn't already
    if (!user.preferences) user.preferences = {};
    
    // Save the updated user
    await user.save();
    
    // Return the complete user object to match the frontend expectations
    return NextResponse.json({
      success: true,
      user: user.toObject()
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
}