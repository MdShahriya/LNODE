import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Achievement from '@/models/Achievement';

// GET /api/admin/achievements/[id]
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await context.params;
    const achievement = await Achievement.findById(id);

    if (!achievement) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
    }

    return NextResponse.json(achievement);
  } catch (error) {
    console.error('Error fetching achievement:', error);
    return NextResponse.json({ error: 'Failed to fetch achievement' }, { status: 500 });
  }
}

// PUT /api/admin/achievements/[id]
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const data = await request.json();

    if (!data.title || !data.description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const { id } = await context.params;
    const achievement = await Achievement.findByIdAndUpdate(
      id,
      {
        title: data.title,
        description: data.description,
        reward: data.reward,
        target: data.target,
        isActive: data.isActive,
      },
      { new: true }
    );

    if (!achievement) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
    }

    return NextResponse.json(achievement);
  } catch (error) {
    console.error('Error updating achievement:', error);
    return NextResponse.json({ error: 'Failed to update achievement' }, { status: 500 });
  }
}

// DELETE /api/admin/achievements/[id]
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await context.params;
    const achievement = await Achievement.findByIdAndDelete(id);

    if (!achievement) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Achievement deleted successfully' });
  } catch (error) {
    console.error('Error deleting achievement:', error);
    return NextResponse.json({ error: 'Failed to delete achievement' }, { status: 500 });
  }
}
