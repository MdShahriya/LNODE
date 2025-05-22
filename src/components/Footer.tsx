'use client'

import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTwitter, faGithub, faDiscord } from '@fortawesome/free-brands-svg-icons'
import "./Footer.css"

const navigation = {
  main: [
    { name: 'About', href: '#' },
    { name: 'Documentation', href: '#' },
    { name: 'Terms', href: '#' },
    { name: 'Privacy Policy', href: '#' },
  ],
  social: [
    { name: 'Twitter', href: 'https://twitter.com/topayfoundation', icon: faTwitter },
    { name: 'GitHub', href: 'https://github.com/topayfoundation', icon: faGithub },
    { name: 'Discord', href: 'https://discord.com/invite/uZNAzSJYgW', icon: faDiscord },
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
            <Link key={item.name} href={item.href} className="footer__social-link" target="_blank" rel="noopener noreferrer">
              <span className="sr-only">{item.name}</span>
              <FontAwesomeIcon icon={item.icon} className="footer__icon" aria-hidden="true" />
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
