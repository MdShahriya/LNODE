import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyFollowingWithAuth } from '@/lib/twitter-oauth';

/**
 * API endpoint to verify if the authenticated user follows a specific Twitter account
 * GET /api/user/twitter-verify?targetUsername=TopayFoundation
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get wallet address from cookies
    const walletAddress = request.cookies.get('wallet_address')?.value;
    
    if (!walletAddress) {
      return NextResponse.json({ 
        error: 'No wallet address found. Please connect your wallet first.',
        verified: false 
      }, { status: 401 });
    }
    
    // Get target username from query params (default to TopayFoundation)
    const targetUsername = request.nextUrl.searchParams.get('targetUsername') || 'TopayFoundation';
    
    // Find the user with their Twitter access token
    const user = await User.findOne(
      { walletAddress: walletAddress.toLowerCase() },
      { twitterAccessToken: 1, twitterUsername: 1, twitterVerified: 1 }
    );
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found. Please ensure your wallet is registered.',
        verified: false 
      }, { status: 404 });
    }
    
    if (!user.twitterAccessToken) {
      return NextResponse.json({ 
        error: 'Twitter account not connected. Please connect your Twitter account first.',
        verified: false,
        twitterConnected: false
      }, { status: 400 });
    }
    
    // Verify if the user follows the target account using their access token
    const isFollowing = await verifyFollowingWithAuth(
      user.twitterAccessToken,
      targetUsername
    );
    
    return NextResponse.json({
      verified: isFollowing,
      twitterUsername: user.twitterUsername,
      twitterVerified: user.twitterVerified,
      targetUsername,
      message: isFollowing 
        ? `You are following @${targetUsername}` 
        : `You are not following @${targetUsername}`
    });
    
  } catch (error) {
    console.error('Error verifying Twitter follow with auth:', error);
    return NextResponse.json({ 
      error: 'Failed to verify Twitter follow status. Please try again later.',
      verified: false 
    }, { status: 500 });
  }
}