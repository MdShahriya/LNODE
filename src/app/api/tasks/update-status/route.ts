import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Task from '@/models/Task';
import User from '@/models/User';
import UserTask from '@/models/UserTask';

// POST /api/tasks/update-status - Update task status
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { walletAddress, taskId, status } = await request.json();
    
    if (!walletAddress || !taskId || !status) {
      return NextResponse.json({ error: 'Wallet address, task ID, and status are required' }, { status: 400 });
    }
    
    // Validate status
    if (!['in_progress', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be in_progress or completed' }, { status: 400 });
    }
    
    // Find the user
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Find the task
    const task = await Task.findById(taskId);
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    // Find or create user task
    let userTask = await UserTask.findOne({ userId: user._id, taskId: task._id });
    
    if (!userTask) {
      userTask = new UserTask({
        userId: user._id,
        taskId: task._id,
        status: 'available'
      });
    }
    
    // Update status based on current status and requested status
    if (status === 'in_progress' && userTask.status === 'available') {
      userTask.status = 'in_progress';
      userTask.startedAt = new Date();
    } else if (status === 'completed' && (userTask.status === 'in_progress' || userTask.status === 'available')) {
      userTask.status = 'completed';
      userTask.completedAt = new Date();
      
      // Award points to user
      user.points += task.rewards.points;
      user.tasksCompleted += 1;
      await user.save();
    } else {
      return NextResponse.json({ 
        error: `Cannot change task status from ${userTask.status} to ${status}` 
      }, { status: 400 });
    }
    
    await userTask.save();
    
    return NextResponse.json({ 
      success: true, 
      task: {
        id: task._id,
        title: task.title,
        description: task.description,
        rewards: task.rewards,
        requirements: task.requirements,
        status: userTask.status,
        taskUrl: task.taskUrl,
        verificationMethod: task.verificationMethod
      }
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    return NextResponse.json({ error: 'Failed to update task status' }, { status: 500 });
  }
}