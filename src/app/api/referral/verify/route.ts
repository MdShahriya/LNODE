import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

// GET /api/referral/verify - Verify referral task completion
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get walletAddress from query params
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json({ 
        error: 'Wallet address is required for referral verification',
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
    
    // Check if user has made any referrals
    const referralCount = await User.countDocuments({ 
      referredBy: user._id 
    });
    
    // Minimum requirement: at least 1 referral
    const minimumReferrals = 1;
    const verified = referralCount >= minimumReferrals;
    
    // Note: The system uses wallet address as the referral code, not a separate referralCode field
    // So we don't need to check for a referralCode field
    
    return NextResponse.json({ 
      verified,
      message: verified 
        ? 'Referral task verification successful!' 
        : `Insufficient referrals. Required: ${minimumReferrals}, Current: ${referralCount}`,
      details: {
        referralCount,
        minimumRequired: minimumReferrals,
        walletAddress: user.walletAddress // Using wallet address as the referral code
      }
    });
    
  } catch (error) {
    console.error('Error verifying referral:', error);
    return NextResponse.json({ 
      error: 'Failed to verify referral task. Please try again later.',
      verified: false 
    }, { status: 500 });
  }
}