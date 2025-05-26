import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

// POST /api/admin/users/reset-node - Reset a user's node status
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Reset node status
    user.nodeStatus = false;
    user.nodeStartTime = null;
    
    await user.save();
    
    return NextResponse.json({ success: true, message: 'Node status reset successfully' });
  } catch (error) {
    console.error('Error resetting node status:', error);
    return NextResponse.json({ error: 'Failed to reset node status' }, { status: 500 });
  }
}