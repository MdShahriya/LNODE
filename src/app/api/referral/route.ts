import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

// GET /api/referral - Get referral stats and history for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get walletAddress from query params
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }
    
    // Find the user
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get referral stats
    const referredUsers = await User.find({ referredBy: user._id });
    const activeReferrals = referredUsers.filter(u => u.isActive !== false).length;
    const totalPointsEarned = referredUsers.reduce((total, u) => total + (u.referralPointsEarned || 0), 0);
    
    // Generate referral code if not exists
    if (!user.referralCode) {
      user.referralCode = `TOPAY${user._id.toString().slice(-6).toUpperCase()}`;
      await user.save();
    }

    // Generate referral link with the new format: domain.com/dashboard/referer-address
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const referralLink = `${baseUrl}/ref/${user.walletAddress}`;

    const stats = {
      totalReferrals: referredUsers.length,
      activeReferrals,
      pointsEarned: totalPointsEarned,
      referralCode: user.referralCode,
      referralLink: referralLink
    };
    
    // Get referral history
    const history = referredUsers.map(referredUser => ({
      address: `${referredUser.walletAddress.slice(0, 6)}...${referredUser.walletAddress.slice(-4)}`,
      date: referredUser.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      status: referredUser.isActive !== false ? 'active' : 'pending',
      pointsEarned: referredUser.referralPointsEarned || 0
    }));
    
    return NextResponse.json({ stats, history });
  } catch (error) {
    console.error('Error fetching referral data:', error);
    return NextResponse.json({ error: 'Failed to fetch referral data' }, { status: 500 });
  }
}

// POST /api/referral - Apply referral code
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { walletAddress, referralCode } = await request.json();
    
    if (!walletAddress || !referralCode) {
      return NextResponse.json({ error: 'Wallet address and referral code are required' }, { status: 400 });
    }
    
    // Find the user applying the referral code
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if user already has a referrer
    if (user.referredBy) {
      return NextResponse.json({ error: 'User already has a referrer' }, { status: 400 });
    }
    
    // Find the referrer by referral code
    const referrer = await User.findOne({ referralCode });
    
    if (!referrer) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
    }
    
    // Can't refer yourself
    if (referrer._id.toString() === user._id.toString()) {
      return NextResponse.json({ error: 'Cannot use your own referral code' }, { status: 400 });
    }
    
    // Apply referral
    user.referredBy = referrer._id;
    await user.save();
    
    // Award points to referrer (optional)
    const referralBonus = 100; // 100 points for successful referral
    referrer.points = (referrer.points || 0) + referralBonus;
    await referrer.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Referral code applied successfully',
      pointsAwarded: referralBonus
    });
  } catch (error) {
    console.error('Error applying referral code:', error);
    return NextResponse.json({ error: 'Failed to apply referral code' }, { status: 500 });
  }
}