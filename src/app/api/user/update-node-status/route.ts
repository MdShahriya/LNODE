import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { walletAddress, isRunning } = await request.json();
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // If node is being turned on, increment uptime slightly to simulate activity
    // In a real application, you would have a more sophisticated way to track uptime
    if (isRunning) {
      user.uptime += 1;
      user.points += 10; // Award some points for starting the node
    }
    
    await user.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Node status updated',
      user
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating node status:', error);
    return NextResponse.json(
      { error: 'Failed to update node status' },
      { status: 500 }
    );
  }
}