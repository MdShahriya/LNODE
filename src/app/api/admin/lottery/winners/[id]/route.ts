import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/db'
import LotteryWinner, { ILotteryWinner } from '@/models/LotteryWinner'
import mongoose, { Document } from 'mongoose'

// Helper function to check if user is admin
async function isAdmin(_request: NextRequest) {
  // In a real application, you would check the session/token
  // For now, we'll assume the request is coming from an admin
  // This should be replaced with proper authentication
  return true
}

// GET - Fetch a specific lottery winner by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check if user is admin
    if (!await isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Connect to the database
    await connectToDatabase()
    
    // Get winner ID from params
    const { id } = params
    
    // Find winner by ID
    const winner = await LotteryWinner.findById(id).lean() as (Omit<ILotteryWinner, keyof Document> & { _id: string }) | null
    
    if (!winner) {
      return NextResponse.json(
        { error: 'Lottery winner not found' },
        { status: 404 }
      )
    }
    
    // Transform the data for the frontend
    const transformedWinner = {
      id: winner._id || '',
      date: winner.date ? winner.date.toISOString() : new Date().toISOString(),
      walletAddress: winner.walletAddress || '',
      username: winner.username || null,
      prize: winner.prize || 40
    }
    
    return NextResponse.json({ winner: transformedWinner })
  } catch (error) {
    console.error('Error fetching lottery winner:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lottery winner' },
      { status: 500 }
    )
  }
}

// PUT - Update a lottery winner
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check if user is admin
    if (!await isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Connect to the database
    await connectToDatabase()
    
    // Get winner ID from params
    const { id } = params
    
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
    
    // Find and update winner
    const updatedWinner = await LotteryWinner.findByIdAndUpdate(
      id,
      {
        date: new Date(body.date),
        walletAddress: body.walletAddress,
        username: body.username,
        prize: Number(body.prize) || 40
      },
      { new: true, runValidators: true }
    ).lean() as (Omit<ILotteryWinner, keyof Document> & { _id: string }) | null
    
    if (!updatedWinner) {
      return NextResponse.json(
        { error: 'Lottery winner not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      message: 'Lottery winner updated successfully',
      winner: {
        id: updatedWinner._id || '',
        date: updatedWinner.date ? updatedWinner.date.toISOString() : new Date().toISOString(),
        walletAddress: updatedWinner.walletAddress || '',
        username: updatedWinner.username || null,
        prize: updatedWinner.prize || 40
      }
    })
  } catch (error) {
    console.error('Error updating lottery winner:', error)
    return NextResponse.json(
      { error: 'Failed to update lottery winner' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a lottery winner
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check if user is admin
    if (!await isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Connect to the database
    await connectToDatabase()
    
    // Get winner ID from params
    const { id } = params
    
    // Find and delete winner
    const deletedWinner = await LotteryWinner.findByIdAndDelete(id) as mongoose.Document<unknown, object, ILotteryWinner> | null
    
    if (!deletedWinner) {
      return NextResponse.json(
        { error: 'Lottery winner not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      message: 'Lottery winner deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting lottery winner:', error)
    return NextResponse.json(
      { error: 'Failed to delete lottery winner' },
      { status: 500 }
    )
  }
}