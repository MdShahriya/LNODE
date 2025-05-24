'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAccount } from 'wagmi'
import "./Header.css"
import React from 'react'

const adminNavigation = [
  { name: 'Dashboard', href: '/admin' },
  { name: 'Tasks', href: '/admin/tasks' },
  { name: 'Achievements', href: '/admin/achievements' },
  { name: 'Users', href: '/admin/usersmanagment' },
  { name: 'Opinion Fund', href: '/admin/opinionfund' },
]

export default function AdminHeader() {
  const pathname = usePathname()
  const { isConnected } = useAccount()

  return (
    <header className="header">
      <nav className="header__nav" aria-label="Top">
        <div className="header__container">
          <div className="header__left">
            <Link href="/admin" className="header__logo">
              <Image
                src="/logo.png"
                alt="TOPAY Logo"
                width={40}
                height={40}
                className="header__logo-image"
              />
              <span className="header__logo-text">TOPAY ADMIN</span>
            </Link>

            <div className="header__links">
              {adminNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`header__link ${pathname === item.href ? 'active' : ''}`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="header__right">
            <div className="header__wallet">
              {isConnected
                ? <appkit-button balance='hide' />
                : <appkit-connect-button />}
            </div>
            <Link href="/dashboard" className="header__link">
              Switch to User View
            </Link>
          </div>
        </div>
      </nav>
    </header>
  )
}