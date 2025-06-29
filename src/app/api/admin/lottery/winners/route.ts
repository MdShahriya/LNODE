import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/db'
import LotteryWinner, { ILotteryWinner } from '@/models/LotteryWinner'

// Helper function to check if user is admin
async function isAdmin(_request: NextRequest) {
  // In a real application, you would check the session/token
  // For now, we'll assume the request is coming from an admin
  // This should be replaced with proper authentication
  return true
}

// GET - Fetch all lottery winners with pagination
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    if (!await isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Connect to the database
    await connectToDatabase()
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')
    const page = parseInt(searchParams.get('page') || '1')
    const skip = (page - 1) * limit
    
    // Fetch winners from the database
    const winners = await LotteryWinner.find({})
      .sort({ date: -1 }) // Sort by date descending (newest first)
      .skip(skip)
      .limit(limit)
      .lean() as unknown as ILotteryWinner[]
    
    // Transform the data for the frontend
    const transformedWinners = winners.map(winner => ({
      id: winner._id ? winner._id.toString() : '',
      date: winner.date ? winner.date.toISOString() : new Date().toISOString(),
      walletAddress: winner.walletAddress || '',
      username: winner.username || null
    }))
    
    // Get total count for pagination
    const totalWinners = await LotteryWinner.countDocuments({})
    
    return NextResponse.json({ 
      winners: transformedWinners,
      pagination: {
        total: totalWinners,
        page,
        limit,
        pages: Math.ceil(totalWinners / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching lottery winners:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lottery winners' },
      { status: 500 }
    )
  }
}

// POST - Create a new lottery winner
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    if (!await isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Connect to the database
    await connectToDatabase()
    
    // Get request body
    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['date', 'walletAddress']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }
    
    // Create new lottery winner
    const newWinner = new LotteryWinner({
      date: new Date(body.date),
      walletAddress: body.walletAddress,
      username: body.username,
      prize: Number(body.prize) || 40
    })
    
    await newWinner.save()
    
    return NextResponse.json(
      { message: 'Lottery winner created successfully', winner: newWinner },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating lottery winner:', error)
    return NextResponse.json(
      { error: 'Failed to create lottery winner' },
      { status: 500 }
    )
  }
}