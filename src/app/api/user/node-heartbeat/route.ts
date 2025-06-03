import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import NodeSession from '@/models/NodeSession';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { walletAddress, sessionId } = await request.json();
    
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

    // Get client IP address
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || '0.0.0.0';
    
    const now = new Date();
    
    // If sessionId is provided, try to find and update that specific session
    if (sessionId) {
      const session = await NodeSession.findOne({
        walletAddress: walletAddress.toLowerCase(),
        sessionId,
        status: 'active'
      });

      if (session) {
        // Update last heartbeat
        session.lastHeartbeat = now;
        await session.save();

        return NextResponse.json({
          success: true,
          message: 'Heartbeat received',
          sessionId: session.sessionId,
          lastHeartbeat: session.lastHeartbeat
        });
      }
    }

    // If no valid session found with provided sessionId or no sessionId provided,
    // find the most recent active session
    const activeSession = await NodeSession.findOne({
      walletAddress: walletAddress.toLowerCase(),
      status: 'active'
    }).sort({ startTime: -1 });

    if (activeSession) {
      // Update last heartbeat
      activeSession.lastHeartbeat = now;
      await activeSession.save();

      return NextResponse.json({
        success: true,
        message: 'Heartbeat received for most recent session',
        sessionId: activeSession.sessionId,
        lastHeartbeat: activeSession.lastHeartbeat
      });
    }

    // If no active session found, check if request is from extension before creating a new one
    // Get user agent information
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    
    // Check if the request is coming from the extension
    const isExtension = userAgent.toLowerCase().includes('extension') || 
                       request.headers.get('x-source') === 'extension';
    
    // Only create a new session if the request is from the extension
    if (isExtension) {
      const newSessionId = `${user._id}-${Date.now()}`;
      
      // Create a new node session
      const newSession = await NodeSession.create({
        user: user._id,
        walletAddress: user.walletAddress,
        deviceIP: clientIP,
        status: 'active',
        startTime: now,
        sessionId: newSessionId,
        deviceInfo: userAgent,
        deviceType: 'browser',
        browser: userAgent.includes('Chrome') ? 'Chrome' : 
                userAgent.includes('Firefox') ? 'Firefox' : 
                userAgent.includes('Safari') ? 'Safari' : 
                userAgent.includes('Edge') ? 'Edge' : 'Unknown',
        platform: userAgent.includes('Windows') ? 'Windows' : 
                 userAgent.includes('Mac') ? 'Mac' : 
                 userAgent.includes('Linux') ? 'Linux' : 'Unknown',
        lastHeartbeat: now,
        metadata: {
          source: 'extension',
          event: 'heartbeat_new_session'
        }
      });

      // Update user's node status if it wasn't already running
      if (!user.nodeStatus) {
        user.nodeStatus = true;
        user.nodeStartTime = now;
        await user.save();
      }
      
      return NextResponse.json({
        success: true,
        message: 'New session created with heartbeat',
        sessionId: newSession.sessionId,
        lastHeartbeat: newSession.lastHeartbeat
      });
    }
    
    // If we get here, no active session was found and the request is not from the extension
    return NextResponse.json({
      success: false,
      message: 'No active session found and request is not from extension',
    }, { status: 400 });

    /* Unreachable code removed */

  } catch (error) {
    console.error('Error processing heartbeat:', error);
    return NextResponse.json(
      { error: 'Failed to process heartbeat' },
      { status: 500 }
    );
  }
}