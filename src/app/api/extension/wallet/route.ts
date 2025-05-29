import { NextRequest, NextResponse } from 'next/server';

// GET endpoint to retrieve the current wallet address for extension
export async function GET(request: NextRequest) {
  try {
    // Get the wallet address from the request headers or query params
    const walletAddress = request.headers.get('x-wallet-address') || 
                         request.nextUrl.searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'No wallet address provided' },
        { status: 400 }
      );
    }

    // Return the wallet address
    return NextResponse.json({
      success: true,
      data: {
        walletAddress,
        isConnected: true
      }
    });
  } catch (error) {
    console.error('Error in wallet extension API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint to set wallet address from dashboard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Store wallet address in response headers for extension to read
    const response = NextResponse.json({
      success: true,
      data: {
        walletAddress,
        isConnected: true
      }
    });

    // Set headers that extension can read
    response.headers.set('x-wallet-address', walletAddress);
    response.headers.set('Access-Control-Expose-Headers', 'x-wallet-address');
    
    return response;
  } catch (error) {
    console.error('Error setting wallet address:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}