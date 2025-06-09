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
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
    listed_count?: number;
    like_count?: number;
    media_count?: number;
  };
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
    // Get user ID by username
    const user = await readOnlyClient.v2.userByUsername(username);
    
    if (!user.data) {
      return { isFollowing: false };
    }

    // Get target user ID
    const targetUser = await readOnlyClient.v2.userByUsername(targetUsername);
    
    if (!targetUser.data) {
      throw new Error(`Target user ${targetUsername} not found`);
    }

    // Check if user is following the target
    const following = await readOnlyClient.v2.following(user.data.id, {
      max_results: 1000, // Adjust based on needs
    });

    const isFollowing = following.data?.some(
      (followedUser) => followedUser.id === targetUser.data.id
    ) || false;

    return {
      isFollowing,
      userId: user.data.id,
      username: user.data.username,
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
    const user = await readOnlyClient.v2.userByUsername(username, {
      'user.fields': ['public_metrics', 'verified', 'created_at'],
    });

    if (!user.data) {
      return null;
    }

    return {
      id: user.data.id,
      username: user.data.username,
      name: user.data.name,
      public_metrics: user.data.public_metrics,
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
    const user = await readOnlyClient.v2.userByUsername(username);
    
    if (!user.data) {
      return false;
    }

    // Get user's recent tweets (including retweets)
    const tweets = await readOnlyClient.v2.userTimeline(user.data.id, {
      max_results: 100,
      'tweet.fields': ['referenced_tweets'],
    });

    // Check if any tweet is a retweet of the target tweet
    const hasRetweeted = tweets.data?.data?.some((tweet: { referenced_tweets?: Array<{ type: string; id: string }> }) => {
      return tweet.referenced_tweets?.some(
        (ref) => ref.type === 'retweeted' && ref.id === tweetId
      );
    }) || false;

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
    const user = await readOnlyClient.v2.userByUsername(username);
    
    if (!user.data) {
      return false;
    }

    // Get user's liked tweets
    const likedTweets = await readOnlyClient.v2.userLikedTweets(user.data.id, {
      max_results: 100,
    });

    // Check if the target tweet is in the liked tweets
    const hasLiked = likedTweets.data?.data?.some((tweet: { id: string }) => tweet.id === tweetId) || false;

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
    const user = await readOnlyClient.v2.userByUsername(username);
    
    if (!user.data) {
      return [];
    }

    const tweets = await readOnlyClient.v2.userTimeline(user.data.id, {
      max_results: maxResults,
      'tweet.fields': ['created_at', 'public_metrics', 'context_annotations'],
    });

    // Convert the tweets.data to the expected return type
    return tweets.data?.data?.map(tweet => tweet as unknown as Record<string, unknown>) || [];
  } catch (error) {
    console.error('Error fetching user tweets:', error);
    return [];
  }
}

export { readOnlyClient, twitterClient };