import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET() {
  try {
    await connectDB();
    
    // Get top users sorted by points
    const users = await User.find({}, 'walletAddress points tasksCompleted uptime')
      .sort({ points: -1 }) // Sort by points in descending order
      .limit(50); // Limit to top 50 users
    
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