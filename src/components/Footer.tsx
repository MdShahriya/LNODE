import React from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

const Footer: React.FC = () => {
  return (
    <footer className={styles['modern-footer']}>
      <div className={styles['footer-content']}>
        <div className={styles['footer-section']}>
          <h3 className={styles['footer-title']}>TOPAY Quiz</h3>
          <p className={styles['footer-description']}>
            Learn about blockchain and earn rewards through interactive quizzes.
          </p>
          <div className={styles['social-icons']}>
            <a href="https://twitter.com/topayfoundation" target="_blank" rel="noopener noreferrer" className={styles['social-icon']}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
              </svg>
            </a>
            <a href="https://discord.gg/topayfoundation" target="_blank" rel="noopener noreferrer" className={styles['social-icon']}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 9a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v7.5a3.5 3.5 0 0 0 3.5 3.5H14" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                <path d="M21 16.5v-7.5a4 4 0 0 0-4-4h-1.5" />
                <path d="M8 10h.01" />
                <path d="M16 10h.01" />
                <path d="M12 19h8.5a2.5 2.5 0 0 0 0-5H12v5Z" />
              </svg>
            </a>
            <a href="https://github.com/topay-foundation" target="_blank" rel="noopener noreferrer" className={styles['social-icon']}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
                <path d="M9 18c-4.51 2-5-2-7-2"></path>
              </svg>
            </a>
          </div>
        </div>
        
        <div className={styles['footer-section']}>
          <h3 className={styles['footer-title']}>Quick Links</h3>
          <ul className={styles['footer-links']}>
            <li><Link href="/">Dashboard</Link></li>
            <li><Link href="/quiz">Quizzes</Link></li>
            <li><Link href="/referral">Referrals</Link></li>
          </ul>
        </div>

        <div className={styles['footer-section']}>
          <h3 className={styles['footer-title']}>Resources</h3>
          <ul className={styles['footer-links']}>
            <li><a href="https://docs.topayfoundation.com/docs/intro" target="_blank" rel="noopener noreferrer">Documentation</a></li>
            <li><a href="https://docs.topayfoundation.com/docs/resources/whitepaper" target="_blank" rel="noopener noreferrer">Whitepaper</a></li>
            <li><a href="https://www.topayfoundation.com" target="_blank" rel="noopener noreferrer">FAQ</a></li>
          </ul>
        </div>
      </div>
      
      <div className={styles['footer-bottom']}>
        <p>&copy; {new Date().getFullYear()} TOPAY Foundation. All rights reserved.</p>
        <div className={styles['footer-bottom-links']}>
          <a href="https://www.topayfoundation.com/privacy-policy" target="_blank" rel="noopener noreferrer" className={styles['footer-link']}>Privacy Policy</a>
          <a href="https://www.topayfoundation.com/terms-of-service" target="_blank" rel="noopener noreferrer" className={styles['footer-link']}>Terms of Service</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;