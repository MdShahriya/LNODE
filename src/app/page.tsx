'use client'

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { FaTwitter, FaGithub, FaDiscord } from 'react-icons/fa';
import NodeNetworkBackground from "../components/NodeNetworkBackground";
import "./page.css";

const LandingPage: React.FC = () => {
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const listItem = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="landing-container">
      {/* Animated background behind content */}
      <NodeNetworkBackground />

      {/* Header */}
      <motion.header 
        className="landing-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="header-container">
          <Link href="/" className="header-logo">
            <Image
              src="/logo.png"
              alt="TOPAY Logo"
              width={40}
              height={40}
              className="header-logo-image"
            />
            <span className="header-logo-text">TOPAY NODE</span>
          </Link>

          <nav className="header-nav">
            <ul className="header-nav-list">
              <li><Link href="/" className="header-nav-link active">Home</Link></li>
              <li><Link href="/dashboard/rewards" className="header-nav-link">Rewards</Link></li>
              <li><Link href="/dashboard/leaderboard" className="header-nav-link">Leaderboard</Link></li>
            </ul>
          </nav>

          <div className="header-cta">
            <Link href="/dashboard">
              <motion.button 
                className="header-button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Launch Dashboard
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.header>

      <main className="landing-main">
        {/* Hero Section */}
        <motion.section 
          className="landing-hero"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
        >
          <motion.div className="hero-content">
            <motion.h1 
              className="landing-title"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              Run a Node. <span className="highlight">Power the Future.</span>
            </motion.h1>
            <motion.p 
              className="landing-description"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.4 }}
            >
              Become a validator on the TOPAY Network and earn rewards by supporting decentralized payments. Join thousands of node operators building the future of financial infrastructure.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Link href="/dashboard">
                <motion.button 
                  className="cta-button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Launch Node Dashboard
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* Why Run a Node */}
        <motion.section 
          className="landing-benefits"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeIn}
        >
          <motion.h2 className="features-title">
            Why Operate a TOPAY Node?
          </motion.h2>
          <motion.ul 
            className="features-list"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.li variants={listItem}>
              <span className="list-icon">💰</span> <strong>Earn Rewards:</strong> Receive up to 1,000 TOPAY tokens monthly based on node uptime and performance
            </motion.li>
            <motion.li variants={listItem}>
              <span className="list-icon">🔒</span> <strong>Network Security:</strong> Contribute to a secure and scalable payment network with advanced cryptographic protection
            </motion.li>
            <motion.li variants={listItem}>
              <span className="list-icon">🏆</span> <strong>Achievements:</strong> Unlock exclusive achievements and improve leaderboard ranking to earn bonus rewards
            </motion.li>
            <motion.li variants={listItem}>
              <span className="list-icon">💻</span> <strong>Low Requirements:</strong> Run a node with minimal hardware - 2GB RAM, 50GB storage, and stable internet connection
            </motion.li>
            <motion.li variants={listItem}>
              <span className="list-icon">🌐</span> <strong>Community:</strong> Join a global community of node operators collaborating to build the future of finance
            </motion.li>
          </motion.ul>
        </motion.section>

        {/* About TOPAY */}
        <motion.section 
          className="landing-about"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeIn}
        >
          <motion.h2 className="features-title">
            About TOPAY Network
          </motion.h2>
          <motion.div 
            className="about-content"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.p variants={listItem}>
              TOPAY is a next-generation decentralized payment protocol designed to provide fast, secure, and low-cost transactions globally. Our network is powered by distributed node operators who maintain the infrastructure and validate transactions.
            </motion.p>
            <motion.p variants={listItem}>
              <strong>Mission:</strong> To create an accessible financial system that empowers individuals and businesses worldwide through blockchain technology.
            </motion.p>
            <motion.p variants={listItem}>
              <strong>Vision:</strong> A world where financial transactions are seamless, secure, and accessible to everyone, regardless of location or economic status.
            </motion.p>
            <motion.div className="about-stats" variants={listItem}>
              <div className="stat-item">
                <span className="stat-number">10,000+</span>
                <span className="stat-label">Active Nodes</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">150+</span>
                <span className="stat-label">Countries</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">1M+</span>
                <span className="stat-label">Transactions Daily</span>
              </div>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* FAQ Section */}
        <motion.section 
          className="landing-faq"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeIn}
        >
          <motion.h2 className="features-title">
            Frequently Asked Questions
          </motion.h2>
          <motion.div 
            className="faq-content"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.div className="faq-item" variants={listItem}>
              <h3>Do I need to stake tokens to run a node?</h3>
              <p>No, TOPAY nodes don&apos;t require staking. Anyone can run a node with the minimum hardware requirements and earn rewards based on performance.</p>
            </motion.div>
            <motion.div className="faq-item" variants={listItem}>
              <h3>How are rewards calculated?</h3>
              <p>Rewards are calculated based on node uptime, task completion, network contribution, and your position on the leaderboard. The more active and reliable your node, the higher your rewards.</p>
            </motion.div>
            <motion.div className="faq-item" variants={listItem}>
              <h3>Can I run multiple nodes?</h3>
              <p>Yes, you can operate multiple nodes from different locations to increase your rewards. Each node must have a unique wallet address and meet the minimum requirements.</p>
            </motion.div>
            <motion.div className="faq-item" variants={listItem}>
              <h3>When are rewards distributed?</h3>
              <p>Rewards are distributed monthly to your registered wallet address. You can track your earnings in real-time on the dashboard.</p>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* Call to Action */}
        <motion.section 
          className="landing-cta"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeIn}
        >
          <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            Ready to Get Started?
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            Join the TOPAY Node Operator community and contribute to building a decentralized payment infrastructure.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link href="/dashboard">
              <motion.button 
                className="cta-button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Access Node Dashboard
              </motion.button>
            </Link>
          </motion.div>
        </motion.section>
      </main>

      {/* Footer */}
      <motion.footer 
        className="landing-footer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-brand">
              <Link href="/" className="footer-logo">
                <Image
                  src="/logo.png"
                  alt="TOPAY Logo"
                  width={32}
                  height={32}
                  className="footer-logo-image"
                />
                <span className="footer-logo-text">TOPAY NODE</span>
              </Link>
              <p className="footer-tagline">Powering the future of decentralized payments</p>
            </div>

            <div className="footer-links">

              <div className="footer-links-column">
                <h3 className="footer-links-title">Connect</h3>
                <div className="footer-social-links">
                  <a href="https://x.com/topayfoundation" className="footer-social-link" aria-label="Twitter">
                    <FaTwitter />
                  </a>
                  <a href="https://github.com/TOPAY-FOUNDATION" className="footer-social-link" aria-label="GitHub">
                    <FaGithub />
                  </a>
                  <a href="https://discord.gg/tqRcdbnvXx" className="footer-social-link" aria-label="Discord">
                    <FaDiscord />
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p className="footer-copyright">&copy; {new Date().getFullYear()} TOPAY Foundation. All rights reserved.</p>
            <div className="footer-legal">
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default LandingPage;
