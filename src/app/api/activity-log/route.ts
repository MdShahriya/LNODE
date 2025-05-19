import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';

interface ActivityLogRequest {
  walletAddress: string;
  action: string;
  points: number;
}

export async function POST(request: Request) {
  try {
    // Connect to the database
    await connectDB();
    
    // Parse the request body
    const body = await request.json() as ActivityLogRequest;
    const { walletAddress, action, points } = body;
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
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
    
    // Create new activity log entry
    const newActivity = {
      action,
      timestamp: new Date(),
      points: points || 0
    };
    
    // Add to activity log array
    user.activityLog.push(newActivity);
    
    // Update user points if provided
    if (points) {
      user.points += points;
    }
    
    user.updatedAt = new Date();
    await user.save();
    
    return NextResponse.json(
      { 
        message: 'Activity log added successfully', 
        activity: newActivity,
        currentPoints: user.points 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error adding activity log:', error);
    
    return NextResponse.json(
      { error: 'Failed to add activity log' },
      { status: 500 }
    );
  }
}