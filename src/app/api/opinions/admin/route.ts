import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Opinion from '@/models/Opinion';
import { FilterQuery } from 'mongoose';
import { IOpinion } from '@/models/Opinion';

// Define the query interface for Opinion filters
interface OpinionQuery extends FilterQuery<IOpinion> {
  isVisible?: boolean;
  $or?: Array<{
    title?: { $regex: string; $options: string };
    content?: { $regex: string; $options: string };
  }>;
}

// GET endpoint to fetch all opinions with admin privileges
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const includeHidden = searchParams.get('includeHidden') === 'true';
    const search = searchParams.get('search') || '';
    const isVisible = searchParams.get('isVisible');
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Build query
    const query: OpinionQuery = {};
    
    // Add visibility filter if not including hidden
    if (!includeHidden) {
      query.isVisible = true;
    } else if (isVisible !== null) {
      // If specifically filtering by visibility
      if (isVisible === 'true') {
        query.isVisible = true;
      } else if (isVisible === 'false') {
        query.isVisible = false;
      }
    }
    
    // Add search filter if provided
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Execute query with pagination
    const opinions = await Opinion.find(query)
      .sort({ timestamp: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit)
      .select('-__v');
    
    // Get total count for pagination
    const total = await Opinion.countDocuments(query);
    
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
    console.error('Error fetching opinions for admin:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opinions' },
      { status: 500 }
    );
  }
}

// POST endpoint for admin actions (bulk operations)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    // Validate required fields
    const { action, opinionIds } = body;
    
    if (!action || !opinionIds || !Array.isArray(opinionIds)) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }
    
    let result;
    
    // Handle different admin actions
    switch (action) {
      case 'bulkHide':
        result = await Opinion.updateMany(
          { _id: { $in: opinionIds } },
          { isVisible: false }
        );
        break;
        
      case 'bulkShow':
        result = await Opinion.updateMany(
          { _id: { $in: opinionIds } },
          { isVisible: true }
        );
        break;
        
      case 'bulkDelete':
        result = await Opinion.deleteMany(
          { _id: { $in: opinionIds } }
        );
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    // Handle different result types based on the action
    let affectedCount = 0;
    if (action === 'bulkDelete') {
      affectedCount = 'deletedCount' in result ? result.deletedCount : 0;
    } else {
      affectedCount = 'modifiedCount' in result ? result.modifiedCount : 0;
    }
    
    return NextResponse.json({
      success: true,
      message: `${action} operation completed successfully`,
      affected: affectedCount
    });
  } catch (error) {
    console.error('Error performing admin action:', error);
    return NextResponse.json(
      { error: 'Failed to perform admin action' },
      { status: 500 }
    );
  }
}