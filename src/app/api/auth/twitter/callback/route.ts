import { NextRequest } from 'next/server';
import { exchangeForAccessToken, getAuthenticatedUser } from '@/lib/twitter-oauth-1a';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  // Prepare the HTML for the popup window to close itself
  const createPopupResponse = (status: string, message: string, username?: string) => {
    const messageType = status === 'success' ? 'TWITTER_AUTH_SUCCESS' : 'TWITTER_AUTH_ERROR';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>X Authentication</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #15202b;
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            text-align: center;
          }
          .container {
            padding: 20px;
            border-radius: 10px;
            background-color: #192734;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            max-width: 400px;
          }
          h2 {
            margin-top: 0;
            color: #1da1f2;
          }
          p {
            margin: 10px 0 20px;
          }
          .spinner {
            border: 3px solid rgba(0, 0, 0, 0.1);
            border-top: 3px solid #1da1f2;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h2>X Authentication</h2>
          <p>${message}</p>
          <script>
            // Pass the result back to the opener window
            if (window.opener) {
              window.opener.postMessage({ 
                type: '${messageType}', 
                message: '${message}',
                username: '${username || ''}'
              }, '*');
              
              // Close this popup window after a short delay
              setTimeout(() => window.close(), 1500);
            } else {
              // If no opener, redirect to the profile page
              window.location.href = '/dashboard/profile?x_${status === 'success' ? 'success=connected' : 'error=' + status}';
            }
          </script>
        </div>
      </body>
      </html>
    `;
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  };
  
  try {
    const { searchParams } = new URL(request.url);
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');
    const denied = searchParams.get('denied');
    
    // Check if user denied authorization
    if (denied) {
      console.error('OAuth denied:', denied);
      return createPopupResponse('access_denied', 'Authorization was denied by user.');
    }
    
    if (!oauthToken || !oauthVerifier) {
      return createPopupResponse('missing_params', 'Missing OAuth token or verifier.');
    }
    
    // Retrieve stored OAuth tokens from cookies
    const storedRequestToken = request.cookies.get('twitter_request_token')?.value;
    const requestTokenSecret = request.cookies.get('twitter_request_token_secret')?.value;
    const walletAddress = request.cookies.get('wallet_address')?.value;
    
    if (!storedRequestToken || !requestTokenSecret || !walletAddress) {
      return createPopupResponse('invalid_state', 'Missing OAuth session data. Please try again.');
    }
    
    // Verify request token matches stored token
    if (oauthToken !== storedRequestToken) {
      return createPopupResponse('invalid_state', 'Invalid OAuth token. Please try again.');
    }
    
    // Step 3: Exchange for access token
    const tokens = await exchangeForAccessToken(
      storedRequestToken,
      requestTokenSecret,
      oauthVerifier
    );
    
    // Get user information
    const twitterUser = await getAuthenticatedUser(
      tokens.accessToken,
      tokens.accessTokenSecret
    );
    

    
    // Connect to database and update user
    await connectDB();
    
    const user = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    });
    
    if (!user) {
      return createPopupResponse('user_not_found', 'User account not found.');
    }
    
    // Update user with Twitter information
    user.twitterUsername = twitterUser.username;
    user.twitterId = twitterUser.id;
    user.twitterAccessToken = tokens.accessToken;
    user.twitterAccessTokenSecret = tokens.accessTokenSecret;
    user.twitterVerified = true;
    user.twitterConnectedAt = new Date();
    
    await user.save();
    
    // Create response with success HTML
    const response = createPopupResponse('success', `Successfully connected X account: @${twitterUser.username}`, twitterUser.username);
    
    // Clear OAuth state cookies
    const cookieOptions = {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 0,
    };
    
    response.headers.append('Set-Cookie', `twitter_request_token=; ${cookieOptions}`);
    response.headers.append('Set-Cookie', `twitter_request_token_secret=; ${cookieOptions}`);
    
    return response;
    
  } catch (error) {
    console.error('Twitter OAuth callback error:', error);
    return createPopupResponse('callback_failed', 'OAuth callback failed. Please try again.');
  }
}
