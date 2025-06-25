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
    // Check if this API endpoint is in the allowed list
    const isAllowedEndpoint = MAINTENANCE_CONFIG.allowedEndpoints.some(endpoint => 
      pathname.startsWith(endpoint)
    );

    if (!isAllowedEndpoint) {
      // Block the API call and return maintenance response
      return NextResponse.json(
        {
          error: 'Service Unavailable',
          message: MAINTENANCE_CONFIG.message,
          maintenance: true,
          timestamp: new Date().toISOString()
        },
        { 
          status: 503,
          headers: {
            'Retry-After': '3600', // Suggest retry after 1 hour
            'Content-Type': 'application/json'
          }
        }
      );
    }
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