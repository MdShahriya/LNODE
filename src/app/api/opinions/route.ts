import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Opinion from '@/models/Opinion';

// GET endpoint to fetch all opinions
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const total = await Opinion.countDocuments({ isVisible: true });
    
    // Fetch opinions with pagination and join with user data for verification status
    const opinions = await Opinion.aggregate([
      { $match: { isVisible: true } },
      { $sort: { timestamp: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'walletAddress',
          foreignField: 'walletAddress',
          as: 'userInfo'
        }
      },
      {
        $addFields: {
          verification: {
            $ifNull: [
              { $arrayElemAt: ['$userInfo.verification', 0] },
              'unverified'
            ]
          }
        }
      },
      {
        $project: {
          __v: 0,
          userInfo: 0
        }
      }
    ]);
    
    return NextResponse.json({
      success: true,
      data: opinions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching opinions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opinions' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new opinion
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    // Validate required fields
    const { walletAddress, content, title, creditCost = 1, priority = 1 } = body;
    
    if (!walletAddress || !content || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate priority and calculate expected credit cost
    const validPriorities = [1, 2, 3, 4, 5];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority. Must be between 1-5' },
        { status: 400 }
      );
    }
    
    // Calculate expected credit cost based on priority
    const expectedCreditCost = {
      1: 2,   // Low priority
      2: 4,   // Normal priority
      3: 6,   // Medium priority
      4: 8,   // High priority
      5: 10    // Urgent priority
}[priority as 1 | 2 | 3 | 4 | 5];
    
    // Validate that the provided credit cost matches the expected cost for the priority
    if (creditCost !== expectedCreditCost) {
      return NextResponse.json(
        { error: `Invalid credit cost for priority ${priority}. Expected ${expectedCreditCost} credits` },
        { status: 400 }
      );
    }
    
    // Import User model
    const User = (await import('@/models/User')).default;
    
    // Find the user
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user has enough credits
    if (user.credits < creditCost) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please recharge your opinion credits.' },
        { status: 400 }
      );
    }
    
    // Burn credits directly from user account
    const newBalance = user.credits - creditCost;
    user.credits = newBalance;
    await user.save();
    
    // Create new opinion
    const newOpinion = new Opinion({
      walletAddress: walletAddress.toLowerCase(),
      content,
      title,
      creditCost,
      priority,
      tags: body.tags || [],
      timestamp: new Date()
    });
    
    await newOpinion.save();
    
    return NextResponse.json({
      success: true,
      data: newOpinion,
      remainingCredits: newBalance
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating opinion:', error);
    return NextResponse.json(
      { error: 'Failed to create opinion' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove an opinion (admin only)
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
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