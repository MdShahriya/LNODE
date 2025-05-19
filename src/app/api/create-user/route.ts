import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';

// Define MongoDB error interface for type safety
interface MongoServerError extends Error {
  code?: number;
  keyValue?: Record<string, any>;
  keyPattern?: Record<string, any>;
}

interface CreateUserRequest {
  name?: string;
  email?: string;
  walletAddress: string;
  bio?: string;
  referrer?: string;
}

export async function POST(request: Request) {
  try {
    // Connect to the database
    await connectDB();
    
    // Parse the request body
    const body = await request.json() as CreateUserRequest;
    const { name, email, walletAddress, bio, referrer } = body;
    
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
    
    // Check if user already exists
    const existingUser = await User.findOne({ walletAddress });
    
    if (existingUser) {
      return NextResponse.json(
        { message: 'User already exists', user: existingUser },
        { status: 200 }
      );
    }
    
    // Create new user
    const newUser = new User({
      name: name || '',
      email: email || '',
      walletAddress,
      bio: bio || '',
      points: 0,
      activityLog: [],
      referrer: referrer || null,
      referrals: 0,
      isDeleted: false,
      claimedMissions: [],
      taskProgress: [],
      updatedAt: new Date(),
    });
    
    await newUser.save();
    
    // Handle referral if referrer is provided
    if (referrer && referrer !== walletAddress) {
      // Find the referrer user and increment their referrals count
      const referrerUser = await User.findOne({ walletAddress: referrer });
      if (referrerUser) {
        referrerUser.referrals += 1; // Increment referrer's referral count
        await referrerUser.save();
        console.log(`Referrals updated for referrer: ${referrer}`);
      } else {
        console.log(`Referrer not found: ${referrer}`);
      }
    }
    
    return NextResponse.json(
      { message: 'User created successfully', user: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    
    // Handle duplicate key error
    if (error instanceof Error && error.name === 'MongoServerError' && (error as MongoServerError).code === 11000) {
      return NextResponse.json(
        { error: 'A user with this wallet address already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}