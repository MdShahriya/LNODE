'use client'

import Link from 'next/link'
import './Footer.css'

const navigation = {
  main: [
    { name: 'About', href: '#' },
    { name: 'Documentation', href: '#' },
    { name: 'Terms', href: '#' },
    { name: 'Privacy Policy', href: '#' },
  ],
  social: [
    {
      name: 'Twitter',
      href: 'https://twitter.com/topayfoundation',
      icon: (props: React.SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675..." />
        </svg>
      ),
    },
    {
      name: 'GitHub',
      href: 'https://github.com/topayfoundation',
      icon: (props: React.SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484..." />
        </svg>
      ),
    },
    {
      name: 'Discord',
      href: 'https://discord.com/invite/uZNAzSJYgW',
      icon: (props: React.SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515..." />
        </svg>
      ),
    },
  ],
}

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__container">
        <nav className="footer__nav" aria-label="Footer">
          {navigation.main.map((item) => (
            <div key={item.name} className="footer__nav-item">
              <Link href={item.href} className="footer__link">
                {item.name}
              </Link>
            </div>
          ))}
        </nav>
        <div className="footer__social">
          {navigation.social.map((item) => (
            <Link key={item.name} href={item.href} className="footer__social-link">
              <span className="sr-only">{item.name}</span>
              <item.icon className="footer__icon" aria-hidden="true" />
            </Link>
          ))}
        </div>
        <p className="footer__copyright">
          &copy; {new Date().getFullYear()} TOPAY Foundation. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
