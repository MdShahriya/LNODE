'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import "./referral.css"

interface ReferralStats {
  totalReferrals: number
  activeReferrals: number
  pointsEarned: number
  referralLink: string
}

interface ReferralHistory {
  address: string
  date: string
  status: 'active' | 'pending'
  pointsEarned: number
}

export default function ReferralProgram() {
  const { address, isConnected } = useAccount()
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    pointsEarned: 0,
    referralLink: ''
  })
  const [history, setHistory] = useState<ReferralHistory[]>([])
  const [loading, setLoading] = useState(false)

  const fetchReferralData = useCallback(async () => {
    if (!address || !isConnected) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/referral?walletAddress=${address}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch referral data')
      }
      
      const data = await response.json()
      setStats(data.stats)
      setHistory(data.history)
    } catch (error) {
      console.error('Error fetching referral data:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch referral data')
    } finally {
      setLoading(false)
    }
  }, [address, isConnected])


  useEffect(() => {
    if (isConnected && address) {
      fetchReferralData()
    }
  }, [isConnected, address, fetchReferralData])

  const copyReferralLink = () => {
    if (stats.referralLink) {
      navigator.clipboard.writeText(stats.referralLink)
      toast.success('Referral link copied to clipboard!')
    }
  }

  if (!isConnected) {
    return (
      <div className="referral">
        <div className="referral__container">
          <h1 className="referral__title">Referral Program</h1>
          <div className="referral__message">
            Please connect your wallet to view your referral data.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="referral">
      <div className="referral__container">
        <h1 className="referral__title">Referral Program</h1>

        {loading ? (
          <div className="referral__loading">
            <div className="referral__loading-spinner"></div>
            <p>Loading referral data...</p>
          </div>
        ) : (
          <>
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
                <h3 className="referral__stat-title">Your Referral Link</h3>
                <div className="referral__code-group">
                  <code className="referral__code">
                    {stats.referralLink || 'Generating...'}
                  </code>
                  {stats.referralLink && (
                    <button
                      onClick={copyReferralLink}
                      className="referral__copy-btn"
                      title="Copy referral link"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* History */}
            <div className="referral__history">
              <h2 className="referral__history-title">Referral History</h2>
              {history.length === 0 ? (
                <div className="referral__empty-message">
                  No referrals yet. Share your referral link to start earning!
                </div>
              ) : (
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
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
