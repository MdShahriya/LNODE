import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyTwitterFollow, verifyRetweet, verifyLike } from '@/lib/twitter';

// GET /api/social/verify - Verify social media follow task completion
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get parameters from query params
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');
    const platform = request.nextUrl.searchParams.get('platform') || 'twitter';
    const username = request.nextUrl.searchParams.get('username');
    const action = request.nextUrl.searchParams.get('action') || 'follow'; // follow, retweet, like
    const targetUsername = request.nextUrl.searchParams.get('targetUsername') || 'TopayFoundation';
    const tweetId = request.nextUrl.searchParams.get('tweetId'); // For retweet/like verification
    
    if (!walletAddress) {
      return NextResponse.json({ 
        error: 'Wallet address is required for social media verification',
        verified: false 
      }, { status: 400 });
    }

    if (platform === 'twitter' && !username) {
      return NextResponse.json({ 
        error: 'Twitter username is required for Twitter verification',
        verified: false 
      }, { status: 400 });
    }
    
    // Find the user
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found. Please ensure your wallet is registered.',
        verified: false 
      }, { status: 404 });
    }

    // Handle Twitter verification
    if (platform === 'twitter') {
      try {
        let isVerified = false;
        let verificationDetails: unknown = {};

        switch (action) {
          case 'follow':
            const followResult = await verifyTwitterFollow(username!, targetUsername);
            isVerified = followResult.isFollowing;
            verificationDetails = {
              action: 'follow',
              targetUsername,
              username: followResult.username,
              userId: followResult.userId
            };
            break;

          case 'retweet':
            if (!tweetId) {
              return NextResponse.json({ 
                error: 'Tweet ID is required for retweet verification',
                verified: false 
              }, { status: 400 });
            }
            isVerified = await verifyRetweet(username!, tweetId);
            verificationDetails = {
              action: 'retweet',
              tweetId,
              username
            };
            break;

          case 'like':
            if (!tweetId) {
              return NextResponse.json({ 
                error: 'Tweet ID is required for like verification',
                verified: false 
              }, { status: 400 });
            }
            isVerified = await verifyLike(username!, tweetId);
            verificationDetails = {
              action: 'like',
              tweetId,
              username
            };
            break;

          default:
            return NextResponse.json({ 
              error: 'Invalid action. Supported actions: follow, retweet, like',
              verified: false 
            }, { status: 400 });
        }

        // Update user's social profiles if verification is successful
        if (isVerified) {
          const socialProfiles = user.socialProfiles || {};
          
          // Update Twitter profile information
          socialProfiles.twitter = {
            username: username,
            verified: true,
            verifiedAt: new Date(),
            verificationDetails
          };

          user.socialProfiles = socialProfiles;
          await user.save();
        }

        return NextResponse.json({ 
          verified: isVerified,
          platform: 'twitter',
          action,
          username,
          verificationDetails,
          message: isVerified 
            ? `Twitter ${action} verification successful!` 
            : `Twitter ${action} verification failed. Please ensure you have completed the required action.`
        });

      } catch (error) {
        console.error('Twitter verification error:', error);
        return NextResponse.json({ 
          error: 'Twitter API verification failed. Please try again later.',
          verified: false,
          details: {
            platform: 'twitter',
            action,
            username,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        }, { status: 500 });
      }
    }

    // Fallback to profile-based verification for other platforms
    const socialProfiles = user.socialProfiles || {};
    const hasSocialProfile = socialProfiles[platform] && socialProfiles[platform].length > 0;
    
    // For now, we'll verify based on profile completion
    // In a real implementation, you would integrate with social media APIs
    const profileCompleteness = {
      hasName: user.name && user.name.length > 0,
      hasEmail: user.email && user.email.length > 0,
      hasSocial: hasSocialProfile,
      hasAvatar: user.avatar && user.avatar.length > 0
    };
    
    const completedFields = Object.values(profileCompleteness).filter(Boolean).length;
    const totalFields = Object.keys(profileCompleteness).length;
    const completionPercentage = (completedFields / totalFields) * 100;
    
    // Require at least 75% profile completion and social profile
    const verified = completionPercentage >= 75 && hasSocialProfile;
    
    if (!hasSocialProfile) {
      return NextResponse.json({ 
        error: `No ${platform} profile found. Please add your ${platform} handle to your profile.`,
        verified: false,
        details: {
          platform,
          hasSocialProfile: false,
          profileCompleteness: completionPercentage
        }
      }, { status: 200 });
    }
    
    return NextResponse.json({ 
      verified,
      message: verified 
        ? `${platform} follow verification successful!` 
        : `Profile incomplete. Please complete your profile and add your ${platform} handle.`,
      details: {
        platform,
        hasSocialProfile,
        profileCompleteness: completionPercentage,
        socialHandle: socialProfiles[platform],
        requiredCompletion: 75
      }
    });
    
  } catch (error) {
    console.error('Error verifying social media:', error);
    return NextResponse.json({ 
      error: 'Failed to verify social media task. Please try again later.',
      verified: false 
    }, { status: 500 });
  }
}