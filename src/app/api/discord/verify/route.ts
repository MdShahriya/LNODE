import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

// GET /api/discord/verify - Verify Discord community join task completion
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get walletAddress from query params
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json({ 
        error: 'Wallet address is required for Discord verification',
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
    
    // Check if user has Discord information in profile
    const socialProfiles = user.socialProfiles || {};
    const hasDiscordProfile = socialProfiles.discord && socialProfiles.discord.length > 0;
    
    // Check if user has completed profile requirements
    const profileRequirements = {
      hasName: user.name && user.name.length > 0,
      hasEmail: user.email && user.email.length > 0,
      hasDiscord: hasDiscordProfile,
      isVerified: user.isVerified || false
    };
    
    const completedRequirements = Object.values(profileRequirements).filter(Boolean).length;
    const totalRequirements = Object.keys(profileRequirements).length;
    const completionPercentage = (completedRequirements / totalRequirements) * 100;
    
    // For Discord verification, we'll check if user has:
    // 1. Discord handle in profile
    // 2. At least 50% profile completion
    // 3. Account created more than 24 hours ago (to prevent spam)
    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    const minimumAccountAge = 24 * 60 * 60 * 1000; // 24 hours
    const isAccountOldEnough = accountAge >= minimumAccountAge;
    
    const verified = hasDiscordProfile && completionPercentage >= 50 && isAccountOldEnough;
    
    if (!hasDiscordProfile) {
      return NextResponse.json({ 
        error: 'No Discord username found. Please add your Discord handle to your profile.',
        verified: false,
        details: {
          hasDiscordProfile: false,
          profileCompleteness: completionPercentage,
          accountAgeHours: Math.floor(accountAge / (60 * 60 * 1000))
        }
      }, { status: 200 });
    }
    
    if (!isAccountOldEnough) {
      return NextResponse.json({ 
        error: 'Account too new. Please wait 24 hours after registration before completing this task.',
        verified: false,
        details: {
          hasDiscordProfile,
          profileCompleteness: completionPercentage,
          accountAgeHours: Math.floor(accountAge / (60 * 60 * 1000)),
          minimumAgeHours: 24
        }
      }, { status: 200 });
    }
    
    if (completionPercentage < 50) {
      return NextResponse.json({ 
        error: 'Profile incomplete. Please complete at least 50% of your profile.',
        verified: false,
        details: {
          hasDiscordProfile,
          profileCompleteness: completionPercentage,
          requiredCompletion: 50,
          accountAgeHours: Math.floor(accountAge / (60 * 60 * 1000))
        }
      }, { status: 200 });
    }
    
    return NextResponse.json({ 
      verified,
      message: 'Discord community verification successful!',
      details: {
        hasDiscordProfile,
        profileCompleteness: completionPercentage,
        discordHandle: socialProfiles.discord,
        accountAgeHours: Math.floor(accountAge / (60 * 60 * 1000)),
        requirements: profileRequirements
      }
    });
    
  } catch (error) {
    console.error('Error verifying Discord:', error);
    return NextResponse.json({ 
      error: 'Failed to verify Discord task. Please try again later.',
      verified: false 
    }, { status: 500 });
  }
}