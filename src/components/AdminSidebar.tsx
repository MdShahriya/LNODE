'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAccount } from 'wagmi'
import { FaBars, FaTimes, FaHome, FaTasks, FaTrophy, FaUsers, FaMoneyBillWave } from 'react-icons/fa'
import './Sidebar.css' // Reusing the same CSS

const adminNavigation = [
  { name: 'Dashboard', href: '/admin', icon: <FaHome /> },
  { name: 'Tasks', href: '/admin/tasks', icon: <FaTasks /> },
  { name: 'Achievements', href: '/admin/achievements', icon: <FaTrophy /> },
  { name: 'Users', href: '/admin/usersmanagment', icon: <FaUsers /> },
  { name: 'Opinion Fund', href: '/admin/opinionfund', icon: <FaMoneyBillWave /> },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const { isConnected } = useAccount()
  const [isOpen, setIsOpen] = useState(false)
  
  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('admin-sidebar')
      const hamburger = document.getElementById('admin-hamburger-button')
      
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
        id="admin-hamburger-button"
        className="sidebar__hamburger" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>
      
      {/* Sidebar */}
      <aside 
        id="admin-sidebar" 
        className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}
      >
        <div className="sidebar__header">
          <Link href="/admin" className="sidebar__logo">
            <Image
              src="/logo.png"
              alt="TOPAY Logo"
              width={40}
              height={40}
              className="sidebar__logo-image"
            />
            <span className="sidebar__logo-text">TOPAY ADMIN</span>
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
            {adminNavigation.map((item) => (
              <li key={item.name} className="sidebar__nav-item">
                <Link
                  href={item.href}
                  className={`sidebar__nav-link ${pathname === item.href ? 'active' : ''}`}
                >
                  <span className="sidebar__nav-icon">{item.icon}</span>
                  <span className="sidebar__nav-text">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="sidebar__footer">
          <div className="sidebar__wallet">
            {isConnected
              ? <appkit-button balance='hide' />
              : <appkit-connect-button />}
          </div>
          <Link href="/dashboard" className="sidebar__switch-view">
            Switch to User View
          </Link>
        </div>
      </aside>
      
      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar__overlay" onClick={() => setIsOpen(false)} />}
    </>
  )
}