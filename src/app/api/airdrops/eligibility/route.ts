import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { Airdrop, UserAirdrop } from '@/lib/models/Airdrop';
import User from '@/lib/models/User';
import { UserTask } from '@/lib/models/Task';
import Referral from '@/lib/models/Referral';

// Calculate user's eligibility score for an airdrop
async function calculateEligibilityScore(userId: string | mongoose.Types.ObjectId): Promise<number> {
  // Get completed tasks
  const completedTasks = await UserTask.find({
    user: userId,
    status: 'verified'
  });
  
  // Get successful referrals
  const successfulReferrals = await Referral.find({
    referrer: userId,
    status: 'completed'
  });
  
  // Calculate score based on tasks and referrals
  const taskPoints = completedTasks.reduce((sum, task) => sum + task.earnedPoints, 0);
  const referralPoints = successfulReferrals.reduce((sum, ref) => sum + ref.pointsAwarded, 0);
  
  // Total score
  return taskPoints + referralPoints;
}

// POST: Check or update a user's eligibility for an airdrop
export async function POST(request: Request) {
  try {
    // Connect to the database
    await connectDB();
    
    // Parse the request body
    const body = await request.json();
    const { walletAddress, airdropId } = body;
    
    if (!walletAddress || !airdropId) {
      return NextResponse.json(
        { error: 'Wallet address and airdrop ID are required' },
        { status: 400 }
      );
    }
    
    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }
    
    // Find the user by wallet address
    const user = await User.findOne({ walletAddress });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find the airdrop
    const airdrop = await Airdrop.findById(airdropId);
    
    if (!airdrop) {
      return NextResponse.json(
        { error: 'Airdrop not found' },
        { status: 404 }
      );
    }
    
    // Check if airdrop is active and within date range
    const now = new Date();
    if (!airdrop.isActive || now < airdrop.startDate || now > airdrop.endDate) {
      return NextResponse.json(
        { error: 'Airdrop is not active or outside of valid date range' },
        { status: 400 }
      );
    }
    
    // Calculate user's eligibility score
    const eligibilityScore = await calculateEligibilityScore(user._id);
    
    // Determine eligibility status (example threshold: 100 points)
    const isEligible = eligibilityScore >= 100;
    
    // Find or create user airdrop record
    let userAirdrop = await UserAirdrop.findOne({ user: user._id, airdrop: airdrop._id });
    
    if (userAirdrop) {
      // Update existing record
      userAirdrop.eligibilityScore = eligibilityScore;
      userAirdrop.status = isEligible ? 'eligible' : 'ineligible';
      userAirdrop.updatedAt = new Date();
    } else {
      // Create new record
      userAirdrop = new UserAirdrop({
        user: user._id,
        airdrop: airdrop._id,
        status: isEligible ? 'eligible' : 'ineligible',
        eligibilityScore,
        claimedAmount: 0
      });
    }
    
    await userAirdrop.save();
    
    return NextResponse.json({
      eligibility: {
        isEligible,
        score: eligibilityScore,
        status: userAirdrop.status,
        airdrop: airdrop
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error checking eligibility:', error);
    
    return NextResponse.json(
      { error: 'Failed to check eligibility' },
      { status: 500 }
    );
  }
}

// PUT: Claim an airdrop
export async function PUT(request: Request) {
  try {
    // Connect to the database
    await connectDB();
    
    // Parse the request body
    const body = await request.json();
    const { walletAddress, airdropId, transactionHash } = body;
    
    if (!walletAddress || !airdropId) {
      return NextResponse.json(
        { error: 'Wallet address and airdrop ID are required' },
        { status: 400 }
      );
    }
    
    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }
    
    // Find the user by wallet address
    const user = await User.findOne({ walletAddress });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find the airdrop
    const airdrop = await Airdrop.findById(airdropId);
    
    if (!airdrop) {
      return NextResponse.json(
        { error: 'Airdrop not found' },
        { status: 404 }
      );
    }
    
    // Find user airdrop record
    const userAirdrop = await UserAirdrop.findOne({ user: user._id, airdrop: airdrop._id });
    
    if (!userAirdrop) {
      return NextResponse.json(
        { error: 'User is not registered for this airdrop' },
        { status: 404 }
      );
    }
    
    // Check if user is eligible
    if (userAirdrop.status !== 'eligible') {
      return NextResponse.json(
        { error: 'User is not eligible for this airdrop' },
        { status: 400 }
      );
    }
    
    // Check if already claimed
    if (userAirdrop.status === 'claimed') {
      return NextResponse.json(
        { error: 'Airdrop already claimed', userAirdrop },
        { status: 400 }
      );
    }
    
    // Calculate claim amount based on eligibility score
    // This is a simple example - in a real app, you might have a more complex formula
    const claimAmount = (userAirdrop.eligibilityScore / 1000) * airdrop.totalAmount;
    
    // Update user airdrop record
    userAirdrop.status = 'claimed';
    userAirdrop.claimedAmount = claimAmount;
    userAirdrop.claimedAt = new Date();
    userAirdrop.transactionHash = transactionHash || '';
    userAirdrop.updatedAt = new Date();
    
    await userAirdrop.save();
    
    return NextResponse.json({
      message: 'Airdrop claimed successfully',
      claim: {
        amount: claimAmount,
        token: airdrop.tokenSymbol,
        timestamp: userAirdrop.claimedAt,
        transactionHash: userAirdrop.transactionHash
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error claiming airdrop:', error);
    
    return NextResponse.json(
      { error: 'Failed to claim airdrop' },
      { status: 500 }
    );
  }
}