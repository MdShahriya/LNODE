import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint for detecting the TOPAY extension and retrieving its status
 * This provides a more reliable alternative to window.topayNodeExtensionDetected
 */
export async function GET(request: NextRequest) {
  try {
    // Get the extension ID from the request headers
    // The extension should set this header when making requests
    const extensionId = request.headers.get('x-topay-extension-id');
    
    // If the header is not present, the request is not from the extension
    if (!extensionId) {
      return NextResponse.json({
        detected: false,
        message: 'Extension not detected'
      });
    }
    
    // Return success response with extension detected
    return NextResponse.json({
      detected: true,
      message: 'Extension detected',
      extensionId
    });
  } catch (error) {
    console.error('Error detecting extension:', error);
    return NextResponse.json(
      { error: 'Failed to detect extension' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { walletAddress, nodeStatus, deviceIp } = await request.json();
    
    // Validate required fields
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    // Return success response with the extension data
    return NextResponse.json({
      success: true,
      message: 'Extension data received',
      data: {
        walletAddress,
        nodeStatus: nodeStatus || false,
        deviceIp: deviceIp || ''
      }
    });
  } catch (error) {
    console.error('Error processing extension data:', error);
    return NextResponse.json(
      { error: 'Failed to process extension data' },
      { status: 500 }
    );
  }
}