import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import UserHistory, { IUserHistory } from '@/models/UserHistory';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
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
    
    // Check if node is running
    if (!user.nodeStatus) {
      return NextResponse.json({
        isActive: false,
        message: 'No active session'
      });
    }
    
    // Get the most recent node_start entry
    const latestSession = await UserHistory.findOne({
      walletAddress: walletAddress.toLowerCase(),
      connectionType: 'node_start'
    }).sort({ timestamp: -1 }).lean() as IUserHistory | null;
    
    if (!latestSession) {
      return NextResponse.json({
        isActive: user.nodeStatus,
        deviceIP: '0.0.0.0',
        deviceInfo: 'Unknown device',
        timestamp: user.nodeStartTime
      });
    }
    
    // Parse device info if available
    let deviceInfo = 'Unknown device';
    let browser = 'Unknown';
    let platform = 'Unknown';
    
    if (latestSession && 'deviceInfo' in latestSession && latestSession.deviceInfo) {
      try {
        // Check if deviceInfo is already a string or needs parsing
        let parsedInfo;
        if (typeof latestSession.deviceInfo === 'string') {
          // Try to parse as JSON, if it fails, use as plain string
          try {
            parsedInfo = JSON.parse(latestSession.deviceInfo);
          } catch {
            // If JSON parsing fails, treat as plain string
            deviceInfo = latestSession.deviceInfo;
            browser = latestSession.browser || 'Unknown';
            platform = latestSession.platform || 'Unknown';
            parsedInfo = null;
          }
        } else {
          parsedInfo = latestSession.deviceInfo;
        }
        
        if (parsedInfo) {
          deviceInfo = parsedInfo.userAgent || parsedInfo.deviceInfo || 'Unknown device';
          browser = latestSession.browser || parsedInfo.browser || 'Unknown';
          platform = latestSession.platform || parsedInfo.platform || 'Unknown';
        }
      } catch (e) {
        console.error('Error parsing device info:', e);
        // Fallback to using deviceInfo as string if available
        deviceInfo = typeof latestSession.deviceInfo === 'string' ? latestSession.deviceInfo : 'Unknown device';
        browser = latestSession.browser || 'Unknown';
        platform = latestSession.platform || 'Unknown';
      }
    }
    
    return NextResponse.json({
      isActive: true,
      deviceIP: latestSession.deviceIP || '0.0.0.0',
      deviceInfo: deviceInfo,
      browser: browser,
      platform: platform,
      timestamp: latestSession.timestamp || new Date()
    });
    
  } catch (error) {
    console.error('Error fetching active session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active session' },
      { status: 500 }
    );
  }
}