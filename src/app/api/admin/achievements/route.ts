import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Achievement from '@/models/Achievement';

// GET /api/admin/achievements - Get all achievements
export async function GET() {
  try {
    await connectDB();
    
    const achievements = await Achievement.find().sort({ createdAt: -1 });
    
    return NextResponse.json({ achievements });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}

// POST /api/admin/achievements - Create a new achievement
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const data = await request.json();
    
    // Validate required fields
    if (!data.title || !data.description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }
    
    // Create new achievement
    const achievement = await Achievement.create({
      title: data.title,
      description: data.description,
      reward: data.reward || 0,
      target: data.target || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });
    
    return NextResponse.json(achievement, { status: 201 });
  } catch (error) {
    console.error('Error creating achievement:', error);
    return NextResponse.json(
      { error: 'Failed to create achievement' },
      { status: 500 }
    );
  }
}