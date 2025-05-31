import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import UserHistory, { IUserHistory } from '@/models/UserHistory';
import { FilterQuery } from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const days = parseInt(searchParams.get('days') || '7', 10);
    const type = searchParams.get('type') || 'all';
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    // Build query
    const query: FilterQuery<IUserHistory> = {
      walletAddress: walletAddress.toLowerCase(),
      timestamp: { $gte: startDate, $lte: endDate }
    };
    
    // Filter by earning type if specified
    if (type !== 'all') {
      query.earningType = type;
    }
    
    // Get history records
    const historyRecords = await UserHistory.find(query)
      .sort({ timestamp: 1 })
      .lean();
    
    // Process data for chart display
    const dailyData = processHistoryForChart(historyRecords, startDate, endDate);
    
    return NextResponse.json({ 
      success: true,
      data: dailyData,
      rawHistory: historyRecords
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user history' },
      { status: 500 }
    );
  }
}

// Helper function to process history records into daily chart data
function processHistoryForChart(records: Partial<IUserHistory>[], startDate: Date, endDate: Date) {
  // Create an array of dates between start and end
  const dates: string[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Initialize result with zero values
  const result = dates.map(date => ({
    date,
    points: 0,
    uptime: 0,
  }));
  
  // Aggregate data by date
  records.forEach(record => {
    if (record.timestamp && record.earnings !== undefined && record.uptime !== undefined) {
      const recordDate = new Date(record.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const index = result.findIndex(item => item.date === recordDate);
      
      if (index !== -1) {
        result[index].points += record.earnings;
        result[index].uptime += record.uptime / 3600; // Convert seconds to hours
      }
    }
  });
  
  return result;
}