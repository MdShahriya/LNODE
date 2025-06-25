import { NextResponse } from 'next/server';
import { MAINTENANCE_CONFIG } from '@/config/maintenance';

/**
 * Health check endpoint
 * Returns 200 when service is healthy, 503 when in maintenance mode
 */
export async function GET() {
  if (MAINTENANCE_CONFIG.enabled) {
    return NextResponse.json(
      {
        status: 'maintenance',
        message: MAINTENANCE_CONFIG.message,
        maintenance: true,
        timestamp: new Date().toISOString(),
      },
      { 
        status: 503,
        headers: {
          'Retry-After': '3600',
        }
      }
    );
  }

  return NextResponse.json(
    {
      status: 'healthy',
      message: 'Service is operational',
      maintenance: false,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    },
    { status: 200 }
  );
}

/**
 * HEAD request for lightweight health checks
 */
export async function HEAD() {
  if (MAINTENANCE_CONFIG.enabled) {
    return new NextResponse(null, { 
      status: 503,
      headers: {
        'Retry-After': '3600',
      }
    });
  }

  return new NextResponse(null, { status: 200 });
}