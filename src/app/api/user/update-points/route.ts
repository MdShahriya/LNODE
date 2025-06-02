import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import PointsHistory from '@/models/PointsHistory';


export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { 
      walletAddress, 
      pointsToAdd, 
      source = 'manual_update',
      subSource,
      description,
      sessionId,
      taskId,
      achievementId,
      referralId,
      multiplier = 1,
      transactionType = 'credit',
      metadata = {},
      adminId,
      reason
    } = await request.json();
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!pointsToAdd || (transactionType === 'credit' && pointsToAdd <= 0) || (transactionType === 'debit' && pointsToAdd >= 0)) {
      return NextResponse.json(
        { error: 'Valid points amount is required' },
        { status: 400 }
      );
    }

    // Get device and IP info
    const userAgent = request.headers.get('user-agent') || '';
    const xForwardedFor = request.headers.get('x-forwarded-for');
    const xRealIp = request.headers.get('x-real-ip');
    const ipAddress = xForwardedFor?.split(',')[0] || xRealIp || 'unknown';

    // Find the user
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const currentBalance = user.points || 0;
    const basePoints = Math.abs(pointsToAdd);
    const bonusPoints = Math.abs(pointsToAdd) * (multiplier - 1);
    const totalPoints = transactionType === 'credit' ? 
      Math.floor(basePoints * multiplier) : 
      -Math.floor(basePoints * multiplier);
    
    // Check if user has enough points for debit transactions
    if (transactionType === 'debit' && currentBalance < Math.abs(totalPoints)) {
      return NextResponse.json(
        { error: 'Insufficient points balance' },
        { status: 400 }
      );
    }
    
    const newBalance = currentBalance + totalPoints;
    const now = new Date();
    
    // Create points history record
    const pointsHistory = new PointsHistory({
      user: user._id,
      walletAddress: walletAddress.toLowerCase(),
      points: totalPoints,
      basePoints: transactionType === 'credit' ? basePoints : -basePoints,
      source,
      subSource,
      description: description || `${transactionType === 'credit' ? 'Added' : 'Deducted'} ${Math.abs(totalPoints)} points ${reason ? `- ${reason}` : ''}`,
      timestamp: now,
      sessionId,
      taskId,
      achievementId,
      referralId,
      multiplier,
      transactionType,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      isVerified: true,
      verifiedBy: adminId || 'system',
      verificationDate: now,
      metadata: {
        ...metadata,
        updateReason: reason,
        adminId,
        apiVersion: '2.0',
        updateMethod: 'manual_api'
      },
      ipAddress,
      userAgent
    });
    
    await pointsHistory.save();
    
    // Update user points and related fields
    user.points = newBalance;
    user.lastActiveTime = now;
    
    // Update total earnings if it's a credit transaction
    if (transactionType === 'credit') {
      if (!user.totalEarnings) {
        user.totalEarnings = { daily: 0, weekly: 0, monthly: 0 };
      }
      user.totalEarnings.daily += totalPoints;
      user.totalEarnings.weekly += totalPoints;
      user.totalEarnings.monthly += totalPoints;
    }
    
    await user.save();
    
    // Get recent points history for context
    const recentHistory = await PointsHistory.find({
      walletAddress: walletAddress.toLowerCase()
    })
    .sort({ timestamp: -1 })
    .limit(5)
    .lean();
    
    return NextResponse.json({ 
      success: true, 
      message: `Points ${transactionType === 'credit' ? 'added' : 'deducted'} successfully`,
      transaction: {
        id: pointsHistory._id,
        points: totalPoints,
        basePoints: transactionType === 'credit' ? basePoints : -basePoints,
        bonusPoints: transactionType === 'credit' ? bonusPoints : -bonusPoints,
        multiplier,
        transactionType,
        source,
        subSource,
        description: pointsHistory.description,
        timestamp: now,
        balanceBefore: currentBalance,
        balanceAfter: newBalance
      },
      user: {
        walletAddress: user.walletAddress,
        points: user.points,
        totalEarnings: user.totalEarnings,
        lastActiveTime: user.lastActiveTime
      },
      recentHistory: recentHistory.map(h => ({
        id: h._id,
        points: h.points,
        source: h.source,
        description: h.description,
        timestamp: h.timestamp,
        transactionType: h.transactionType
      }))
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating points:', error);
    return NextResponse.json(
      { error: 'Failed to update points' },
      { status: 500 }
    );
  }
}