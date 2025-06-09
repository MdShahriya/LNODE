import crypto from 'crypto';
import { URLSearchParams } from 'url';

// OAuth 1.0a configuration
const TWITTER_API_KEY = process.env.TWITTER_API_KEY!;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET!;
// Make sure this matches EXACTLY what's registered in the Twitter developer portal
const CALLBACK_URL = process.env.TWITTER_CALLBACK_URL || 'https://node.topayfoundation.com/api/auth/callback/twitter';

// OAuth 1.0a interfaces
export interface TwitterOAuth1aState {
  requestToken: string;
  requestTokenSecret: string;
  oauthVerifier?: string;
}

export interface TwitterOAuth1aTokens {
  accessToken: string;
  accessTokenSecret: string;
  userId: string;
  screenName: string;
}

export interface TwitterOAuth1aUser {
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
 * Generate OAuth 1.0a signature using HMAC-SHA1
 * Following X API documentation for creating signatures
 */
function generateOAuthSignature(
  httpMethod: string,
  baseUrl: string,
  parameters: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ''
): string {
  // Step 1: Percent encode parameters
  const encodedParams = Object.entries(parameters)
    .map(([key, value]) => [percentEncode(key), percentEncode(value)])
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  // Step 2: Create signature base string
  const signatureBaseString = [
    httpMethod.toUpperCase(),
    percentEncode(baseUrl),
    percentEncode(encodedParams)
  ].join('&');

  // Step 3: Create signing key
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

  // Step 4: Generate HMAC-SHA1 signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  return signature;
}

/**
 * Percent encode according to RFC 3986
 * Following X API documentation for percent encoding
 */
function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * Generate OAuth 1.0a nonce
 */
function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Generate OAuth 1.0a timestamp
 */
function generateTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

/**
 * Create OAuth 1.0a authorization header
 */
function createAuthorizationHeader(
  httpMethod: string,
  baseUrl: string,
  oauthParams: Record<string, string>,
  additionalParams: Record<string, string> = {}
): string {
  const allParams = { ...oauthParams, ...additionalParams };
  
  const signature = generateOAuthSignature(
    httpMethod,
    baseUrl,
    allParams,
    TWITTER_API_SECRET,
    oauthParams.oauth_token_secret || ''
  );

  const authParams: Record<string, string> = {
    ...oauthParams,
    oauth_signature: signature
  };

  // Remove oauth_token_secret from header (it's only used for signing)
  // Use object rest to exclude oauth_token_secret from the header params
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { oauth_token_secret, ...headerParams } = authParams as Record<string, string> & { oauth_token_secret?: string };
  
  const finalAuthParams = headerParams;

  const authString = Object.entries(finalAuthParams)
    .map(([key, value]) => `${key}="${percentEncode(value)}"`)
    .join(', ');

  return `OAuth ${authString}`;
}

/**
 * Step 1: Request Token
 * POST oauth/request_token
 */
export async function requestToken(): Promise<TwitterOAuth1aState> {
  const oauthParams = {
    oauth_callback: percentEncode(CALLBACK_URL),
    oauth_consumer_key: TWITTER_API_KEY,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: generateTimestamp(),
    oauth_version: '1.0'
  };

  const authHeader = createAuthorizationHeader(
    'POST',
    'https://api.twitter.com/oauth/request_token',
    oauthParams
  );

  try {
    const response = await fetch('https://api.twitter.com/oauth/request_token', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request token failed: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();
    const params = new URLSearchParams(responseText);
    
    const requestToken = params.get('oauth_token');
    const requestTokenSecret = params.get('oauth_token_secret');
    const callbackConfirmed = params.get('oauth_callback_confirmed');

    if (!requestToken || !requestTokenSecret || callbackConfirmed !== 'true') {
      throw new Error('Invalid response from request token endpoint');
    }

    return {
      requestToken,
      requestTokenSecret
    };
  } catch (error) {
    console.error('Error requesting token:', error);
    throw error;
  }
}

/**
 * Step 2: Generate Authorization URL
 * GET oauth/authorize
 */
export function generateAuthorizationUrl(requestToken: string): string {
  const params = new URLSearchParams({
    oauth_token: requestToken
  });

  return `https://api.twitter.com/oauth/authorize?${params.toString()}`;
}

/**
 * Step 3: Access Token
 * POST oauth/access_token
 */
export async function exchangeForAccessToken(
  requestToken: string,
  requestTokenSecret: string,
  oauthVerifier: string
): Promise<TwitterOAuth1aTokens> {
  const oauthParams = {
    oauth_consumer_key: TWITTER_API_KEY,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: generateTimestamp(),
    oauth_token: requestToken,
    oauth_token_secret: requestTokenSecret,
    oauth_verifier: oauthVerifier,
    oauth_version: '1.0'
  };

  const authHeader = createAuthorizationHeader(
    'POST',
    'https://api.twitter.com/oauth/access_token',
    oauthParams
  );

  try {
    const response = await fetch('https://api.twitter.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        oauth_verifier: oauthVerifier
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Access token exchange failed: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();
    const params = new URLSearchParams(responseText);
    
    const accessToken = params.get('oauth_token');
    const accessTokenSecret = params.get('oauth_token_secret');
    const userId = params.get('user_id');
    const screenName = params.get('screen_name');

    if (!accessToken || !accessTokenSecret || !userId || !screenName) {
      throw new Error('Invalid response from access token endpoint');
    }

    return {
      accessToken,
      accessTokenSecret,
      userId,
      screenName
    };
  } catch (error) {
    console.error('Error exchanging for access token:', error);
    throw error;
  }
}

/**
 * Get authenticated user information
 * GET account/verify_credentials
 */
export async function getAuthenticatedUser(
  accessToken: string,
  accessTokenSecret: string
): Promise<TwitterOAuth1aUser> {
  const oauthParams = {
    oauth_consumer_key: TWITTER_API_KEY,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: generateTimestamp(),
    oauth_token: accessToken,
    oauth_token_secret: accessTokenSecret,
    oauth_version: '1.0'
  };

  const authHeader = createAuthorizationHeader(
    'GET',
    'https://api.twitter.com/1.1/account/verify_credentials.json',
    oauthParams,
    {
      include_entities: 'false',
      skip_status: 'true'
    }
  );

  try {
    const response = await fetch(
      'https://api.twitter.com/1.1/account/verify_credentials.json?include_entities=false&skip_status=true',
      {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`User verification failed: ${response.status} - ${errorText}`);
    }

    const user = await response.json();

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
      }
    };
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    throw error;
  }
}

/**
 * Verify if the authenticated user follows a specific account
 * GET friendships/show
 */
export async function verifyFollowing(
  accessToken: string,
  accessTokenSecret: string,
  targetUsername: string = 'TopayFoundation'
): Promise<boolean> {
  const oauthParams = {
    oauth_consumer_key: TWITTER_API_KEY,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: generateTimestamp(),
    oauth_token: accessToken,
    oauth_token_secret: accessTokenSecret,
    oauth_version: '1.0'
  };

  const queryParams = {
    target_screen_name: targetUsername
  };

  const authHeader = createAuthorizationHeader(
    'GET',
    'https://api.twitter.com/1.1/friendships/show.json',
    oauthParams,
    queryParams
  );

  try {
    const params = new URLSearchParams(queryParams);
    const response = await fetch(
      `https://api.twitter.com/1.1/friendships/show.json?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Following verification failed: ${response.status} - ${errorText}`);
    }

    const friendship = await response.json();
    return friendship.relationship?.source?.following || false;
  } catch (error) {
    console.error('Error verifying following:', error);
    return false;
  }
}

/**
 * Post a tweet on behalf of the authenticated user
 * POST statuses/update
 */
export async function postTweet(
  accessToken: string,
  accessTokenSecret: string,
  text: string
): Promise<Record<string, unknown>> {
  const oauthParams = {
    oauth_consumer_key: TWITTER_API_KEY,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: generateTimestamp(),
    oauth_token: accessToken,
    oauth_token_secret: accessTokenSecret,
    oauth_version: '1.0'
  };

  const bodyParams = {
    status: text
  };

  const authHeader = createAuthorizationHeader(
    'POST',
    'https://api.twitter.com/1.1/statuses/update.json',
    oauthParams,
    bodyParams
  );

  try {
    const response = await fetch('https://api.twitter.com/1.1/statuses/update.json', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(bodyParams)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tweet posting failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error posting tweet:', error);
    throw error;
  }
}

/**
 * Revoke access token
 */
export async function revokeAccessToken(
  accessToken: string,
  accessTokenSecret: string
): Promise<boolean> {
  try {
    const url = 'https://api.twitter.com/oauth/invalidate_token';
    const method = 'POST';
    
    const oauthParams = {
      oauth_consumer_key: TWITTER_API_KEY,
      oauth_token: accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: generateTimestamp(),
      oauth_nonce: generateNonce(),
      oauth_version: '1.0'
    };
    
    const authHeader = createAuthorizationHeader(
      method,
      url,
      { ...oauthParams, oauth_token_secret: accessTokenSecret }
    );
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error revoking access token:', error);
    return false;
  }
}

/**
 * Validate access token
 */
export async function validateAccessToken(
  accessToken: string,
  accessTokenSecret: string
): Promise<boolean> {
  try {
    await getAuthenticatedUser(accessToken, accessTokenSecret);
    return true;
  } catch {
    return false;
  }
}