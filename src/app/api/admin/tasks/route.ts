import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Task from '@/models/Task';

// GET /api/admin/tasks - Get all tasks
export async function GET() {
  try {
    await connectDB();
    
    // Get all tasks, sorted by creation date (newest first)
    const tasks = await Task.find().sort({ createdAt: -1 });
    
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/admin/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const data = await request.json();
    
    // Validate required fields
    if (!data.title || !data.description || !data.rewards || !data.rewards.points) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Create new task
    const task = new Task({
      title: data.title,
      description: data.description,
      rewards: {
        points: data.rewards.points,
      },
      requirements: data.requirements || [],
      isActive: data.isActive !== undefined ? data.isActive : true,
      taskUrl: data.taskUrl || undefined,
    });
    
    await task.save();
    
    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PATCH /api/admin/tasks - Update a task
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    
    const data = await request.json();
    
    // Validate task ID
    if (!data.id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }
    
    // Find task
    const task = await Task.findById(data.id);
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    // Update fields if provided
    if (data.title !== undefined) task.title = data.title;
    if (data.description !== undefined) task.description = data.description;
    if (data.rewards !== undefined) {
      if (data.rewards.points !== undefined) task.rewards.points = data.rewards.points;
    }
    if (data.requirements !== undefined) task.requirements = data.requirements;
    if (data.isActive !== undefined) task.isActive = data.isActive;
    if (data.taskUrl !== undefined) task.taskUrl = data.taskUrl || undefined;
    
    await task.save();
    
    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE /api/admin/tasks - Delete a task
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    // Get task ID from query params
    const taskId = request.nextUrl.searchParams.get('id');
    
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }
    
    // Check if task exists before deletion
    const task = await Task.findById(taskId);
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    // Delete the task
    await Task.findByIdAndDelete(taskId);
    
    return NextResponse.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    // Include more detailed error information if available
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete task';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}