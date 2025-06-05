import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Opinion from '@/models/Opinion';

// GET endpoint to fetch a specific opinion by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Opinion ID is required' },
        { status: 400 }
      );
    }
    
    const opinion = await Opinion.findById(id).select('-__v');
    
    if (!opinion) {
      return NextResponse.json(
        { error: 'Opinion not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: opinion
    });
  } catch (error) {
    console.error('Error fetching opinion:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opinion' },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update opinion (likes/dislikes/visibility)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const id = params.id;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Opinion ID is required' },
        { status: 400 }
      );
    }
    
    // Allow updating likes, dislikes, and visibility
    const { action } = body;
    
    if (!action || (action !== 'like' && action !== 'dislike' && action !== 'toggleVisibility')) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "like", "dislike", or "toggleVisibility"' },
        { status: 400 }
      );
    }
    
    // Find the opinion
    const opinion = await Opinion.findById(id);
    
    if (!opinion) {
      return NextResponse.json(
        { error: 'Opinion not found' },
        { status: 404 }
      );
    }
    
    // Update based on action
    if (action === 'like') {
      opinion.likes += 1;
      await opinion.save();
      
      return NextResponse.json({
        success: true,
        data: {
          likes: opinion.likes,
          dislikes: opinion.dislikes
        }
      });
    } else if (action === 'dislike') {
      opinion.dislikes += 1;
      await opinion.save();
      
      return NextResponse.json({
        success: true,
        data: {
          likes: opinion.likes,
          dislikes: opinion.dislikes
        }
      });
    } else if (action === 'toggleVisibility') {
      // Toggle visibility (admin action)
      opinion.isVisible = !opinion.isVisible;
      await opinion.save();
      
      return NextResponse.json({
        success: true,
        data: {
          isVisible: opinion.isVisible
        }
      });
    }
  } catch (error) {
    console.error('Error updating opinion:', error);
    return NextResponse.json(
      { error: 'Failed to update opinion' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove an opinion (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Opinion ID is required' },
        { status: 400 }
      );
    }
    
    // For now, we'll just set isVisible to false instead of actually deleting
    const result = await Opinion.findByIdAndUpdate(
      id,
      { isVisible: false },
      { new: true }
    );
    
    if (!result) {
      return NextResponse.json(
        { error: 'Opinion not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Opinion removed successfully'
    });
  } catch (error) {
    console.error('Error removing opinion:', error);
    return NextResponse.json(
      { error: 'Failed to remove opinion' },
      { status: 500 }
    );
  }
}