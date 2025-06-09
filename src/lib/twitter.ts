import { TwitterApi } from 'twitter-api-v2';

// Twitter API configuration
const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN!);

// Alternative configuration with full credentials (if needed)
// const twitterClient = new TwitterApi({
//   appKey: process.env.TWITTER_API_KEY!,
//   appSecret: process.env.TWITTER_API_SECRET!,
//   accessToken: process.env.TWITTER_ACCESS_TOKEN,
//   accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
// });

// Read-only client for public data
const readOnlyClient = twitterClient.readOnly;

// Interface for Twitter user data
export interface TwitterUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
  followers_count?: number;
  friends_count?: number;
  statuses_count?: number;
  verified?: boolean;
}

// Interface for Twitter follow verification
export interface FollowVerification {
  isFollowing: boolean;
  userId?: string;
  username?: string;
}

/**
 * Verify if a user is following a specific Twitter account
 * @param username - The username to check (without @)
 * @param targetUsername - The target account username to check if following
 * @returns Promise<FollowVerification>
 */
export async function verifyTwitterFollow(
  username: string,
  targetUsername: string = 'TopayFoundation' // Default to your official account
): Promise<FollowVerification> {
  try {
    // Get user by username using v1.1 API
    const user = await readOnlyClient.v1.user({ screen_name: username });
    
    if (!user) {
      return { isFollowing: false };
    }

    // Get target user using v1.1 API
    const targetUser = await readOnlyClient.v1.user({ screen_name: targetUsername });
    
    if (!targetUser) {
      throw new Error(`Target user ${targetUsername} not found`);
    }

    // Check friendship using v1.1 API
    const friendship = await readOnlyClient.v1.friendship({
      source_screen_name: username,
      target_screen_name: targetUsername
    });

    return {
      isFollowing: friendship.relationship.source.following || false,
      userId: user.id_str,
      username: user.screen_name,
    };
  } catch (error) {
    console.error('Error verifying Twitter follow:', error);
    return { isFollowing: false };
  }
}

/**
 * Get Twitter user information by username
 * @param username - The username to look up (without @)
 * @returns Promise<TwitterUser | null>
 */
export async function getTwitterUser(username: string): Promise<TwitterUser | null> {
  try {
    // Use v1.1 API to get user data
    const user = await readOnlyClient.v1.user({ screen_name: username });

    if (!user) {
      return null;
    }

    return {
      id: user.id_str,
      username: user.screen_name,
      name: user.name,
      profile_image_url: user.profile_image_url_https,
      followers_count: user.followers_count,
      friends_count: user.friends_count,
      statuses_count: user.statuses_count,
      verified: user.verified
    };
  } catch (error) {
    console.error('Error fetching Twitter user:', error);
    return null;
  }
}

/**
 * Verify if a user has retweeted a specific tweet
 * @param username - The username to check
 * @param tweetId - The tweet ID to check for retweet
 * @returns Promise<boolean>
 */
export async function verifyRetweet(username: string, tweetId: string): Promise<boolean> {
  try {
    // Get user by username using v1.1 API
    const user = await readOnlyClient.v1.user({ screen_name: username });
    
    if (!user) {
      return false;
    }

    // Get user's recent tweets (including retweets) using v1.1 API
    const tweets = await readOnlyClient.v1.userTimeline(user.id_str, {
      count: 100,
      include_rts: true
    });

    // Check if any tweet is a retweet of the target tweet
    const hasRetweeted = tweets.tweets.some(tweet => {
      return tweet.retweeted_status && tweet.retweeted_status.id_str === tweetId;
    });

    return hasRetweeted;
  } catch (error) {
    console.error('Error verifying retweet:', error);
    return false;
  }
}

/**
 * Verify if a user has liked a specific tweet
 * @param username - The username to check
 * @param tweetId - The tweet ID to check for like
 * @returns Promise<boolean>
 */
export async function verifyLike(username: string, tweetId: string): Promise<boolean> {
  try {
    // Get user by username using v1.1 API
    const user = await readOnlyClient.v1.user({ screen_name: username });
    
    if (!user) {
      return false;
    }

    // Get user's liked tweets using v1.1 API
    const likedTweets = await readOnlyClient.v1.favoriteTimeline(user.id_str, {
      count: 100
    });

    // Check if the target tweet is in the liked tweets
    const hasLiked = likedTweets.tweets.some(tweet => tweet.id_str === tweetId);

    return hasLiked;
  } catch (error) {
    console.error('Error verifying like:', error);
    return false;
  }
}

/**
 * Get recent tweets from a specific user
 * @param username - The username to get tweets from
 * @param maxResults - Maximum number of tweets to fetch (default: 10)
 * @returns Promise<Array<Record<string, unknown>>>
 */
export async function getUserTweets(username: string, maxResults: number = 10): Promise<Array<Record<string, unknown>>> {
  try {
    // Get user by username using v1.1 API
    const user = await readOnlyClient.v1.user({ screen_name: username });
    
    if (!user) {
      return [];
    }

    // Get user's tweets using v1.1 API
    const tweets = await readOnlyClient.v1.userTimeline(user.id_str, {
      count: maxResults,
      include_entities: true,
      tweet_mode: 'extended'
    });

    // Convert the tweets to the expected return type
    return tweets.tweets.map(tweet => tweet as unknown as Record<string, unknown>);
  } catch (error) {
    console.error('Error fetching user tweets:', error);
    return [];
  }
}

export { readOnlyClient, twitterClient };