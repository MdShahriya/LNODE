import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Task from '@/models/Task';
import User from '@/models/User';
import UserTask from '@/models/UserTask';

// GET /api/tasks - Get all tasks for a user
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
    
    // Get all active tasks
    const tasks = await Task.find({ isActive: true });
    
    // Get user's task statuses
    const userTasks = await UserTask.find({ userId: user._id });
    
    // Map tasks with user status
    const tasksWithStatus = tasks.map(task => {
      const userTask = userTasks.find(ut => ut.taskId.toString() === task._id.toString());
      
      return {
        id: task._id,
        title: task.title,
        description: task.description,
        rewards: task.rewards,
        requirements: task.requirements,
        status: userTask ? userTask.status : 'available',
        taskUrl: task.taskUrl,
        verificationMethod: task.verificationMethod
      };
    });
    
    return NextResponse.json({ tasks: tasksWithStatus });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}