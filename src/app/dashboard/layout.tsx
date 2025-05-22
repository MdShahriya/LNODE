'use client';

import { ReactNode } from 'react';
import { useAccount } from 'wagmi';

import Header from '@/components/Header';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  useAccount();


  return (
    <div className="dashboard-layout">
      <div className="container">
        <Header />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}