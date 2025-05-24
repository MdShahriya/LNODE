'use client';

import { ReactNode } from 'react';
import { useAccount } from 'wagmi';
import AdminSidebar from '@/components/AdminSidebar';
import './admin-layout.css';

export default function AdminLayout({ children }: { children: ReactNode }) {
  useAccount();

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-content">
        <main>{children}</main>
      </div>
    </div>
  );
}