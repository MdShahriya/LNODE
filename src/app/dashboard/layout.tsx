'use client';

import { ReactNode } from 'react';
import { useAccount } from 'wagmi';
import Sidebar from '@/components/Sidebar';
import './dashboard-layout.css';
import Footer from '@/components/Footer';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  useAccount();

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content">
        <main className="main-content">{children}</main>
      </div>
      <Footer />
    </div>
  );
}