'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import './Header.css';

const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isConnected } = useAccount(); // Use wagmi's useAccount hook
  const pathname = usePathname();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo-container">
          <Link href="/">
            <div style={{ position: 'relative', width: '40px', height: '40px', display: 'inline-block' }}>
              <Image 
                src="/logo.png" 
                alt="TOPAY Logo" 
                className="logo" 
                fill
                sizes="40px"
                priority
              />
            </div>
            <span className="logo-text">TOPAY</span>
          </Link>
        </div>

        <div className={`nav-container ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <nav className="main-nav">
            <ul className="nav-list">
              <li className="nav-item">
                <Link href="/" className={pathname === '/' ? 'active' : ''}>
                  Dashboard
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/task" className={pathname === '/task' ? 'active' : ''}>
                  Tasks
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/referral" className={pathname === '/referral' ? 'active' : ''}>
                  Referrals
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/airdrop" className={pathname === '/airdrop' ? 'active' : ''}>
                  Airdrops
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/profile" className={pathname === '/profile' ? 'active' : ''}>
                  Profile
                </Link>
              </li>
            </ul>
          </nav>

          <div className="wallet-container">
            {/* Using isConnected to conditionally render a different class if needed */}
            <div className={`wallet-button-wrapper ${isConnected ? 'connected' : ''}`}>
              <appkit-button balance='hide' namespace='eip155'/>
            </div>
          </div>
        </div>

        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          <span className="menu-icon"></span>
        </button>
      </div>
    </header>
  );
};

export default Header;