import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Referral from '@/lib/models/Referral';
import User from '@/lib/models/User';
import crypto from 'crypto';

// Generate a unique referral code for a user
function generateReferralCode(walletAddress: string): string {
  // Use the first 6 characters of the wallet address hash
  const hash = crypto.createHash('sha256').update(walletAddress).digest('hex');
  return hash.substring(0, 6).toUpperCase();
}

// GET: Get referrals for a user or lookup a referral code
export async function GET(request: Request) {
  try {
    // Connect to the database
    await connectDB();
    
    // Get parameters from the URL
    const url = new URL(request.url);
    const walletAddress = url.searchParams.get('walletAddress');
    const referralCode = url.searchParams.get('referralCode');
    
    // If referral code is provided, look it up
    if (referralCode) {
      const referral = await Referral.findOne({ referralCode }).populate('referrer');
      
      if (!referral) {
        return NextResponse.json(
          { error: 'Referral code not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { referral },
        { status: 200 }
      );
    }
    
    // If wallet address is provided, get referrals for that user
    if (walletAddress) {
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
      
      // Generate referral code if not already generated
      const referralCode = generateReferralCode(walletAddress);
      
      // Find referrals where this user is the referrer
      const referrals = await Referral.find({ referrer: user._id }).populate('referee');
      
      // Count completed referrals and total points
      const completedReferrals = referrals.filter(ref => ref.status === 'completed').length;
      const totalPoints = referrals.reduce((sum, ref) => sum + ref.pointsAwarded, 0);
      
      return NextResponse.json({
        referralCode,
        referrals,
        stats: {
          totalReferrals: referrals.length,
          completedReferrals,
          totalPoints
        }
      }, { status: 200 });
    }
    
    return NextResponse.json(
      { error: 'Wallet address or referral code is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching referrals:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch referrals' },
      { status: 500 }
    );
  }
}

// POST: Create a new referral
export async function POST(request: Request) {
  try {
    // Connect to the database
    await connectDB();
    
    // Parse the request body
    const body = await request.json();
    const { refereeWalletAddress, referralCode } = body;
    
    if (!refereeWalletAddress || !referralCode) {
      return NextResponse.json(
        { error: 'Referee wallet address and referral code are required' },
        { status: 400 }
      );
    }
    
    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(refereeWalletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }
    
    // Find the referee user
    let referee = await User.findOne({ walletAddress: refereeWalletAddress });
    
    // If referee doesn't exist, create a new user
    if (!referee) {
      referee = new User({
        walletAddress: refereeWalletAddress,
        name: '',
        email: '',
        bio: ''
      });
      await referee.save();
    }
    
    // Find the referrer by the referral code
    // We need to find a user whose wallet address generates this referral code
    const users = await User.find({});
    let referrer = null;
    
    for (const user of users) {
      if (generateReferralCode(user.walletAddress) === referralCode) {
        referrer = user;
        break;
      }
    }
    
    if (!referrer) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 400 }
      );
    }
    
    // Prevent self-referrals
    if (referrer._id.toString() === referee._id.toString()) {
      return NextResponse.json(
        { error: 'You cannot refer yourself' },
        { status: 400 }
      );
    }
    
    // Check if this referral already exists
    const existingReferral = await Referral.findOne({
      referrer: referrer._id,
      referee: referee._id
    });
    
    if (existingReferral) {
      return NextResponse.json(
        { error: 'This referral already exists', referral: existingReferral },
        { status: 409 }
      );
    }
    
    // Create new referral
    const newReferral = new Referral({
      referrer: referrer._id,
      referee: referee._id,
      referralCode,
      status: 'pending',
      pointsAwarded: 0
    });
    
    await newReferral.save();
    
    return NextResponse.json(
      { message: 'Referral created successfully', referral: newReferral },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating referral:', error);
    
    // Handle duplicate referral error
    if (error instanceof Error && error.name === 'MongoServerError' && (error as any).code === 11000) {
      return NextResponse.json(
        { error: 'This referral already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create referral' },
      { status: 500 }
    );
  }
}

// PUT: Update a referral status (complete a referral)
export async function PUT(request: Request) {
  try {
    // Connect to the database
    await connectDB();
    
    // Parse the request body
    const body = await request.json();
    const { referralId, status, pointsAwarded } = body;
    
    if (!referralId || !status) {
      return NextResponse.json(
        { error: 'Referral ID and status are required' },
        { status: 400 }
      );
    }
    
    // Find the referral
    const referral = await Referral.findById(referralId);
    
    if (!referral) {
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      );
    }
    
    // Update referral status
    referral.status = status;
    
    if (status === 'completed') {
      referral.completedAt = new Date();
      referral.pointsAwarded = pointsAwarded || 100; // Default 100 points for completed referrals
    }
    
    referral.updatedAt = new Date();
    await referral.save();
    
    return NextResponse.json(
      { message: 'Referral updated successfully', referral },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating referral:', error);
    
    return NextResponse.json(
      { error: 'Failed to update referral' },
      { status: 500 }
    );
  }
}