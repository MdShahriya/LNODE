import { NextResponse } from 'next/server'
import connectToDatabase from '@/lib/db'
import LotteryWinner from '@/models/LotteryWinner'

export async function GET(request: Request) {
  try {
    // Connect to the database
    await connectToDatabase()
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const page = parseInt(searchParams.get('page') || '1')
    const skip = (page - 1) * limit
    
    // Get today's date range in UTC for consistency
    const today = new Date()
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1))
    
    // Use aggregation pipeline for better performance
    const pipeline = [
      {
        $match: {
          date: {
            $gte: startOfDay,
            $lt: endOfDay
          }
        }
      },
      { $sort: { date: -1 as -1, _id: 1 as const } }, // Use compound index
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          date: 1,
          walletAddress: 1,
          username: 1,
          prize: 1
        }
      }
    ]
    
    // Execute aggregation for winners
    const winners = await LotteryWinner.aggregate(pipeline)
    
    // No mock data seeding - use real data only
    
    // Transform the data for the frontend
    const transformedWinners = winners.map(winner => ({
      id: winner._id || '',
      date: winner.date ? winner.date.toISOString() : new Date().toISOString(),
      walletAddress: winner.walletAddress || '',
      username: winner.username || null,
      prize: winner.prize || 40
    }))
    
    // Get total count for pagination (today's winners only) using aggregation for consistency
    const countPipeline = [
      {
        $match: {
          date: {
            $gte: startOfDay,
            $lt: endOfDay
          }
        }
      },
      { $count: "total" }
    ]
    
    const countResult = await LotteryWinner.aggregate(countPipeline)
    const totalWinners = countResult.length > 0 ? countResult[0].total : 0
    
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