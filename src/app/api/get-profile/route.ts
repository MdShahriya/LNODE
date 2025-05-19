import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';

export async function GET(request: Request) {
  try {
    // Connect to the database
    await connectDB();
    
    // Get wallet address from the URL
    const url = new URL(request.url);
    const walletAddress = url.searchParams.get('walletAddress');
    
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
    
    return NextResponse.json(
      { user },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching profile:', error);
    
    // Provide more specific error message if possible
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to fetch profile: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}