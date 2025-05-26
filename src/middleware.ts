import { NextRequest, NextResponse } from 'next/server';

// List of admin wallet addresses (should be moved to environment variables in production)
const ADMIN_WALLETS = [
  '0x9841adF197F21fE9a299312da8EF2C47f83c4e89', // Replace with actual admin wallet addresses
  // Add more admin wallet addresses as needed
];

// Secret key for bypassing admin check (should be a secure environment variable in production)
const ADMIN_BYPASS_KEY = 'topay-admin-bypass-key';

export function middleware(request: NextRequest) {
  // Only apply middleware to admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Check for bypass key in query parameters
    const bypassKey = request.nextUrl.searchParams.get('adminKey');
    if (bypassKey === ADMIN_BYPASS_KEY) {
      // Allow access with valid bypass key
      return NextResponse.next();
    }

    // Get the connected wallet from cookies or headers
    // In a real implementation, you would need to verify the wallet signature
    // This is a simplified version for demonstration
    const walletCookie = request.cookies.get('connected-wallet');
    const walletAddress = walletCookie?.value?.toLowerCase();

    // If no wallet is connected or the wallet is not in the admin list, redirect to home
    if (!walletAddress || !ADMIN_WALLETS.includes(walletAddress)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Allow the request to continue
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};