import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Achievement from '@/models/Achievement';

// PUT /api/admin/achievements/[id]/toggle - Toggle achievement active status
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
    const data = await request.json();
    
    if (data.isActive === undefined) {
      return NextResponse.json(
        { error: 'isActive field is required' },
        { status: 400 }
      );
    }
    
    // Find and update achievement status
    const { id } = await context.params;
    const achievement = await Achievement.findByIdAndUpdate(
      id,
      { isActive: data.isActive },
      { new: true }
    );
    
    if (!achievement) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(achievement);
  } catch (error) {
    console.error('Error toggling achievement status:', error);
    return NextResponse.json(
      { error: 'Failed to update achievement status' },
      { status: 500 }
    );
  }
}