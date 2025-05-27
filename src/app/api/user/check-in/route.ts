import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import CheckIn from '@/models/CheckIn';

// Helper function to check if two dates are the same day
const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Helper function to check if a date is the day after another date
const isConsecutiveDay = (prevDate: Date, currentDate: Date) => {
  // Clone the previous date and add one day
  const nextDay = new Date(prevDate);
  nextDay.setDate(nextDay.getDate() + 1);
  
  return isSameDay(nextDay, currentDate);
};

// Helper function to calculate points based on streak
const calculatePoints = (streak: number) => {
  // Base points for check-in
  const basePoints = 100;
  
  // Bonus points for streaks
  let bonusPoints = 0;
  if (streak >= 30) bonusPoints = 50;      // Monthly milestone
  else if (streak >= 7) bonusPoints = 20;  // Weekly milestone
  else if (streak >= 3) bonusPoints = 5;   // Mini streak
  
  return basePoints + bonusPoints;
};

// GET endpoint to fetch check-in data for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get wallet address from query params
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    // Find the user
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get check-in history (most recent first)
    const history = await CheckIn.find({ walletAddress: walletAddress.toLowerCase() })
      .sort({ date: -1 })
      .limit(30) // Limit to last 30 check-ins
      .lean();
    
    // Check if user can check in today
    const now = new Date();
    const canCheckIn = !user.lastCheckIn || !isSameDay(new Date(user.lastCheckIn), now);
    
    // Format the stats
    const stats = {
      lastCheckIn: user.lastCheckIn,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      totalCheckIns: user.totalCheckIns || 0,
      totalPointsEarned: user.checkInPointsEarned || 0,
      canCheckIn
    };
    
    return NextResponse.json({
      success: true,
      stats,
      history: history.map(entry => ({
        date: entry.date,
        points: entry.points,
        streak: entry.streak
      }))
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching check-in data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch check-in data' },
      { status: 500 }
    );
  }
}

// POST endpoint to perform a check-in
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { walletAddress } = await request.json();
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    // Find the user
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const now = new Date();
    
    // Check if user already checked in today
    if (user.lastCheckIn && isSameDay(new Date(user.lastCheckIn), now)) {
      return NextResponse.json(
        { error: 'You have already checked in today', alreadyCheckedIn: true },
        { status: 400 }
      );
    }
    
    // Calculate streak
    let newStreak = 1; // Default to 1 for first check-in or broken streak
    
    if (user.lastCheckIn) {
      const lastCheckInDate = new Date(user.lastCheckIn);
      
      // If yesterday, increment streak
      if (isConsecutiveDay(lastCheckInDate, now)) {
        newStreak = (user.currentStreak || 0) + 1;
      }
      // Otherwise, streak resets to 1
    }
    
    // Calculate points based on streak
    const pointsEarned = calculatePoints(newStreak);
    
    // Update longest streak if needed
    const longestStreak = Math.max(newStreak, user.longestStreak || 0);
    
    // Create check-in record
    const checkIn = new CheckIn({
      user: user._id,
      walletAddress: walletAddress.toLowerCase(),
      date: now,
      points: pointsEarned,
      streak: newStreak
    });
    
    await checkIn.save();
    
    // Update user data
    user.lastCheckIn = now;
    user.currentStreak = newStreak;
    user.longestStreak = longestStreak;
    user.totalCheckIns = (user.totalCheckIns || 0) + 1;
    user.checkInPointsEarned = (user.checkInPointsEarned || 0) + pointsEarned;
    user.points = (user.points || 0) + pointsEarned; // Add to total points
    
    await user.save();
    
    // Get updated check-in history
    const history = await CheckIn.find({ walletAddress: walletAddress.toLowerCase() })
      .sort({ date: -1 })
      .limit(30)
      .lean();
    
    // Format the stats
    const stats = {
      lastCheckIn: user.lastCheckIn,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      totalCheckIns: user.totalCheckIns,
      totalPointsEarned: user.checkInPointsEarned,
      canCheckIn: false // Just checked in, so can't check in again today
    };
    
    return NextResponse.json({
      success: true,
      message: 'Check-in successful',
      pointsEarned,
      stats,
      history: history.map(entry => ({
        date: entry.date,
        points: entry.points,
        streak: entry.streak
      }))
    }, { status: 200 });
  } catch (error) {
    console.error('Error performing check-in:', error);
    return NextResponse.json(
      { error: 'Failed to perform check-in' },
      { status: 500 }
    );
  }
}