'use client';

import React from 'react';
import Image from 'next/image';
import styles from './page.module.css';

const MaintenancePage = () => {
  return (
    <div className={styles.maintenanceContainer}>
      <div className={styles.contentWrapper}>
        {/* Logo */}
        <div className={styles.logoSection}>
          <Image
            src="/logo.png"
            alt="TOPAY Foundation Logo"
            width={120}
            height={120}
            className={styles.logo}
          />
        </div>

        {/* Maintenance Icon */}
        <div className={styles.maintenanceIcon}>
          <div className={styles.iconCircle}>
            <svg
              className={styles.iconSvg}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        </div>

        {/* Main Content */}
        <div className={styles.mainContent}>
          <h1 className={styles.mainTitle}>
            We&apos;re Under Maintenance
          </h1>
          
          <p className={styles.subtitle}>
            Our platform is currently undergoing scheduled maintenance to improve your experience.
          </p>
          
          <div className={styles.infoCard}>
            <h2 className={styles.infoCardTitle}>What&apos;s happening?</h2>
            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <span className={styles.featureDot}></span>
                System upgrades and optimizations
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                Enhanced security implementations
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                Performance improvements
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                New features preparation
              </li>
            </ul>
          </div>

          {/* Estimated Time */}
          <div className={styles.estimatedTime}>
            <h3 className={styles.estimatedTimeTitle}>Estimated Completion</h3>
            <p className={styles.estimatedTimeText}>
              We expect to be back online within the next few hours.
            </p>
          </div>

          {/* Contact Information */}
          <div className={styles.contactSection}>
            <p className={styles.contactText}>
              For urgent matters, please contact our support team:
            </p>
            <div className={styles.contactLinks}>
              <a
                href="mailto:support@topay.foundation"
                className={styles.contactLink}
              >
                <svg className={styles.contactIcon} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span>support@topayfoundation.com</span>
              </a>
              
              <a
                href="https://twitter.com/topayfoundation"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contactLink}
              >
                <svg className={styles.contactIcon} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
                <span>@topayfoundation</span>
              </a>
            </div>
          </div>

          {/* Thank You Message */}
          <div className={styles.thankYouSection}>
            <p className={styles.thankYouMessage}>
              Thank you for your patience and continued support!
            </p>
            <p className={styles.teamSignature}>
              - The TOPAY Foundation Team
            </p>
          </div>
        </div>

        {/* Animated Loading Indicator */}
        <div className={styles.loadingIndicator}>
          <div className={styles.loadingDots}>
            <div className={styles.loadingDot}></div>
            <div className={styles.loadingDot}></div>
            <div className={styles.loadingDot}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;