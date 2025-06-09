import { NextRequest, NextResponse } from 'next/server';
import { revokeAccessToken } from '@/lib/twitter-oauth';
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
    
    // Find the user
    const user = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Revoke access token if it exists
    if (user.twitterAccessToken) {
      try {
        await revokeAccessToken(user.twitterAccessToken);
      } catch (error) {
        console.warn('Failed to revoke Twitter access token:', error);
        // Continue with disconnection even if revocation fails
      }
    }
    
    // Clear Twitter-related fields
    user.twitterUsername = undefined;
    user.twitterId = undefined;
    user.twitterAccessToken = undefined;
    user.twitterRefreshToken = undefined;
    user.twitterTokenExpiresAt = undefined;
    user.twitterVerified = false;
    user.twitterConnectedAt = undefined;
    
    await user.save();
    
    return NextResponse.json({
      success: true,
      message: 'Twitter account disconnected successfully'
    });
    
  } catch (error) {
    console.error('Twitter disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Twitter account' },
      { status: 500 }
    );
  }
}