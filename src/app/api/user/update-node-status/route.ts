import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import NodeSession from '@/models/NodeSession';
import PointsHistory from '@/models/PointsHistory';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Safely parse the request body
    let walletAddress, isRunning, sessionData;
    try {
      const body = await request.json();
      walletAddress = body.walletAddress;
      isRunning = body.isRunning;
      sessionData = body.sessionData;
      console.log('Request body parsed successfully:', { walletAddress, isRunning, sessionData });
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body', message: 'Could not parse JSON body' },
        { status: 400 }
      );
    }
    
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
    
    // Update node status
    user.nodeStatus = isRunning;
    
    // Get client IP address
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || '0.0.0.0';
    
    // Get user agent information
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    
    if (isRunning) {
      // If node is being turned on, store the current time as the start time
      const now = new Date();
      user.nodeStartTime = now;
      
      // Check if the request is coming from the extension
      // This API should only be called by the extension, but we'll add an extra check
      const isExtension = userAgent.toLowerCase().includes('extension') || 
                         request.headers.get('x-source') === 'extension';
      
      if (isExtension) {
        // Use the session ID from the extension or generate one
        const sessionId = sessionData?.sessionId || `${user._id}-${Date.now()}`;
        
        // Create a new node session with validation
        const newSession = await NodeSession.create({
          user: user._id,
          walletAddress: user.walletAddress,
          deviceIP: sessionData?.deviceIP || clientIP,
          status: 'active',
          startTime: now,
          sessionId: sessionId,
          deviceInfo: 'TOPAY Browser Extension',
          deviceType: 'browser',
          browser: userAgent.includes('Chrome') ? 'Chrome' : 
                  userAgent.includes('Firefox') ? 'Firefox' : 
                  userAgent.includes('Safari') ? 'Safari' : 
                  userAgent.includes('Edge') ? 'Edge' : 'Unknown',
          platform: userAgent.includes('Windows') ? 'Windows' : 
                   userAgent.includes('Mac') ? 'Mac' : 
                   userAgent.includes('Linux') ? 'Linux' : 
                   userAgent.includes('Android') ? 'Android' : 
                   userAgent.includes('iOS') ? 'iOS' : 'Unknown',
          userAgent: userAgent,
          pointsPerSecond: sessionData?.pointsPerSecond || 0.2,
          metadata: {
            source: 'extension',
            event: 'node_started'
          }
        });
        
        console.log('Created new session:', {
          sessionId: newSession.sessionId,
          walletAddress: user.walletAddress,
          deviceIP: newSession.deviceIP,
          startTime: newSession.startTime
        });
        
        // Verify the session was created successfully
        const verifySession = await NodeSession.findById(newSession._id);
        if (!verifySession) {
          throw new Error('Failed to create session - verification failed');
        }
      }
    } else if (user.nodeStartTime) {
      // If node is being turned off and we have a start time, calculate uptime and points
      const now = new Date();
      
      // Use uptime and points from extension if available, otherwise calculate
      let elapsedSeconds, pointsEarned, elapsedMinutes;
      
      if (sessionData && sessionData.uptime && sessionData.pointsEarned) {
        // Use the values from the extension
        elapsedSeconds = sessionData.uptime;
        pointsEarned = sessionData.pointsEarned;
        elapsedMinutes = elapsedSeconds / 60;
        console.log(`Using extension-provided values: ${elapsedSeconds} seconds, ${pointsEarned} points`);
      } else {
        // Calculate based on stored start time
        const startTime = new Date(user.nodeStartTime);
        const elapsedMilliseconds = now.getTime() - startTime.getTime();
        elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
        elapsedMinutes = elapsedSeconds / 60;
        
        // Calculate points at 30 points per minute (1800 per hour)
        pointsEarned = elapsedMinutes * 12;
        console.log(`Calculated values: ${elapsedSeconds} seconds, ${pointsEarned} points`);
      }
      
      // Update user points
      user.points += pointsEarned;
      
      // Update uptime (in seconds)
      user.uptime += elapsedSeconds;
      
      // Reset the start time
      user.nodeStartTime = null;
      
      // Find and update the active session with improved logging
      let activeSession;
      
      console.log('Looking for active session to deactivate:', {
        sessionId: sessionData?.sessionId,
        walletAddress: user.walletAddress,
        uptime: elapsedSeconds,
        pointsEarned
      });
      
      // If we have a session ID from the extension, use it to find the session
      if (sessionData && sessionData.sessionId) {
        activeSession = await NodeSession.findOne({
          sessionId: sessionData.sessionId
        });
        console.log('Found session by sessionId:', activeSession ? 'Yes' : 'No');
      }
      
      // If no session found with the provided ID, fall back to finding the most recent active session
      if (!activeSession) {
        activeSession = await NodeSession.findOne({
          walletAddress: user.walletAddress,
          status: 'active',
          endTime: { $exists: false }
        }).sort({ startTime: -1 });
        console.log('Found session by fallback search:', activeSession ? 'Yes' : 'No');
      }
      
      if (activeSession) {
        activeSession.status = 'inactive';
        activeSession.endTime = now;
        activeSession.uptime = elapsedSeconds;
        activeSession.pointsEarned = pointsEarned;
        await activeSession.save();
        
        console.log('Successfully deactivated session:', {
          sessionId: activeSession.sessionId,
          finalUptime: activeSession.uptime,
          finalPoints: activeSession.pointsEarned
        });
      } else {
        console.warn('No active session found to deactivate for wallet:', user.walletAddress);
      }
      
      // Create points history record
      await PointsHistory.create({
        user: user._id,
        walletAddress: user.walletAddress,
        points: pointsEarned,
        source: 'node',
        description: `Earned for ${elapsedMinutes.toFixed(2)} minutes of node uptime`,
        timestamp: now,
        transactionType: 'credit' // Adding the required transactionType field
      });
      
      console.log(`User ${user.walletAddress} earned ${pointsEarned.toFixed(3)} points for ${elapsedMinutes.toFixed(2)} minutes (${elapsedSeconds} seconds) of uptime`);
    }
    
    await user.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Node status updated',
      user
    });
    
  } catch (error) {
    console.error('Error updating node status:', error);
    console.error('Request details:', {
      walletAddress: request.body ? 'Present' : 'Missing',
      userAgent: request.headers.get('user-agent'),
      source: request.headers.get('x-source'),
      clientIP: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0'
    });
    
    // Return more detailed error information
    return NextResponse.json(
      { 
        error: 'Failed to update node status', 
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : '') : undefined
      },
      { status: 500 }
    );
  }
}