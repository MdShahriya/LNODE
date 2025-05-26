import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Task from '@/models/Task';
import UserTask from '@/models/UserTask';

// GET /api/admin/stats - Get admin dashboard statistics
export async function GET() {
  try {
    await connectDB();
    
    // Get total users count
    const totalUsers = await User.countDocuments();
    
    // Get active tasks count
    const activeTasks = await Task.countDocuments({ isActive: true });
    
    // Get completed tasks count
    const completedTasks = await UserTask.countDocuments({ status: 'completed' });
    
    // Get total points awarded
    const pointsResult = await User.aggregate([
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$points' }
        }
      }
    ]);
    
    const totalPoints = pointsResult.length > 0 ? pointsResult[0].totalPoints : 0;
    
    return NextResponse.json({
      totalUsers,
      activeTasks,
      completedTasks,
      totalPoints
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Failed to fetch admin statistics' }, { status: 500 });
  }
}