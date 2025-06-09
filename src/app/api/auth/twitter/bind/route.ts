import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../[...nextauth]/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST() {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.twitterId || !session?.user?.walletAddress) {
      return NextResponse.json(
        { error: 'Twitter authentication or wallet connection required' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Update the user's profile with Twitter information
    const result = await User.updateOne(
      { walletAddress: session.user.walletAddress },
      {
        $set: {
          twitterId: session.user.twitterId,
          twitterUsername: session.user.twitterUsername,
          twitterConnected: true,
          twitterConnectedAt: new Date(),
        },
      },
      { upsert: true }
    );

    if (result.acknowledged) {
      return NextResponse.json({
        success: true,
        message: 'X account successfully bound to your profile',
        twitterUsername: session.user.twitterUsername,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to bind X account' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error binding Twitter account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.walletAddress) {
      return NextResponse.json(
        { error: 'Wallet connection required' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Remove Twitter information from user's profile
    const result = await User.updateOne(
      { walletAddress: session.user.walletAddress },
      {
        $unset: {
          twitterId: '',
          twitterUsername: '',
          twitterConnected: '',
          twitterConnectedAt: '',
        },
      }
    );

    if (result.acknowledged) {
      return NextResponse.json({
        success: true,
        message: 'X account successfully unbound from your profile',
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to unbind X account' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error unbinding Twitter account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}