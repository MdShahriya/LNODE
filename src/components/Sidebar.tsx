'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAccount } from 'wagmi'
import { FaBars, FaTimes, FaHome, FaChartLine, FaUserFriends, FaGift, FaUser, FaCommentAlt, FaDownload } from 'react-icons/fa'
import './Sidebar.css'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: <FaHome /> },
  { name: 'Opinion wall', href: '/dashboard/opinionwall', icon: <FaCommentAlt /> },
  { name: 'Rewards', href: '/dashboard/rewards', icon: <FaGift /> },
  { name: 'Leaderboard', href: '/dashboard/leaderboard', icon: <FaChartLine /> },
  { name: 'Referral', href: '/dashboard/referral', icon: <FaUserFriends /> },
  { name: 'Profile', href: '/dashboard/profile', icon: <FaUser />}
]

export default function Sidebar() {
  const pathname = usePathname()
  const { isConnected } = useAccount()
  const [isOpen, setIsOpen] = useState(false)
  
  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar')
      const hamburger = document.getElementById('hamburger-button')
      
      if (
        sidebar && 
        hamburger && 
        !sidebar.contains(event.target as Node) && 
        !hamburger.contains(event.target as Node) && 
        isOpen
      ) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])
  
  // Close sidebar when route changes (mobile)
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <>
      {/* Hamburger menu button (mobile only) */}
      <button 
        id="hamburger-button"
        className="sidebar__hamburger" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>
      
      {/* Sidebar */}
      <aside 
        id="sidebar" 
        className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}
      >
        <div className="sidebar__header">
          <Link href="/dashboard" className="sidebar__logo">
            <Image
              src="/logo.png"
              alt="TOPAY Logo"
              width={40}
              height={40}
              className="sidebar__logo-image"
            />
            <span className="sidebar__logo-text">TOPAY NODE</span>
          </Link>
          <button 
            className="sidebar__close" 
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <FaTimes />
          </button>
        </div>
        
        <nav className="sidebar__nav">
          <ul className="sidebar__nav-list">
            {navigation.map((item) => (
              <li key={item.name} className="sidebar__nav-item">
                <Link
                  href={item.href}
                  className={`sidebar__nav-link${pathname === item.href ? ' active' : ''}`}
                >
                  <span className="sidebar__nav-icon">{item.icon}</span>
                  <span className="sidebar__nav-text">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="sidebar__footer">
          <div className="sidebar__extension">
            <a 
              href="https://chrome.google.com/webstore/detail/topay-node-extension/your-extension-id" 
              target="_blank" 
              rel="noopener noreferrer"
              className="sidebar__extension-link"
            >
              <FaDownload className="sidebar__extension-icon" />
              <span>Install Extension</span>
            </a>
          </div>
          <div className="sidebar__wallet">
            {isConnected
              ? <appkit-button balance='hide' />
              : <appkit-connect-button />}
          </div>
        </div>
      </aside>
      
      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar__overlay" onClick={() => setIsOpen(false)} />}
    </>
  )
}