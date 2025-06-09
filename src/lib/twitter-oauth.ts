import { TwitterApi } from 'twitter-api-v2';
import crypto from 'crypto';

// OAuth configuration
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!;
const CALLBACK_URL = process.env.TWITTER_CALLBACK_URL || 'http://localhost:3000/api/auth/twitter/callback';

// OAuth 2.0 PKCE (Proof Key for Code Exchange) implementation
export interface TwitterOAuthState {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
}

export interface TwitterTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface TwitterOAuthUser {
  id: string;
  username: string;
  name: string;
  profileImageUrl?: string;
  verified?: boolean;
  publicMetrics?: {
    followersCount: number;
    followingCount: number;
    tweetCount: number;
  };
}

/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return { codeVerifier, codeChallenge };
}

/**
 * Generate a secure random state parameter
 */
function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate Twitter OAuth 2.0 authorization URL with PKCE
 * @param scopes - Array of OAuth scopes to request
 * @returns Object containing authorization URL and OAuth state
 */
export function generateTwitterAuthUrl(
  scopes: string[] = ['tweet.read', 'users.read', 'follows.read']
): { authUrl: string; state: TwitterOAuthState } {
  const state = generateState();
  const { codeVerifier, codeChallenge } = generatePKCE();
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: TWITTER_CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    scope: scopes.join(' '),
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  
  const authUrl = `https://x.com/i/oauth2/authorize?${params.toString()}`;
  
  return {
    authUrl,
    state: {
      state,
      codeVerifier,
      codeChallenge,
    },
  };
}

/**
 * Exchange authorization code for access token
 * @param code - Authorization code from Twitter callback
 * @param codeVerifier - PKCE code verifier
 * @returns Promise<TwitterTokens>
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<TwitterTokens> {
  try {
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: CALLBACK_URL,
        code_verifier: codeVerifier,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token exchange failed: ${response.status} - ${errorData}`);
    }
    
    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw error;
  }
}

/**
 * Refresh access token using refresh token
 * @param refreshToken - The refresh token
 * @returns Promise<TwitterTokens>
 */
export async function refreshAccessToken(refreshToken: string): Promise<TwitterTokens> {
  try {
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token refresh failed: ${response.status} - ${errorData}`);
    }
    
    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Some providers don't return new refresh token
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}

/**
 * Get authenticated user information using access token
 * @param accessToken - The user's access token
 * @returns Promise<TwitterOAuthUser>
 */
export async function getAuthenticatedUser(accessToken: string): Promise<TwitterOAuthUser> {
  try {
    const client = new TwitterApi(accessToken);
    
    // Use v1.1 API instead of v2
    const user = await client.v1.verifyCredentials({
      include_email: false,
      include_entities: false,
      skip_status: true
    });
    
    if (!user) {
      throw new Error('Failed to fetch user data');
    }
    
    return {
      id: user.id_str,
      username: user.screen_name,
      name: user.name,
      profileImageUrl: user.profile_image_url_https,
      verified: user.verified,
      publicMetrics: {
        followersCount: user.followers_count,
        followingCount: user.friends_count,
        tweetCount: user.statuses_count
      },
    };
  } catch (error) {
    console.error('Error fetching authenticated user:', error);
    throw error;
  }
}

/**
 * Verify if the authenticated user follows a specific account
 * @param accessToken - The user's access token
 * @param targetUsername - The username to check if following
 * @returns Promise<boolean>
 */
export async function verifyFollowingWithAuth(
  accessToken: string,
  targetUsername: string = 'TopayFoundation'
): Promise<boolean> {
  try {
    const client = new TwitterApi(accessToken);
    
    // Use v1.1 API instead of v2
    const friendship = await client.v1.friendship({
      source_screen_name: await (await client.v1.verifyCredentials()).screen_name,
      target_screen_name: targetUsername
    });
    
    return friendship.relationship.source.following || false;
  } catch (error) {
    console.error('Error verifying following with auth:', error);
    return false;
  }
}

/**
 * Post a tweet on behalf of the authenticated user
 * @param accessToken - The user's access token
 * @param text - The tweet text
 * @returns Promise<Record<string, unknown>>
 */
export async function postTweet(accessToken: string, text: string): Promise<Record<string, unknown>> {
  try {
    const client = new TwitterApi(accessToken);
    
    // Use v1.1 API instead of v2
    const tweet = await client.v1.tweet(text);
    
    return tweet as unknown as Record<string, unknown>;
  } catch (error) {
    console.error('Error posting tweet:', error);
    throw error;
  }
}

/**
 * Revoke access token (logout)
 * @param accessToken - The access token to revoke
 * @returns Promise<boolean>
 */
export async function revokeAccessToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.twitter.com/oauth2/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        token: accessToken,
        token_type_hint: 'access_token',
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error revoking access token:', error);
    return false;
  }
}

/**
 * Check if access token is still valid
 * @param accessToken - The access token to validate
 * @returns Promise<boolean>
 */
export async function validateAccessToken(accessToken: string): Promise<boolean> {
  try {
    const client = new TwitterApi(accessToken);
    await client.v1.verifyCredentials();
    return true;
  } catch {
    return false;
  }
}