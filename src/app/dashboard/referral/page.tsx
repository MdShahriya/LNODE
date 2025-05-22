'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import "./referral.css"

interface ReferralStats {
  totalReferrals: number
  activeReferrals: number
  pointsEarned: number
  referralCode: string
}

interface ReferralHistory {
  address: string
  date: string
  status: 'active' | 'pending'
  pointsEarned: number
}

export default function ReferralProgram() {
  const { isConnected } = useAccount()
  const [stats] = useState<ReferralStats>({
    totalReferrals: 5,
    activeReferrals: 3,
    pointsEarned: 750,
    referralCode: 'TOPAY123'
  })

  const [history] = useState<ReferralHistory[]>([
    {
      address: '0x1234...5678',
      date: '2024-03-15',
      status: 'active',
      pointsEarned: 250
    },
    {
      address: '0x8765...4321',
      date: '2024-03-14',
      status: 'pending',
      pointsEarned: 0
    }
  ])

  useEffect(() => {
    if (!isConnected) return
  }, [isConnected])

  const copyReferralCode = () => {
    navigator.clipboard.writeText(stats.referralCode)
  }

  return (
    <div className="referral">
      <div className="referral__container">
        <h1 className="referral__title">Referral Program</h1>

        {/* Stats */}
        <div className="referral__stats-grid">
          <div className="referral__stat-card">
            <h3 className="referral__stat-title">Total Referrals</h3>
            <p className="referral__stat-value">{stats.totalReferrals}</p>
          </div>
          <div className="referral__stat-card">
            <h3 className="referral__stat-title">Active Referrals</h3>
            <p className="referral__stat-value">{stats.activeReferrals}</p>
          </div>
          <div className="referral__stat-card">
            <h3 className="referral__stat-title">Points Earned</h3>
            <p className="referral__stat-value">{stats.pointsEarned}</p>
          </div>
          <div className="referral__stat-card">
            <h3 className="referral__stat-title">Your Referral Code</h3>
            <div className="referral__code-group">
              <code className="referral__code">{stats.referralCode}</code>
              <button
                onClick={copyReferralCode}
                className="referral__copy-btn"
                title="Copy referral code"
              >
                📋
              </button>
            </div>
          </div>
        </div>

        {/* History */}
        <div className="referral__history">
          <h2 className="referral__history-title">Referral History</h2>
          <table className="referral__history-table">
            <thead>
              <tr>
                <th>Address</th>
                <th>Date</th>
                <th>Status</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry, index) => (
                <tr key={index}>
                  <td>{entry.address}</td>
                  <td>{entry.date}</td>
                  <td>
                    <span className={`referral__status referral__status--${entry.status}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td>{entry.pointsEarned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
