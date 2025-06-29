import { NextRequest, NextResponse } from 'next/server';
import { MAINTENANCE_CONFIG } from './src/config/maintenance';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If maintenance mode is disabled, allow all requests
  if (!MAINTENANCE_CONFIG.enabled) {
    return NextResponse.next();
  }

  // Check if the request is for an API route
  if (pathname.startsWith('/api')) {
    // During maintenance, block ALL API calls
    console.log(`[Maintenance] Blocking API call to ${pathname}`); // Debug log
    return NextResponse.json(
      {
        error: 'Not Found',
        message: 'The requested resource was not found',
        maintenance: true,
        timestamp: new Date().toISOString()
      },
      { 
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  }

  // Check if the request is for an admin route during maintenance
  if (pathname.startsWith('/admin')) {
    const isAllowedAdminRoute = MAINTENANCE_CONFIG.allowedAdminRoutes.some(route => 
      pathname.startsWith(route)
    );

    if (!isAllowedAdminRoute) {
      // Redirect admin routes to maintenance page
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }
  }

  // For all other routes during maintenance, let the layout handle the maintenance page
  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};