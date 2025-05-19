import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import mongoose from 'mongoose';

interface UpdateTaskProgressRequest {
  walletAddress: string;
  taskId: string;
  taskNumber: number;
  status: 'pending' | 'in-progress' | 'verified' | 'completed';
  pointsEarned?: number;
}

export async function POST(request: Request) {
  try {
    // Connect to the database
    await connectDB();
    
    // Parse the request body
    const body = await request.json() as UpdateTaskProgressRequest;
    const { walletAddress, taskId, taskNumber, status, pointsEarned } = body;
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
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
    
    // Check if task progress already exists
    const taskObjectId = new mongoose.Types.ObjectId(taskId);
    const existingTaskIndex = user.taskProgress.findIndex(
      task => task.taskId.toString() === taskId || task.taskNumber === taskNumber
    );
    
    const now = new Date();
    let updatedTask;
    
    if (existingTaskIndex >= 0) {
      // Update existing task progress
      updatedTask = user.taskProgress[existingTaskIndex];
      updatedTask.status = status;
      
      // Update timestamps based on status
      if (status === 'in-progress' && !updatedTask.startedAt) {
        updatedTask.startedAt = now;
      } else if (status === 'verified' && !updatedTask.verifiedAt) {
        updatedTask.verifiedAt = now;
      } else if (status === 'completed' && !updatedTask.completedAt) {
        updatedTask.completedAt = now;
      }
      
      // Update points if provided and task is completed
      if (pointsEarned !== undefined && status === 'completed') {
        // Calculate points difference
        const pointsDifference = pointsEarned - (updatedTask.pointsEarned || 0);
        
        // Update task points
        updatedTask.pointsEarned = pointsEarned;
        
        // Update user total points
        user.points += pointsDifference;
        
        // Add to activity log if points were earned
        if (pointsDifference > 0) {
          user.activityLog.push({
            action: `Completed task #${taskNumber}`,
            timestamp: now,
            points: pointsDifference
          });
        }
      }
      
      user.taskProgress[existingTaskIndex] = updatedTask;
    } else {
      // Create new task progress entry
      updatedTask = {
        taskId: taskObjectId,
        taskNumber,
        status,
        pointsEarned: pointsEarned || 0,
        startedAt: status === 'in-progress' ? now : undefined,
        verifiedAt: status === 'verified' ? now : undefined,
        completedAt: status === 'completed' ? now : undefined
      };
      
      user.taskProgress.push(updatedTask);
      
      // Add points if task is completed and points are provided
      if (status === 'completed' && pointsEarned) {
        user.points += pointsEarned;
        
        // Add to activity log
        user.activityLog.push({
          action: `Started task #${taskNumber}`,
          timestamp: now,
          points: pointsEarned
        });
      }
    }
    
    user.updatedAt = now;
    await user.save();
    
    return NextResponse.json(
      { 
        message: 'Task progress updated successfully', 
        taskProgress: updatedTask,
        currentPoints: user.points 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating task progress:', error);
    
    return NextResponse.json(
      { error: 'Failed to update task progress' },
      { status: 500 }
    );
  }
}

// Get task progress for a user
export async function GET(request: Request) {
  try {
    // Connect to the database
    await connectDB();
    
    // Get wallet address from URL
    const url = new URL(request.url);
    const walletAddress = url.searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
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
    
    return NextResponse.json(
      { 
        taskProgress: user.taskProgress,
        totalTasks: user.taskProgress.length,
        completedTasks: user.taskProgress.filter(task => task.status === 'completed').length
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error getting task progress:', error);
    
    return NextResponse.json(
      { error: 'Failed to get task progress' },
      { status: 500 }
    );
  }
}