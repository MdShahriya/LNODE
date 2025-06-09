import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getAuthenticatedUser } from '@/lib/twitter-oauth';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Handle OAuth errors
    if (error) {
      console.error('Twitter OAuth error:', error);
      return NextResponse.redirect(
        new URL('/dashboard/profile?twitter_error=access_denied', request.url)
      );
    }
    
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/profile?twitter_error=missing_params', request.url)
      );
    }
    
    // Get stored OAuth state from session/cookies
    // In a production app, you'd store this in a secure session store
    const storedState = request.cookies.get('twitter_oauth_state')?.value;
    const codeVerifier = request.cookies.get('twitter_code_verifier')?.value;
    
    if (!storedState || !codeVerifier || storedState !== state) {
      return NextResponse.redirect(
        new URL('/dashboard/profile?twitter_error=invalid_state', request.url)
      );
    }
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, codeVerifier);
    
    // Get user information
    const twitterUser = await getAuthenticatedUser(tokens.accessToken);
    
    // Get wallet address from session/cookies
    const walletAddress = request.cookies.get('wallet_address')?.value;
    
    if (!walletAddress) {
      return NextResponse.redirect(
        new URL('/dashboard/profile?twitter_error=no_wallet', request.url)
      );
    }
    
    // Connect to database and update user
    await connectDB();
    
    const user = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    });
    
    if (!user) {
      return NextResponse.redirect(
        new URL('/dashboard/profile?twitter_error=user_not_found', request.url)
      );
    }
    
    // Update user with Twitter information
    user.twitterUsername = twitterUser.username;
    user.twitterId = twitterUser.id;
    user.twitterAccessToken = tokens.accessToken;
    user.twitterRefreshToken = tokens.refreshToken;
    user.twitterTokenExpiresAt = tokens.expiresAt;
    user.twitterVerified = true;
    user.twitterConnectedAt = new Date();
    
    await user.save();
    
    // Create response with success redirect
    const response = NextResponse.redirect(
      new URL('/dashboard/profile?twitter_success=connected', request.url)
    );
    
    // Clear OAuth state cookies
    response.cookies.delete('twitter_oauth_state');
    response.cookies.delete('twitter_code_verifier');
    
    return response;
    
  } catch (error) {
    console.error('Twitter OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/profile?twitter_error=callback_failed', request.url)
    );
  }
}