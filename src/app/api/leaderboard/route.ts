import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET() {
  try {
    await connectDB();
    
    // Get top users sorted by points - optimized with compound index and lean()
    const users = await User.find({ isActive: true }, 'walletAddress points tasksCompleted uptime')
      .sort({ points: -1, _id: 1 }) // Use compound index for efficient pagination
      .limit(50) // Limit to top 50 users
      .lean(); // Use lean() for better performance when not modifying documents
    
    // Format the data for the leaderboard
    const leaderboardData = users.map((user, index) => ({
      rank: index + 1,
      address: user.walletAddress,
      points: user.points,
      tasksCompleted: user.tasksCompleted,
      uptime: Math.floor(user.uptime / 3600), // Convert seconds to hours
    }));
    
    return NextResponse.json({ leaderboard: leaderboardData });
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data' },
      { status: 500 }
    );
  }
}