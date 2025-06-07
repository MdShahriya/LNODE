import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import PointsHistory from '@/models/PointsHistory';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { 
      walletAddress, 
      username, 
      email, 
      preferences = {}
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
        points: 0,
        credits: 0, // Initialize opinion credits
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
        verification: 'unverified',
        lastLoginTime: now,
        loginCount: 1,
        currentStreak: 0,
        longestStreak: 0,
        maxStreak: 0,
        totalCheckIns: 0,
        checkInPointsEarned: 0
      });

      // Create initial points history record for user creation
      await PointsHistory.create({
        user: user._id,
        walletAddress: walletAddress.toLowerCase(),
        points: 0,
        basePoints: 0,
        source: 'other',
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
          userAgent
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
          points: user.points,
          credits: user.credits, // Include credits in response
          totalEarnings: user.totalEarnings,
          currentStreak: user.currentStreak,
          totalSessions: user.totalSessions,
          lastActiveTime: user.lastActiveTime,
          verification: user.verification,
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
        points: user.points,
        credits: user.credits, // Include credits in response
        totalEarnings: user.totalEarnings,
        currentStreak: user.currentStreak,
        totalSessions: user.totalSessions,
        activeSessions: user.activeSessions,
        lastActiveTime: user.lastActiveTime,
        verification: user.verification,
        lastLoginTime: user.lastLoginTime,
        loginCount: user.loginCount,
        longestStreak: user.longestStreak,
        maxStreak: user.maxStreak,
        totalCheckIns: user.totalCheckIns,
        checkInPointsEarned: user.checkInPointsEarned,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
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
      // Add real stats aggregation here when needed
      // For now, just return basic stats from user object
      additionalData.stats = {
        points: {
          current: user.points || 0,
        },
        credits: {
          current: user.credits || 0,
        },
        account: {
          createdAt: user.createdAt,
          lastActiveTime: user.lastActiveTime,
          loginCount: user.loginCount || 0,
          totalEarnings: user.totalEarnings || { daily: 0, weekly: 0, monthly: 0 }
        }
      };
    }

    if (includeHistory) {
      // Add real history fetching here when needed
      // For now, just return empty arrays
      additionalData.recentActivity = {
        points: [],
        sessions: [],
        checkIns: []
      };
    }
    
    return NextResponse.json({ 
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        username: user.username,
        email: user.email,
        points: user.points,
        credits: user.credits,
        tasksCompleted: user.tasksCompleted,
        uptime: user.uptime,
        nodeStatus: user.nodeStatus,
        totalSessions: user.totalSessions,
        activeSessions: user.activeSessions,
        lastActiveTime: user.lastActiveTime,
        verification: user.verification,
        lastLoginTime: user.lastLoginTime,
        loginCount: user.loginCount,
        longestStreak: user.longestStreak,
        maxStreak: user.maxStreak,
        currentStreak: user.currentStreak,
        totalCheckIns: user.totalCheckIns,
        checkInPointsEarned: user.checkInPointsEarned,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        totalEarnings: user.totalEarnings
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