'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAccount } from 'wagmi'
import "./Header.css"

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Tasks', href: '/dashboard/tasks' },
  { name: 'Achievements', href: '/dashboard/achievements' },
  { name: 'Leaderboard', href: '/dashboard/leaderboard' },
  { name: 'Referral', href: '/dashboard/referral' },
]

export default function Header() {
  const pathname = usePathname()
  const { isConnected } = useAccount()

  return (
    <header className="header">
      <nav className="header__nav" aria-label="Top">
        <div className="header__container">
          <div className="header__left">
            <Link href="/dashboard" className="header__logo">
              <Image
                src="/logo.png"
                alt="TOPAY Logo"
                width={40}
                height={40}
                className="header__logo-image"
              />
              <span className="header__logo-text">TOPAY NODE</span>
            </Link>

            <div className="header__links">
              {navigation.map((item) => (
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
          </div>
        </div>
      </nav>
    </header>
  )
}
