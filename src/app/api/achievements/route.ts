import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Achievement from '@/models/Achievement';

// Define achievement types for the response
interface AchievementResponse {
  id: string;
  title: string;
  description: string;
  reward: number;
  progress: number;
  target: number;
  completed: boolean;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Get user data
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get all active achievements from the database
    const dbAchievements = await Achievement.find({ isActive: true });
    
    // Map database achievements to response format with user progress
    const achievements: AchievementResponse[] = dbAchievements.map(achievement => {
      let progress = 0;
      let completed = false;
      
      // Calculate progress based on achievement type/target
      switch(achievement.title) {
        case 'Node Master':
          progress = user.uptime || 0;
          completed = progress >= achievement.target;
          break;
        case 'Task Champion':
          progress = user.tasksCompleted || 0;
          completed = progress >= achievement.target;
          break;
        case 'Point Collector':
          progress = user.points || 0;
          completed = progress >= achievement.target;
          break;
        default:
          progress = 0;
          completed = false;
      }
      
      return {
        id: achievement._id.toString(),
        title: achievement.title,
        description: achievement.description,
        reward: achievement.reward,
        progress: progress,
        target: achievement.target,
        completed: completed
      };
    });
    
    return NextResponse.json({ achievements });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}