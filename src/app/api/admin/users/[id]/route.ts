import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

// PATCH /api/admin/users/[id] - Update user by ID
export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    await connectDB();
    
    const data = await request.json();
    const userId = context.params.id;
    
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

// GET /api/admin/users/[id] - Get user by ID
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    await connectDB();
    
    const userId = context.params.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}