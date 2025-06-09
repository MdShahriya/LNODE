import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

// GET /api/user/profile-completion - Check if user profile is complete
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get walletAddress from query params
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }
    
    // Find the user
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check profile completion requirements
    const requirements = {
      walletConnected: !!user.walletAddress,
      username: !!user.username,
      email: !!user.email,
      verification: user.verification === 'verified' // Optional but gives bonus
    };
    
    // Profile is considered complete if wallet, username, and email are provided
    const isComplete = requirements.walletConnected && requirements.username && requirements.email;
    
    return NextResponse.json({ 
      verified: isComplete,
      requirements,
      completionPercentage: Math.round(
        (Object.values(requirements).filter(Boolean).length / Object.keys(requirements).length) * 100
      )
    });
  } catch (error) {
    console.error('Error checking profile completion:', error);
    return NextResponse.json({ error: 'Failed to check profile completion' }, { status: 500 });
  }
}