import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Airdrop, UserAirdrop } from '@/lib/models/Airdrop';
import User from '@/lib/models/User';

// GET: Fetch all airdrops or airdrops for a specific user
export async function GET(request: Request) {
  try {
    // Connect to the database
    await connectDB();
    
    // Get parameters from the URL
    const url = new URL(request.url);
    const walletAddress = url.searchParams.get('walletAddress');
    
    // If wallet address is provided, fetch airdrops for that user
    if (walletAddress) {
      // Validate wallet address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return NextResponse.json(
          { error: 'Invalid wallet address format' },
          { status: 400 }
        );
      }
      
      // Find the user by wallet address
      const user = await User.findOne({ walletAddress });
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      // Find all active airdrops
      const airdrops = await Airdrop.find({
        isActive: true,
        endDate: { $gte: new Date() }
      });
      
      // Find user's airdrop eligibility
      const userAirdrops = await UserAirdrop.find({ user: user._id }).populate('airdrop');
      
      // Create a map of airdrop ID to user airdrop status
      const userAirdropMap = new Map();
      userAirdrops.forEach(userAirdrop => {
        // Ensure we have an _id by using the populated airdrop document
        const airdropId = userAirdrop.airdrop._id?.toString() || userAirdrop.airdrop.toString();
        userAirdropMap.set(airdropId, {
          status: userAirdrop.status,
          eligibilityScore: userAirdrop.eligibilityScore,
          claimedAmount: userAirdrop.claimedAmount,
          claimedAt: userAirdrop.claimedAt,
          transactionHash: userAirdrop.transactionHash
        });
      });
      
      // Combine airdrop data with user eligibility status
      const airdropsWithStatus = airdrops.map(airdrop => {
        const airdropObj = airdrop.toObject();
        const userAirdropInfo = userAirdropMap.get(airdrop._id.toString()) || { status: 'ineligible', eligibilityScore: 0 };
        
        return {
          ...airdropObj,
          userStatus: userAirdropInfo
        };
      });
      
      return NextResponse.json(
        { airdrops: airdropsWithStatus },
        { status: 200 }
      );
    }
    
    // If no wallet address, just return all active airdrops
    const airdrops = await Airdrop.find({
      isActive: true,
      endDate: { $gte: new Date() }
    });
    
    return NextResponse.json(
      { airdrops },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching airdrops:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch airdrops' },
      { status: 500 }
    );
  }
}

// POST: Create a new airdrop (admin only in a real app)
export async function POST(request: Request) {
  try {
    // Connect to the database
    await connectDB();
    
    // Parse the request body
    const body = await request.json();
    const { name, description, totalAmount, tokenSymbol, startDate, endDate, requirements, isActive } = body;
    
    if (!name || !description || !totalAmount || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Name, description, totalAmount, startDate, and endDate are required' },
        { status: 400 }
      );
    }
    
    // Create new airdrop
    const newAirdrop = new Airdrop({
      name,
      description,
      totalAmount,
      tokenSymbol: tokenSymbol || 'TOPAY',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      requirements: requirements || '',
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date(),
    });
    
    await newAirdrop.save();
    
    return NextResponse.json(
      { message: 'Airdrop created successfully', airdrop: newAirdrop },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating airdrop:', error);
    
    return NextResponse.json(
      { error: 'Failed to create airdrop' },
      { status: 500 }
    );
  }
}