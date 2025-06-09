# X API Setup Guide

This guide will help you set up X API integration with OAuth 2.0 authentication for the TOPAY Foundation Dashboard.

## Prerequisites

1. An X Developer Account
2. An X App created in the Developer Portal
3. API keys, tokens, and OAuth 2.0 credentials

## Step 1: Create an X Developer Account

1. Go to [X Developer Portal](https://developer.x.com/)
2. Sign in with your X account
3. Apply for a developer account
4. Wait for approval (usually takes a few hours to a few days)

## Step 2: Create an X App

1. Once approved, go to the [Developer Portal](https://developer.x.com/en/portal/dashboard)
2. Click "Create App" or "+ Create App"
3. Fill in the required information:
   - **App Name**: TOPAY Foundation Dashboard
   - **Description**: Dashboard application for TOPAY Foundation community engagement with OAuth authentication
   - **Website URL**: Your website URL (e.g., `https://yourdomain.com`)
   - **Use Case**: User authentication and social media verification

## Step 3: Configure OAuth 2.0 Settings

### Important: Enable OAuth 2.0

1. In your app dashboard, go to "Settings"
2. Scroll down to "User authentication settings"
3. Click "Set up" or "Edit"
4. Configure the following:
   - **OAuth 2.0**: Enable this option
   - **OAuth 1.0a**: You can disable this if only using OAuth 2.0
   - **App permissions**:
     - ✅ Read
     - ✅ Write (optional, for posting tweets)
     - ✅ Direct Messages (optional)
   - **Type of App**: Web App
   - **Callback URLs**:
     - Development: `http://localhost:3000/api/auth/twitter/callback`
     - Production: `https://yourdomain.com/api/auth/twitter/callback`
   - **Website URL**: Your application's URL
   - **Terms of Service**: Your terms URL (optional)
   - **Privacy Policy**: Your privacy policy URL (optional)

## Step 4: Generate API Keys and Tokens

1. Go to "Keys and Tokens" tab
2. Generate the following:

### For Basic API Access

- **API Key** (Consumer Key)
- **API Secret Key** (Consumer Secret)
- **Bearer Token**
- **Access Token** and **Access Token Secret**

### For OAuth 2.0

- **Client ID** (OAuth 2.0 Client ID)
- **Client Secret** (OAuth 2.0 Client Secret)

⚠️ **Important**: Save the Client Secret immediately as it won't be shown again!

## Step 5: Environment Variables

Create a `.env.local` file in your project root and add:

```env
# Basic Twitter API credentials
TWITTER_BEARER_TOKEN=your_bearer_token_here
TWITTER_API_KEY=your_api_key_here
TWITTER_API_SECRET=your_api_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret_here

# OAuth 2.0 credentials (REQUIRED for user authentication)
TWITTER_CLIENT_ID=your_oauth2_client_id_here
TWITTER_CLIENT_SECRET=your_oauth2_client_secret_here
TWITTER_CALLBACK_URL=http://localhost:3000/api/auth/twitter/callback

# Application settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Step 6: OAuth 2.0 Scopes

The application requests the following scopes by default:

- `tweet.read` - Read tweets
- `users.read` - Read user profile information
- `follows.read` - Read following/followers information
- `like.read` - Read liked tweets

You can customize scopes in the OAuth authorization request.

## OAuth 2.0 Flow

### How it works

1. **User clicks "Connect Twitter"** → App redirects to Twitter OAuth
2. **User authorizes on Twitter** → Twitter redirects back with authorization code
3. **App exchanges code for tokens** → Stores access token securely
4. **App fetches user data** → Updates user profile with Twitter info

### Security Features

- **PKCE (Proof Key for Code Exchange)**: Prevents authorization code interception
- **State parameter**: Prevents CSRF attacks
- **Secure token storage**: Access tokens stored securely in database
- **Token refresh**: Automatic token refresh when expired

## API Rate Limits

Be aware of Twitter API rate limits:

- **Essential Access**: 500,000 tweets per month
- **Elevated Access**: 2,000,000 tweets per month
- **Academic Research**: 10,000,000 tweets per month

### OAuth 2.0 Rate Limits

- **User authentication**: 300 requests per 15-minute window
- **User lookup**: 300 requests per 15-minute window

## Available Features

### With Basic API

1. Verify if users follow specific accounts
2. Check if users have retweeted specific tweets
3. Verify if users have liked specific tweets
4. Get user profile information
5. Fetch user tweets

### With OAuth 2.0

1. **User Authentication**: Secure Twitter login
2. **Profile Connection**: Link Twitter accounts to user profiles
3. **Authenticated Actions**: Perform actions on behalf of users
4. **Real-time Verification**: Verify user actions with their own tokens
5. **Token Management**: Automatic token refresh and revocation

## Testing Your Setup

### 1. Test Basic API

```bash
curl -H "Authorization: Bearer YOUR_BEARER_TOKEN" \
  "https://api.x.com/users/by/username/TwitterDev"
```

### 2. Test OAuth Flow

1. Start your development server: `npm run dev`
2. Navigate to the profile page
3. Click "Connect Twitter"
4. Complete the OAuth flow
5. Verify the connection appears in your profile

## Security Best Practices

1. **Never commit secrets**: Use environment variables for all sensitive data
2. **Secure token storage**: Store access tokens with `select: false` in database
3. **HTTPS in production**: Always use HTTPS for OAuth callbacks
4. **Token expiration**: Implement proper token refresh logic
5. **Scope limitation**: Request only necessary OAuth scopes
6. **Rate limit handling**: Implement proper rate limiting and retry logic
7. **Error handling**: Handle OAuth errors gracefully

## Troubleshooting

### Common OAuth Issues

1. **"Invalid callback URL"**:
   - Ensure callback URL matches exactly in Twitter app settings
   - Check for trailing slashes or protocol mismatches

2. **"Invalid client credentials"**:
   - Verify `TWITTER_CLIENT_ID` and `TWITTER_CLIENT_SECRET`
   - Ensure OAuth 2.0 is enabled in app settings

3. **"Invalid authorization code"**:
   - Code may have expired (10 minutes)
   - Code can only be used once
   - Check PKCE implementation

4. **"Forbidden"**:
   - Check app permissions
   - Verify OAuth scopes
   - Ensure user has authorized the app

### Basic API Issues

1. **401 Unauthorized**: Check your API keys and tokens
2. **403 Forbidden**: Check app permissions and rate limits
3. **404 Not Found**: Verify usernames and tweet IDs
4. **429 Too Many Requests**: You've hit rate limits, wait before retrying

### Development Tips

1. **Use ngrok for local testing**: Expose localhost for OAuth callbacks
2. **Check browser network tab**: Monitor OAuth redirect flows
3. **Enable debug logging**: Add console logs to track OAuth state
4. **Test with different users**: Verify OAuth works for multiple accounts

## Production Deployment

### Before going live

1. **Update callback URLs**: Add production URLs to Twitter app
2. **Use HTTPS**: Ensure all OAuth flows use secure connections
3. **Environment variables**: Set production environment variables
4. **Rate limiting**: Implement application-level rate limiting
5. **Monitoring**: Set up logging and error tracking
6. **Backup tokens**: Implement secure token backup/recovery

### Environment Variables for Production

```env
TWITTER_CLIENT_ID=your_production_client_id
TWITTER_CLIENT_SECRET=your_production_client_secret
TWITTER_CALLBACK_URL=https://yourdomain.com/api/auth/twitter/callback
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

> **Note**: While X is the new brand name, the environment variable names still use the prefix `TWITTER_` for compatibility with existing code.

## Support

For additional help:

- [X API Documentation](https://developer.x.com/en/docs)
- [OAuth 2.0 Guide](https://developer.x.com/en/docs/authentication/oauth-2-0)
- [X API Community](https://twittercommunity.com/)
- [X Developer Support](https://developer.x.com/en/support)

## Step 2: Configure Environment Variables

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Add your Twitter API credentials to `.env`:

   ```env
   TWITTER_API_KEY=your-api-key-here
   TWITTER_API_SECRET=your-api-secret-here
   TWITTER_BEARER_TOKEN=your-bearer-token-here
   TWITTER_ACCESS_TOKEN=your-access-token-here
   TWITTER_ACCESS_TOKEN_SECRET=your-access-token-secret-here
   TWITTER_OFFICIAL_USERNAME=TopayFoundation
   ```

## Step 3: API Endpoints

### Social Verification Endpoint

**URL**: `/api/social/verify`

**Method**: `GET`

**Query Parameters**:

- `walletAddress` (required): User's wallet address
- `platform` (optional): Social platform (default: "twitter")
- `username` (required for Twitter): Twitter username without @
- `action` (optional): Verification action ("follow", "retweet", "like") - default: "follow"
- `targetUsername` (optional): Target Twitter username to verify against - default: "TopayFoundation"
- `tweetId` (required for retweet/like): Tweet ID for retweet or like verification

### Example API Calls

#### 1. Verify Twitter Follow

```javascript
const response = await fetch('/api/social/verify?' + new URLSearchParams({
  walletAddress: '0x1234...abcd',
  platform: 'twitter',
  username: 'user_twitter_handle',
  action: 'follow',
  targetUsername: 'TopayFoundation'
}));

const result = await response.json();
console.log(result);
```

#### 2. Verify Tweet Retweet

```javascript
const response = await fetch('/api/social/verify?' + new URLSearchParams({
  walletAddress: '0x1234...abcd',
  platform: 'twitter',
  username: 'user_twitter_handle',
  action: 'retweet',
  tweetId: '1234567890123456789'
}));

const result = await response.json();
console.log(result);
```

#### 3. Verify Tweet Like

```javascript
const response = await fetch('/api/social/verify?' + new URLSearchParams({
  walletAddress: '0x1234...abcd',
  platform: 'twitter',
  username: 'user_twitter_handle',
  action: 'like',
  tweetId: '1234567890123456789'
}));

const result = await response.json();
console.log(result);
```

## Step 4: Frontend Integration

### Update Task Verification

Modify your task verification logic to include Twitter username input:

```javascript
// Example: Update task verification in your React component
const verifyTwitterTask = async (taskId, username) => {
  try {
    const response = await fetch('/api/social/verify?' + new URLSearchParams({
      walletAddress: address,
      platform: 'twitter',
      username: username,
      action: 'follow'
    }));
    
    const result = await response.json();
    
    if (result.verified) {
      toast.success('Twitter follow verification successful!');
      // Update task status
      await updateTaskStatus(taskId, 'completed');
    } else {
      toast.error(result.message || 'Verification failed');
    }
  } catch (error) {
    toast.error('Verification failed. Please try again.');
  }
};
```

## Step 5: Available Twitter API Functions

The `src/lib/twitter.ts` file provides the following functions:

### `verifyTwitterFollow(username, targetUsername)`

Verifies if a user is following a specific Twitter account.

### `verifyRetweet(username, tweetId)`

Verifies if a user has retweeted a specific tweet.

### `verifyLike(username, tweetId)`

Verifies if a user has liked a specific tweet.

### `getTwitterUser(username)`

Retrieves Twitter user information including follower count and verification status.

### `getUserTweets(username, maxResults)`

Fetches recent tweets from a specific user.

## Step 6: Error Handling

The API handles various error scenarios:

- **Invalid credentials**: Returns 500 with error message
- **User not found**: Returns 404 with appropriate message
- **Missing parameters**: Returns 400 with validation errors
- **Twitter API rate limits**: Returns 500 with retry message
- **Network issues**: Returns 500 with generic error

## Step 7: Rate Limiting

Twitter API has rate limits:

- **Bearer Token**: 300 requests per 15-minute window
- **User Context**: 75 requests per 15-minute window

Implement caching and request throttling in production.

## Step 8: Security Considerations

1. **Never expose API keys**: Keep credentials in environment variables
2. **Validate inputs**: Always validate user inputs before API calls
3. **Rate limiting**: Implement application-level rate limiting
4. **Error handling**: Don't expose sensitive error details to users
5. **HTTPS only**: Use HTTPS in production

## Step 9: Testing

### Test the Integration

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Test the API endpoint:

   ```bash
   curl "http://localhost:3000/api/social/verify?walletAddress=0x123&platform=twitter&username=test_user&action=follow"
   ```

3. Check the response for successful verification or error messages.

## Troubleshooting

### Common Issues

1. **"Twitter API verification failed"**
   - Check your API credentials in `.env`
   - Verify your Twitter app has the correct permissions
   - Check Twitter API status

2. **"User not found"**
   - Verify the Twitter username exists
   - Check if the username is spelled correctly
   - Ensure the user's profile is public

3. **Rate limit exceeded**
   - Wait for the rate limit window to reset
   - Implement caching to reduce API calls
   - Consider upgrading your Twitter API plan

### Debug Mode

Enable debug logging by adding to your `.env`:

```env
NODE_ENV=development
DEBUG=twitter:*
```

## Production Deployment

1. **Environment Variables**: Set all required environment variables in your production environment
2. **Rate Limiting**: Implement Redis-based rate limiting
3. **Caching**: Cache verification results for a reasonable time
4. **Monitoring**: Monitor API usage and error rates
5. **Backup**: Have fallback verification methods

## Support

For issues with Twitter API integration:

1. Check the [Twitter API documentation](https://developer.x.com/en/docs)
2. Review the error logs in your application
3. Test with the Twitter API directly using tools like Postman
4. Contact Twitter Developer Support if needed

---

**Note**: This integration requires active X API credentials. Make sure to comply with X's Terms of Service and API usage policies.
