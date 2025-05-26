import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import type { FilterQuery } from 'mongoose';

interface UserQuery extends FilterQuery<typeof User> {
  walletAddress?: { $regex: string; $options: string };
  nodeStatus?: boolean;
}

interface SortObject {
  [key: string]: 1 | -1;
}

// GET /api/admin/users - Get users with pagination, search, and filtering
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'points';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const nodeFilter = searchParams.get('nodeFilter') || 'all';
    
    const skip = (page - 1) * limit;
    
    // Build query with proper typing
    const query: UserQuery = {};
    
    // Add search filter if provided
    if (search) {
      query.walletAddress = { $regex: search, $options: 'i' };
    }
    
    // Add node status filter if provided
    if (nodeFilter === 'active') {
      query.nodeStatus = true;
    } else if (nodeFilter === 'inactive') {
      query.nodeStatus = false;
    }
    
    // Count total matching documents for pagination
    const total = await User.countDocuments(query);
    
    // Build sort object with proper typing
    const sort: SortObject = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Fetch users with pagination and sorting
    const users = await User.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    // Format users for response
    const formattedUsers = users.map(user => ({
      id: user._id,
      walletAddress: user.walletAddress,
      points: user.points,
      tasksCompleted: user.tasksCompleted,
      uptime: user.uptime,
      nodeStatus: user.nodeStatus,
      nodeStartTime: user.nodeStartTime,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
    
    return NextResponse.json({
      users: formattedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// PATCH /api/admin/users/:id - Update user
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    
    const data = await request.json();
    const userId = request.url.split('/').pop();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Update user fields
    if (data.points !== undefined) {
      user.points = data.points;
    }
    
    await user.save();
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}