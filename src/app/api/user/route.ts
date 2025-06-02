import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import PointsHistory from '@/models/PointsHistory';
import UserHistory from '@/models/UserHistory';
import CheckIn from '@/models/CheckIn';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { 
      walletAddress, 
      username, 
      email, 
      profilePicture,
      preferences = {},
      referralCode
    } = await request.json();
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Get device and IP info
    const userAgent = request.headers.get('user-agent') || '';
    const xForwardedFor = request.headers.get('x-forwarded-for');
    const xRealIp = request.headers.get('x-real-ip');
    const ipAddress = xForwardedFor?.split(',')[0] || xRealIp || 'unknown';
    const now = new Date();

    // Check if user already exists
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    // If user doesn't exist, create a new one
    if (!user) {
      // Check if username is already taken (if provided)
      if (username) {
        const existingUsername = await User.findOne({ username: username.toLowerCase() });
        if (existingUsername) {
          return NextResponse.json(
            { error: 'Username already taken' },
            { status: 400 }
          );
        }
      }

      // Check if email is already taken (if provided)
      if (email) {
        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
          return NextResponse.json(
            { error: 'Email already registered' },
            { status: 400 }
          );
        }
      }

      user = await User.create({
        walletAddress: walletAddress.toLowerCase(),
        username: username?.toLowerCase(),
        email: email?.toLowerCase(),
        profilePicture,
        points: 0,
        tasksCompleted: 0,
        uptime: 0,
        nodeStatus: false,
        totalSessions: 0,
        activeSessions: 0,
        lastActiveTime: now,
        deviceCount: 1,
        totalEarnings: {
          daily: 0,
          weekly: 0,
          monthly: 0
        },
        averageSessionDuration: 0,
        longestSession: 0,
        totalConnectionTime: 0,
        preferences: {
          notifications: true,
          theme: 'dark',
          language: 'en',
          ...preferences
        },
        isVerified: false,
        verificationLevel: 0,
        lastLoginTime: now,
        loginCount: 1,
        currentStreak: 0,
        longestStreak: 0,
        maxStreak: 0,
        totalCheckIns: 0,
        checkInPointsEarned: 0,
        referralCode: referralCode || null
      });

      // Create initial points history record for user creation
      await PointsHistory.create({
        user: user._id,
        walletAddress: walletAddress.toLowerCase(),
        points: 0,
        basePoints: 0,
        source: 'user_registration',
        subSource: 'account_creation',
        description: 'User account created',
        timestamp: now,
        transactionType: 'credit',
        balanceBefore: 0,
        balanceAfter: 0,
        multiplier: 1,
        isVerified: true,
        verifiedBy: 'system',
        verificationDate: now,
        metadata: {
          registrationMethod: 'api',
          initialUser: true,
          userAgent,
          referralCode
        },
        ipAddress,
        userAgent
      });

      return NextResponse.json({ 
        user: {
          id: user._id,
          walletAddress: user.walletAddress,
          username: user.username,
          email: user.email,
          profilePicture: user.profilePicture,
          points: user.points,
          totalEarnings: user.totalEarnings,
          currentStreak: user.currentStreak,
          totalSessions: user.totalSessions,
          lastActiveTime: user.lastActiveTime,
          isVerified: user.isVerified,
          verificationLevel: user.verificationLevel,
          preferences: user.preferences
        }, 
        created: true 
      }, { status: 201 });
    }
    
    // Update existing user's login info
    user.lastLoginTime = now;
    user.loginCount = (user.loginCount || 0) + 1;
    user.lastActiveTime = now;
    
    // Update optional fields if provided
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ 
        username: username.toLowerCase(),
        _id: { $ne: user._id }
      });
      if (existingUsername) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 400 }
        );
      }
      user.username = username.toLowerCase();
    }
    
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: user._id }
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 400 }
        );
      }
      user.email = email.toLowerCase();
    }
    
    if (profilePicture) {
      user.profilePicture = profilePicture;
    }
    
    if (Object.keys(preferences).length > 0) {
      user.preferences = { ...user.preferences, ...preferences };
    }
    
    await user.save();
    
    // Return existing user with updated info
    return NextResponse.json({ 
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        points: user.points,
        totalEarnings: user.totalEarnings,
        currentStreak: user.currentStreak,
        totalSessions: user.totalSessions,
        lastActiveTime: user.lastActiveTime,
        isVerified: user.isVerified,
        verificationLevel: user.verificationLevel,
        preferences: user.preferences,
        loginCount: user.loginCount
      }, 
      created: false 
    }, { status: 200 });
  } catch (error) {
    console.error('Error creating/fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const includeStats = searchParams.get('includeStats') === 'true';
    const includeHistory = searchParams.get('includeHistory') === 'true';
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const additionalData: {
      stats?: unknown;
      recentActivity?: unknown;
    } = {};

    if (includeStats) {
      // Get comprehensive user statistics
      const [pointsStats] = await PointsHistory.aggregate([
        {
          $match: { walletAddress: walletAddress.toLowerCase() }
        },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalPointsEarned: { $sum: { $cond: [{ $gt: ['$points', 0] }, '$points', 0] } },
            totalPointsSpent: { $sum: { $cond: [{ $lt: ['$points', 0] }, { $abs: '$points' }, 0] } },
            avgPointsPerTransaction: { $avg: '$points' },
            maxSingleTransaction: { $max: '$points' },
            minSingleTransaction: { $min: '$points' },
            uniqueSources: { $addToSet: '$source' },
            verifiedTransactions: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } },
            lastTransaction: { $max: '$timestamp' }
          }
        }
      ]);

      const [sessionStats] = await UserHistory.aggregate([
        {
          $match: { walletAddress: walletAddress.toLowerCase() }
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            totalUptime: { $sum: '$uptime' },
            avgSessionDuration: { $avg: '$sessionDuration' },
            maxSessionDuration: { $max: '$sessionDuration' },
            totalPointsEarned: { $sum: '$pointsEarned' },
            uniqueDevices: { $addToSet: '$deviceIP' },
            uniqueBrowsers: { $addToSet: '$browser' },
            uniquePlatforms: { $addToSet: '$platform' },
            lastSession: { $max: '$timestamp' }
          }
        }
      ]);

      const [checkInStats] = await CheckIn.aggregate([
        {
          $match: { walletAddress: walletAddress.toLowerCase() }
        },
        {
          $group: {
            _id: null,
            totalCheckIns: { $sum: 1 },
            totalCheckInPoints: { $sum: '$points' },
            avgPointsPerCheckIn: { $avg: '$points' },
            maxStreak: { $max: '$streak' },
            lastCheckIn: { $max: '$date' },
            rewardTiers: { $addToSet: '$rewardTier' },
            specialRewards: { $addToSet: '$specialReward' }
          }
        }
      ]);

      additionalData.stats = {
        points: {
          current: user.points || 0,
          totalEarned: pointsStats?.totalPointsEarned || 0,
          totalSpent: pointsStats?.totalPointsSpent || 0,
          totalTransactions: pointsStats?.totalTransactions || 0,
          avgPerTransaction: pointsStats?.avgPointsPerTransaction || 0,
          maxSingleTransaction: pointsStats?.maxSingleTransaction || 0,
          uniqueSources: pointsStats?.uniqueSources?.length || 0,
          verificationRate: pointsStats?.totalTransactions > 0 ? 
            (pointsStats.verifiedTransactions / pointsStats.totalTransactions) * 100 : 0,
          lastTransaction: pointsStats?.lastTransaction
        },
        sessions: {
          total: sessionStats?.totalSessions || 0,
          totalUptime: sessionStats?.totalUptime || 0,
          avgDuration: sessionStats?.avgSessionDuration || 0,
          maxDuration: sessionStats?.maxSessionDuration || 0,
          pointsFromSessions: sessionStats?.totalPointsEarned || 0,
          uniqueDevices: sessionStats?.uniqueDevices?.length || 0,
          uniqueBrowsers: sessionStats?.uniqueBrowsers?.length || 0,
          uniquePlatforms: sessionStats?.uniquePlatforms?.length || 0,
          lastSession: sessionStats?.lastSession
        },
        checkIns: {
          total: checkInStats?.totalCheckIns || 0,
          totalPoints: checkInStats?.totalCheckInPoints || 0,
          avgPointsPerCheckIn: checkInStats?.avgPointsPerCheckIn || 0,
          maxStreak: checkInStats?.maxStreak || 0,
          currentStreak: user.currentStreak || 0,
          lastCheckIn: checkInStats?.lastCheckIn,
          rewardTiers: checkInStats?.rewardTiers?.filter((t: unknown) => t) || [],
          specialRewards: checkInStats?.specialRewards?.filter((r: unknown) => r) || []
        },
        account: {
          createdAt: user.createdAt,
          lastActiveTime: user.lastActiveTime,
          loginCount: user.loginCount || 0,
          isVerified: user.isVerified || false,
          verificationLevel: user.verificationLevel || 0,
          totalEarnings: user.totalEarnings || { daily: 0, weekly: 0, monthly: 0 }
        }
      };
    }

    if (includeHistory) {
      // Get recent activity history
      const recentPoints = await PointsHistory.find({
        walletAddress: walletAddress.toLowerCase()
      })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

      const recentSessions = await UserHistory.find({
        walletAddress: walletAddress.toLowerCase()
      })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();

      const recentCheckIns = await CheckIn.find({
        walletAddress: walletAddress.toLowerCase()
      })
      .sort({ date: -1 })
      .limit(5)
      .lean();

      additionalData.recentActivity = {
        points: recentPoints.map(p => ({
          id: p._id,
          points: p.points,
          source: p.source,
          description: p.description,
          timestamp: p.timestamp,
          transactionType: p.transactionType
        })),
        sessions: recentSessions.map(s => ({
          id: s._id,
          uptime: s.uptime,
          pointsEarned: s.pointsEarned,
          deviceInfo: s.deviceInfo,
          timestamp: s.timestamp
        })),
        checkIns: recentCheckIns.map(c => ({
          id: c._id,
          points: c.points,
          streak: c.streak,
          date: c.date,
          rewardTier: c.rewardTier
        }))
      };
    }
    
    return NextResponse.json({ 
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        points: user.points,
        tasksCompleted: user.tasksCompleted,
        uptime: user.uptime,
        nodeStatus: user.nodeStatus,
        totalSessions: user.totalSessions,
        activeSessions: user.activeSessions,
        lastActiveTime: user.lastActiveTime,
        deviceCount: user.deviceCount,
        totalEarnings: user.totalEarnings,
        averageSessionDuration: user.averageSessionDuration,
        longestSession: user.longestSession,
        totalConnectionTime: user.totalConnectionTime,
        preferences: user.preferences,
        isVerified: user.isVerified,
        verificationLevel: user.verificationLevel,
        lastLoginTime: user.lastLoginTime,
        loginCount: user.loginCount,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        maxStreak: user.maxStreak,
        totalCheckIns: user.totalCheckIns,
        checkInPointsEarned: user.checkInPointsEarned,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      ...additionalData
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}