import { NextRequest, NextResponse } from 'next/server';
import { requestToken, generateAuthorizationUrl } from '@/lib/twitter-oauth-1a';
import { generateTwitterAuthUrl } from '@/lib/twitter-oauth';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    // Step 1: Request Token (OAuth 1.0a)
    const { requestToken: oauthToken, requestTokenSecret } = await requestToken();
    
    // Step 2: Generate Authorization URL
    const authUrl = generateAuthorizationUrl(oauthToken);
    
    // Create response with OAuth URL
    const response = NextResponse.json({
      success: true,
      authUrl,
      message: 'Redirect to X for authorization'
    });
    
    // Store OAuth 1.0a tokens in secure cookies
    response.cookies.set('twitter_request_token', oauthToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });
    
    response.cookies.set('twitter_request_token_secret', requestTokenSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });
    
    response.cookies.set('wallet_address', walletAddress, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });
    
    return response;
    
  } catch (error) {
    console.error('Twitter OAuth authorization error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Twitter OAuth' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    // Generate OAuth URL with default scopes
    const { authUrl, state } = generateTwitterAuthUrl();
    
    // Create response with OAuth URL
    const response = NextResponse.json({
      success: true,
      authUrl,
      message: 'Redirect to Twitter for authorization'
    });
    
    // Store OAuth state and code verifier in secure cookies
    response.cookies.set('twitter_oauth_state', state.state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });
    
    response.cookies.set('twitter_code_verifier', state.codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });
    
    response.cookies.set('wallet_address', walletAddress, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });
    
    return response;
    
  } catch (error) {
    console.error('Twitter OAuth authorization error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Twitter OAuth' },
      { status: 500 }
    );
  }
}