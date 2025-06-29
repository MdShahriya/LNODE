import { NextResponse } from 'next/server'
import connectToDatabase from '@/lib/db'
import LotteryWinner, { ILotteryWinner } from '@/models/LotteryWinner'
import { Document } from 'mongoose'

export async function GET(request: Request) {
  try {
    // Connect to the database
    await connectToDatabase()
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const page = parseInt(searchParams.get('page') || '1')
    const skip = (page - 1) * limit
    
    // Get today's date range (start and end of today)
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    
    // Fetch winners from the database for today only
    const winners = await LotteryWinner.find({
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    })
      .sort({ date: -1 }) // Sort by date descending (newest first)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec() as unknown as (Omit<ILotteryWinner, keyof Document> & { _id: string })[]
    
    // No mock data seeding - use real data only
    
    // Transform the data for the frontend
    const transformedWinners = winners.map(winner => ({
      id: winner._id || '',
      date: winner.date ? winner.date.toISOString() : new Date().toISOString(),
      walletAddress: winner.walletAddress || '',
      username: winner.username || null,
      prize: winner.prize || 40
    }))
    
    // Get total count for pagination (today's winners only)
    const totalWinners = await LotteryWinner.countDocuments({
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    })
    
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