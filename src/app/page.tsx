'use client'

import React from 'react'
import "./page.css"
import Link from 'next/link'

const LandingPage = () => {
  return (
    <div>
      <main className="landing-main">
        {/* Hero Section */}
        <section className="landing-hero">
          <h1 className="landing-title">Run a Node. Power the Future.</h1>
          <p className="landing-description">
            Become a validator on the TOPAY Network and earn rewards by supporting decentralized payments.
          </p>
          <Link href="/dashboard">
            <button className="cta-button">Launch Node Dashboard</button>
          </Link>
        </section>

        {/* Why Run a Node */}
        <section className="landing-benefits">
          <h2 className="features-title">Why Operate a TOPAY Node?</h2>
          <ul className="features-list">
            <li>✅ Earn points and rewards for uptime and tasks</li>
            <li>✅ Contribute to a secure, scalable payment network</li>
            <li>✅ Unlock exclusive achievements and leaderboard status</li>
          </ul>
        </section>

        {/* How it Works */}
        <section className="landing-how-it-works">
          <h2 className="features-title">How It Works</h2>
          <ol className="how-list">
            <li>1. Connect your wallet and register your node</li>
            <li>2. Keep your node online to maintain uptime</li>
            <li>3. Complete tasks to earn additional points</li>
            <li>4. Climb the leaderboard and redeem rewards</li>
          </ol>
        </section>

        {/* Call to Action */}
        <section className="landing-cta">
          <h2>Ready to Get Started?</h2>
          <p>Join the TOPAY Node Operator community today and help build the decentralized payment infrastructure.</p>
          <Link href="/dashboard">
            <button className="cta-button">Access Node Dashboard</button>
          </Link>
        </section>
      </main>
    </div>
  )
}

export default LandingPage
