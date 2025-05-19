import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';

interface UpdateProfileRequest {
  name?: string;
  email?: string;
  walletAddress: string;
  bio?: string;
  referrer?: string;
  points?: number;
  claimedMissions?: number[];
}

export async function PUT(request: Request) {
  try {
    // Connect to the database
    await connectDB();
    
    // Parse the request body
    const body = await request.json() as UpdateProfileRequest;
    const { name, email, walletAddress, bio } = body;
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    // Validate wallet address format (basic check)
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
    
    // Update user fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (bio !== undefined) user.bio = bio;
    
    // Update additional fields from sample implementation
    if (body.referrer !== undefined && body.referrer !== user.walletAddress) {
      // Only update referrer if it's different from current and not the user's own address
      if (body.referrer !== user.referrer) {
        user.referrer = body.referrer;
        
        // Update referrer's referral count if referrer exists
        if (body.referrer) {
          const referrerUser = await User.findOne({ walletAddress: body.referrer });
          if (referrerUser) {
            referrerUser.referrals += 1;
            await referrerUser.save();
          }
        }
      }
    }
    
    // Update other fields if provided
    if (body.points !== undefined) user.points = body.points;
    if (body.claimedMissions !== undefined) user.claimedMissions = body.claimedMissions;
    
    user.updatedAt = new Date();
    
    await user.save();
    
    return NextResponse.json(
      { message: 'Profile updated successfully', user },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating profile:', error);
    
    // Handle duplicate key error (e.g., if email is already in use)
    if (error instanceof Error && error.name === 'MongoServerError' && (error as any).code === 11000) {
      return NextResponse.json(
        { error: 'Email address is already in use' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // For compatibility, also handle POST requests by redirecting to PUT handler
  return PUT(request);
}