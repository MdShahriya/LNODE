'use client';

import { ReactNode } from 'react';
import { useAccount } from 'wagmi';
import AdminSidebar from '@/components/AdminSidebar';
import './admin-layout.css';

// List of authorized admin wallet addresses
const ADMIN_ADDRESSES = [
  '0x9841adF197F21fE9a299312da8EF2C47f83c4e89', // Replace with actual admin addresses
  '0xeA79596784C7A93f64D51452337513Fd248C310d'
].map(addr => addr.toLowerCase());

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { address, isConnecting } = useAccount();

  // Check if the connected wallet is an authorized admin
  console.log('Connected address:', address);
  console.log('Admin addresses:', ADMIN_ADDRESSES);
  const normalizedAddress = address?.toLowerCase();
  const isAuthorizedAdmin = normalizedAddress && ADMIN_ADDRESSES.includes(normalizedAddress);
  console.log('Is authorized:', isAuthorizedAdmin);

  // Use useEffect for navigatio
  // Show loading state while connecting
  if (isConnecting) {
    return (
      <div className="admin-unauthorized">
        <h1>Loading...</h1>
        <p>Please wait while we verify your wallet...</p>
      </div>
    );
  }

  // Show unauthorized message if not connected or not admin
  if (!address || !isAuthorizedAdmin) {
    return (
      <div className="admin-unauthorized">
        <h1>Unauthorized Access</h1>
        <p>Please connect with an authorized admin wallet to access this section.</p>
        <appkit-button balance='hide'/>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-content">
        <main>{children}</main>
      </div>
    </div>
  );
}