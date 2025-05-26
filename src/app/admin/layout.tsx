'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import { getAdminStatus } from '@/lib/adminAuth';
import './admin-layout.css';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bypassKey = searchParams.get('adminKey');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authorized to access admin section
    const adminStatus = getAdminStatus(address, bypassKey);
    setIsAuthorized(adminStatus);
    setIsLoading(false);
    
    // Redirect to home if not authorized
    if (!adminStatus && !isLoading) {
      router.push('/');
    }
  }, [address, bypassKey, router, isLoading]);

  // Show loading state while checking authorization
  if (isLoading) {
    return (
      <div className="admin-layout admin-layout--loading">
        <div className="admin-loading">
          <div className="admin-loading__spinner"></div>
          <p>Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized message if not authorized (will redirect soon)
  if (!isAuthorized) {
    return (
      <div className="admin-layout admin-layout--unauthorized">
        <div className="admin-unauthorized">
          <h1>Unauthorized Access</h1>
          <p>You do not have permission to access the admin section.</p>
          <p>Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  // Show admin layout if authorized
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-content">
        <main>{children}</main>
      </div>
    </div>
  );
}