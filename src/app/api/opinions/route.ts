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
    
    // Fetch opinions with pagination
    const opinions = await Opinion.find({ isVisible: true })
      .sort({ timestamp: -1 }) // Newest first
      .skip(skip)
      .limit(limit)
      .select('-__v');
    
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
    const { walletAddress, content, title, creditCost = 100 } = body;
    
    if (!walletAddress || !content || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate minimum credit cost
    if (creditCost < 1) {
      return NextResponse.json(
        { error: 'Minimum credit cost is 1 credit' },
        { status: 400 }
      );
    }
    
    // Import User and PointsHistory models
    const User = (await import('@/models/User')).default;
    const PointsHistory = (await import('@/models/PointsHistory')).default;
    
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
    
    // Create a points history record for the deduction
    const currentBalance = user.credits;
    const newBalance = currentBalance - creditCost;
    
    const pointsHistory = new PointsHistory({
      user: user._id,
      walletAddress: walletAddress.toLowerCase(),
      points: 0, // Not affecting points anymore
      basePoints: 0,
      source: 'credits',
      subSource: 'opinion_creation',
      description: `Spent ${creditCost} credits to create an opinion: ${title}`,
      transactionType: 'debit',
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      isVerified: true,
      verifiedBy: 'system',
      verificationDate: new Date(),
      metadata: {
        opinionTitle: title,
        apiVersion: '2.0'
      }
    });
    
    await pointsHistory.save();
    
    // Update user's credits balance
    user.credits = newBalance;
    await user.save();
    
    // Create new opinion
    const newOpinion = new Opinion({
      walletAddress: walletAddress.toLowerCase(),
      content,
      title,
      creditCost,
      pointsTransactionId: pointsHistory._id,
      tags: body.tags || [],
      timestamp: new Date()
      // Remove paymentTxHash field as it's not needed
    });
    
    await newOpinion.save();
    
    return NextResponse.json({
      success: true,
      data: newOpinion,
      remainingCredits: newBalance,
      points: user.points // Also return points for reference
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