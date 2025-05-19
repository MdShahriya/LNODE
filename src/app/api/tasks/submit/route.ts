import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Task, UserTask } from '@/lib/models/Task';
import User from '@/lib/models/User';

// POST: Submit a task completion
export async function POST(request: Request) {
  try {
    // Connect to the database
    await connectDB();
    
    // Parse the request body
    const body = await request.json();
    const { walletAddress, taskId, proofOfWork } = body;
    
    if (!walletAddress || !taskId) {
      return NextResponse.json(
        { error: 'Wallet address and task ID are required' },
        { status: 400 }
      );
    }
    
    // Validate wallet address format
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
    
    // Find the task
    const task = await Task.findById(taskId);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    if (!task.isActive) {
      return NextResponse.json(
        { error: 'This task is no longer active' },
        { status: 400 }
      );
    }
    
    // Check if user has already submitted this task
    let userTask = await UserTask.findOne({ user: user._id, task: task._id });
    
    if (userTask) {
      // If task is already completed or verified, don't allow resubmission
      if (userTask.status === 'completed' || userTask.status === 'verified') {
        return NextResponse.json(
          { error: 'Task already submitted or verified', userTask },
          { status: 400 }
        );
      }
      
      // Update existing user task
      userTask.status = 'completed';
      userTask.completionDate = new Date();
      userTask.proofOfWork = proofOfWork || '';
      userTask.updatedAt = new Date();
    } else {
      // Create new user task
      userTask = new UserTask({
        user: user._id,
        task: task._id,
        status: 'completed',
        completionDate: new Date(),
        proofOfWork: proofOfWork || '',
        earnedPoints: 0, // Points will be awarded upon verification
      });
    }
    
    await userTask.save();
    
    return NextResponse.json(
      { message: 'Task submitted successfully', userTask },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error submitting task:', error);
    
    // Handle duplicate submission error
    if (error instanceof Error && error.name === 'MongoServerError' && (error as any).code === 11000) {
      return NextResponse.json(
        { error: 'You have already submitted this task' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to submit task' },
      { status: 500 }
    );
  }
}

// PUT: Verify a task completion (admin only in a real app)
export async function PUT(request: Request) {
  try {
    // Connect to the database
    await connectDB();
    
    // Parse the request body
    const body = await request.json();
    const { userTaskId, verified, earnedPoints } = body;
    
    if (!userTaskId) {
      return NextResponse.json(
        { error: 'User task ID is required' },
        { status: 400 }
      );
    }
    
    // Find the user task
    const userTask = await UserTask.findById(userTaskId).populate('task');
    
    if (!userTask) {
      return NextResponse.json(
        { error: 'User task not found' },
        { status: 404 }
      );
    }
    
    // Update user task status based on verification
    if (verified) {
      userTask.status = 'verified';
      userTask.verificationDate = new Date();
      userTask.earnedPoints = earnedPoints || (userTask.task as any).points;
    } else {
      userTask.status = 'pending'; // Reset to pending if verification fails
      userTask.completionDate = undefined;
      userTask.earnedPoints = 0;
    }
    
    userTask.updatedAt = new Date();
    await userTask.save();
    
    return NextResponse.json(
      { message: 'Task verification updated', userTask },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error verifying task:', error);
    
    return NextResponse.json(
      { error: 'Failed to verify task' },
      { status: 500 }
    );
  }
}