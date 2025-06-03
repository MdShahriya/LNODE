'use client'

import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__container">
        <p className="footer__copyright">
          &copy; {new Date().getFullYear()} TOPAY Foundation. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
