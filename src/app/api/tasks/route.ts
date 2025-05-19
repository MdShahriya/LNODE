import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Task, UserTask } from '@/lib/models/Task';
import User from '@/lib/models/User';

// GET: Fetch all tasks or tasks for a specific user
export async function GET(request: Request) {
  try {
    // Connect to the database
    await connectDB();
    
    // Get parameters from the URL
    const url = new URL(request.url);
    const walletAddress = url.searchParams.get('walletAddress');
    const status = url.searchParams.get('status');
    
    // If wallet address is provided, fetch tasks for that user
    if (walletAddress) {
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
      
      // Find all tasks
      const tasks = await Task.find({ isActive: true });
      
      // Find user's task completions
      let userTaskQuery: { user: any; status?: string } = { user: user._id };
      if (status) {
        userTaskQuery.status = status;
      }
      
      const userTasks = await UserTask.find(userTaskQuery).populate('task');
      
      // Create a map of task ID to user task status
      const userTaskMap = new Map();
      userTasks.forEach(userTask => {
        // Ensure we have an _id by using the populated task document
        const taskId = userTask.task._id?.toString() || userTask.task.toString();
        userTaskMap.set(taskId, {
          status: userTask.status,
          completionDate: userTask.completionDate,
          verificationDate: userTask.verificationDate,
          proofOfWork: userTask.proofOfWork,
          earnedPoints: userTask.earnedPoints
        });
      });
      
      // Combine task data with user completion status
      const tasksWithStatus = tasks.map(task => {
        const taskObj = task.toObject();
        const userTaskInfo = userTaskMap.get(task._id.toString()) || { status: 'pending' };
        
        return {
          ...taskObj,
          userStatus: userTaskInfo
        };
      });
      
      return NextResponse.json(
        { tasks: tasksWithStatus },
        { status: 200 }
      );
    }
    
    // If no wallet address, just return all active tasks
    const tasks = await Task.find({ isActive: true });
    
    return NextResponse.json(
      { tasks },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching tasks:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST: Create a new task (admin only in a real app)
export async function POST(request: Request) {
  try {
    // Connect to the database
    await connectDB();
    
    // Parse the request body
    const body = await request.json();
    const { title, description, points, requirements, completionSteps, category, isActive } = body;
    
    if (!title || !description || points === undefined) {
      return NextResponse.json(
        { error: 'Title, description, and points are required' },
        { status: 400 }
      );
    }
    
    // Create new task
    const newTask = new Task({
      title,
      description,
      points,
      requirements: requirements || '',
      completionSteps: completionSteps || '',
      category: category || 'other',
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date(),
    });
    
    await newTask.save();
    
    return NextResponse.json(
      { message: 'Task created successfully', task: newTask },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating task:', error);
    
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}