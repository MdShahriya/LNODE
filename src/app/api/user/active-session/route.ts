import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import NodeSession, { INodeSession } from '@/models/NodeSession';
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
    
    // Get the most recent active session
    const activeSession = await NodeSession.findOne({
      walletAddress: walletAddress.toLowerCase(),
      status: 'active'
    }).sort({ startTime: -1 }).lean() as INodeSession | null;
    
    if (!activeSession) {
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
    
    if (activeSession && 'deviceInfo' in activeSession && activeSession.deviceInfo) {
      try {
        // Check if deviceInfo is already a string or needs parsing
        let parsedInfo;
        if (typeof activeSession.deviceInfo === 'string') {
          // Try to parse as JSON, if it fails, use as plain string
          try {
            parsedInfo = JSON.parse(activeSession.deviceInfo);
          } catch {
            // If JSON parsing fails, treat as plain string
            deviceInfo = activeSession.deviceInfo;
            browser = activeSession.browser || 'Unknown';
            platform = activeSession.platform || 'Unknown';
            parsedInfo = null;
          }
        } else {
          parsedInfo = activeSession.deviceInfo;
        }
        
        if (parsedInfo) {
          deviceInfo = parsedInfo.userAgent || parsedInfo.deviceInfo || 'Unknown device';
          browser = activeSession.browser || parsedInfo.browser || 'Unknown';
          platform = activeSession.platform || parsedInfo.platform || 'Unknown';
        }
      } catch (e) {
        console.error('Error parsing device info:', e);
        // Fallback to using deviceInfo as string if available
        deviceInfo = typeof activeSession.deviceInfo === 'string' ? activeSession.deviceInfo : 'Unknown device';
        browser = activeSession.browser || 'Unknown';
        platform = activeSession.platform || 'Unknown';
      }
    }
    
    // Calculate current uptime
    const now = new Date();
    const startTime = new Date(activeSession.startTime);
    const currentUptime = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    
    return NextResponse.json({
      isActive: true,
      sessionId: activeSession.sessionId,
      deviceIP: activeSession.deviceIP || '0.0.0.0',
      deviceInfo: deviceInfo,
      browser: browser,
      platform: platform,
      startTime: activeSession.startTime,
      currentUptime: currentUptime,
      lastHeartbeat: activeSession.lastHeartbeat || activeSession.startTime
    });
    
  } catch (error) {
    console.error('Error fetching active session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active session' },
      { status: 500 }
    );
  }
}