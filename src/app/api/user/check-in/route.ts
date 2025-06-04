import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import CheckIn from '@/models/CheckIn';
import PointsHistory from '@/models/PointsHistory';


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

// Helper function to calculate points and rewards based on streak
const calculateRewards = (streak: number, previousStreak: number, maxStreak: number) => {
  // Points based on streak day (matching the frontend display)
  let totalPoints = 0;
  
  // Match the exact points shown in the UI based on streak day
  if (streak === 1) totalPoints = 250;
  else if (streak === 2) totalPoints = 500;
  else if (streak === 3) totalPoints = 750;
  else if (streak === 4) totalPoints = 1000;
  else if (streak === 5) totalPoints = 1250;
  else if (streak === 6) totalPoints = 1500;
  else if (streak === 7) totalPoints = 1750;
  else if (streak > 7) {
    // For streaks beyond 7 days, restart the cycle
    const dayInCycle = streak % 7 || 7; // If streak % 7 is 0, use 7
    if (dayInCycle === 1) totalPoints = 250;
    else if (dayInCycle === 2) totalPoints = 500;
    else if (dayInCycle === 3) totalPoints = 750;
    else if (dayInCycle === 4) totalPoints = 1000;
    else if (dayInCycle === 5) totalPoints = 1250;
    else if (dayInCycle === 6) totalPoints = 1500;
    else if (dayInCycle === 7) totalPoints = 1750;
  }
  
  // Determine reward tier and special rewards
  let rewardTier = 'bronze';
  let specialReward = null;
  const multiplier = 1;
  
  if (streak >= 365) {
    rewardTier = 'legendary';
    specialReward = 'yearly_champion';
  } else if (streak >= 100) {
    rewardTier = 'diamond';
    specialReward = 'centurion';
  } else if (streak >= 30) {
    rewardTier = 'gold';
    specialReward = 'monthly_warrior';
  } else if (streak >= 7) {
    rewardTier = 'silver';
    specialReward = 'weekly_champion';
  } else if (streak >= 3) {
    rewardTier = 'bronze';
  }
  
  // Special milestone rewards
  if (streak > maxStreak) {
    specialReward = specialReward ? `${specialReward}_personal_best` : 'personal_best';
  }
  
  // For accounting purposes, consider base points as 100
  const basePoints = 100;
  const bonusPoints = totalPoints - basePoints;
  
  return {
    basePoints,
    bonusPoints,
    totalPoints,
    multiplier,
    rewardTier,
    specialReward
  };
};

// Helper function to determine check-in type
const getCheckInType = (streak: number, isConsecutive: boolean) => {
  if (!isConsecutive) return 'streak_break';
  if (streak === 1) return 'first_time';
  if (streak % 365 === 0) return 'yearly';
  if (streak % 100 === 0) return 'centennial';
  if (streak % 30 === 0) return 'monthly';
  if (streak % 7 === 0) return 'weekly';
  return 'daily';
};

// Helper function to get device info from request
const getDeviceInfo = (request: NextRequest) => {
  const userAgent = request.headers.get('user-agent') || '';
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');
  const ipAddress = xForwardedFor?.split(',')[0] || xRealIp || 'unknown';
  
  return {
    userAgent,
    ipAddress,
    platform: userAgent.includes('Mobile') ? 'mobile' : 'desktop',
    browser: userAgent.includes('Chrome') ? 'chrome' : 
             userAgent.includes('Firefox') ? 'firefox' : 
             userAgent.includes('Safari') ? 'safari' : 'unknown'
  };
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
    
    // Get enhanced check-in history with aggregation
    const historyAggregation = await CheckIn.aggregate([
      {
        $match: { walletAddress: walletAddress.toLowerCase() }
      },
      {
        $sort: { date: -1 }
      },
      {
        $limit: 30
      },
      {
        $project: {
          date: 1,
          points: 1,
          basePoints: 1,
          bonusPoints: 1,
          streak: 1,
          previousStreak: 1,
          checkInType: 1,
          isConsecutive: 1,
          multiplier: 1,
          rewardTier: 1,
          specialReward: 1,
          deviceInfo: 1,
          isValid: 1
        }
      }
    ]);
    
    // Get check-in statistics
    const [checkInStats] = await CheckIn.aggregate([
      {
        $match: { walletAddress: walletAddress.toLowerCase() }
      },
      {
        $group: {
          _id: null,
          totalCheckIns: { $sum: 1 },
          totalPoints: { $sum: '$points' },
          totalBasePoints: { $sum: '$basePoints' },
          totalBonusPoints: { $sum: '$bonusPoints' },
          avgMultiplier: { $avg: '$multiplier' },
          maxStreak: { $max: '$streak' },
          validCheckIns: { $sum: { $cond: [{ $eq: ['$isValid', true] }, 1, 0] } },
          checkInTypes: { $addToSet: '$checkInType' },
          rewardTiers: { $addToSet: '$rewardTier' },
          specialRewards: { $addToSet: '$specialReward' },
          deviceTypes: { $addToSet: '$deviceInfo.platform' },
          browsers: { $addToSet: '$deviceInfo.browser' }
        }
      }
    ]);
    
    // Check if user can check in today
    const now = new Date();
    const canCheckIn = !user.lastCheckIn || !isSameDay(new Date(user.lastCheckIn), now);
    
    // Calculate missed days in current period
    let missedDays = 0;
    if (user.lastCheckIn) {
      const daysSinceLastCheckIn = Math.floor((now.getTime() - new Date(user.lastCheckIn).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastCheckIn > 1) {
        missedDays = daysSinceLastCheckIn - 1;
      }
    }
    
    // Format the enhanced stats
    const stats = {
      lastCheckIn: user.lastCheckIn,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      maxStreak: user.maxStreak || 0,
      totalCheckIns: checkInStats?.totalCheckIns || 0,
      totalPointsEarned: checkInStats?.totalPoints || 0,
      totalBasePoints: checkInStats?.totalBasePoints || 0,
      totalBonusPoints: checkInStats?.totalBonusPoints || 0,
      avgMultiplier: checkInStats?.avgMultiplier || 1,
      validCheckIns: checkInStats?.validCheckIns || 0,
      missedDays,
      canCheckIn,
      nextRewardAt: {
        daily: 1,
        weekly: 7 - ((user.currentStreak || 0) % 7),
        monthly: 30 - ((user.currentStreak || 0) % 30),
        centennial: 100 - ((user.currentStreak || 0) % 100)
      },
      achievements: {
        checkInTypes: checkInStats?.checkInTypes?.filter((t: string) => t) || [],
        rewardTiers: checkInStats?.rewardTiers?.filter((t: string) => t) || [],
        specialRewards: checkInStats?.specialRewards?.filter((r: string) => r) || [],
        deviceTypes: checkInStats?.deviceTypes?.filter((d: string) => d) || [],
        browsers: checkInStats?.browsers?.filter((b: string) => b) || []
      }
    };
    
    return NextResponse.json({
      success: true,
      stats,
      history: historyAggregation
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
    
    // Get device and location info
    const deviceInfo = getDeviceInfo(request);
    
    // Calculate streak and missed days
    let newStreak = 1;
    let isConsecutive = true;
    let missedDays = 0;
    const previousStreak = user.currentStreak || 0;
    
    if (user.lastCheckIn) {
      const lastCheckInDate = new Date(user.lastCheckIn);
      const daysSinceLastCheckIn = Math.floor((now.getTime() - lastCheckInDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (isConsecutiveDay(lastCheckInDate, now)) {
        // Consecutive day
        newStreak = previousStreak + 1;
        isConsecutive = true;
      } else if (daysSinceLastCheckIn > 1) {
        // Missed days, streak breaks
        newStreak = 1;
        isConsecutive = false;
        missedDays = daysSinceLastCheckIn - 1;
      } else {
        // Same day or other edge case
        newStreak = 1;
        isConsecutive = false;
      }
    }
    
    // Calculate rewards based on streak
    const rewards = calculateRewards(newStreak, previousStreak, user.maxStreak || 0);
    const checkInType = getCheckInType(newStreak, isConsecutive);
    
    // Update streaks
    const longestStreak = Math.max(newStreak, user.longestStreak || 0);
    const maxStreak = Math.max(newStreak, user.maxStreak || 0);
    
    // Create enhanced check-in record
    const checkIn = new CheckIn({
      user: user._id,
      walletAddress: walletAddress.toLowerCase(),
      date: now,
      points: rewards.totalPoints,
      basePoints: rewards.basePoints,
      bonusPoints: rewards.bonusPoints,
      streak: newStreak,
      previousStreak,
      maxStreak,
      checkInType,
      isConsecutive,
      missedDays,
      multiplier: rewards.multiplier,
      rewardTier: rewards.rewardTier,
      specialReward: rewards.specialReward,
      deviceInfo: {
        platform: deviceInfo.platform,
        browser: deviceInfo.browser,
        userAgent: deviceInfo.userAgent
      },
      ipAddress: deviceInfo.ipAddress,
      isValid: true,
      validationReason: 'automatic_validation',
      metadata: {
        checkInVersion: '2.0',
        rewardsCalculated: true,
        deviceFingerprint: `${deviceInfo.platform}_${deviceInfo.browser}`,
        timezoneOffset: now.getTimezoneOffset()
      }
    });
    
    await checkIn.save();
    
    // Create points history record
    const pointsHistory = new PointsHistory({
      user: user._id,
      walletAddress: walletAddress.toLowerCase(),
      points: rewards.totalPoints,
      basePoints: rewards.basePoints,
      source: 'checkin',
      subSource: checkInType,
      description: `Daily check-in (${newStreak} day streak)`,
      timestamp: now,
      transactionType: 'credit',
      balanceBefore: user.points || 0,
      balanceAfter: (user.points || 0) + rewards.totalPoints,
      multiplier: rewards.multiplier,
      isVerified: true,
      verifiedBy: 'system',
      verificationDate: now,
      metadata: {
        checkInId: checkIn._id,
        streak: newStreak,
        rewardTier: rewards.rewardTier,
        specialReward: rewards.specialReward,
        isConsecutive,
        missedDays
      },
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent
    });
    
    await pointsHistory.save();
    
    // Update user data with enhanced fields
    user.lastCheckIn = now;
    user.currentStreak = newStreak;
    user.longestStreak = longestStreak;
    user.maxStreak = maxStreak;
    user.totalCheckIns = (user.totalCheckIns || 0) + 1;
    user.checkInPointsEarned = (user.checkInPointsEarned || 0) + rewards.totalPoints;
    user.points = (user.points || 0) + rewards.totalPoints;
    user.lastActiveTime = now;
    user.loginCount = (user.loginCount || 0) + 1;
    
    // Update total earnings
    if (!user.totalEarnings) {
      user.totalEarnings = { daily: 0, weekly: 0, monthly: 0 };
    }
    user.totalEarnings.daily += rewards.totalPoints;
    user.totalEarnings.weekly += rewards.totalPoints;
    user.totalEarnings.monthly += rewards.totalPoints;
    
    await user.save();
    
    // Get updated check-in history
    const history = await CheckIn.find({ walletAddress: walletAddress.toLowerCase() })
      .sort({ date: -1 })
      .limit(10)
      .lean();
    
    // Format the enhanced stats
    const stats = {
      lastCheckIn: user.lastCheckIn,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      maxStreak: user.maxStreak,
      totalCheckIns: user.totalCheckIns,
      totalPointsEarned: user.checkInPointsEarned,
      canCheckIn: false, // Just checked in, so can't check in again today
      nextRewardAt: {
        daily: 1,
        weekly: 7 - (newStreak % 7),
        monthly: 30 - (newStreak % 30),
        centennial: 100 - (newStreak % 100)
      }
    };
    
    return NextResponse.json({
      success: true,
      message: 'Check-in successful!',
      checkIn: {
        points: rewards.totalPoints,
        basePoints: rewards.basePoints,
        bonusPoints: rewards.bonusPoints,
        multiplier: rewards.multiplier,
        streak: newStreak,
        rewardTier: rewards.rewardTier,
        specialReward: rewards.specialReward,
        checkInType,
        isConsecutive,
        missedDays
      },
      stats,
      history: history.map(entry => ({
        date: entry.date,
        points: entry.points,
        basePoints: entry.basePoints,
        bonusPoints: entry.bonusPoints,
        streak: entry.streak,
        checkInType: entry.checkInType,
        rewardTier: entry.rewardTier,
        specialReward: entry.specialReward,
        multiplier: entry.multiplier,
        isConsecutive: entry.isConsecutive
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