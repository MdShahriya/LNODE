'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
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

  // Container variants for staggered children animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  // Card variants for individual card animations
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  }

  // Row variants for table row animations
  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 100 } }
  }

  if (!isConnected) {
    return (
      <div className="referral">
        <div className="referral__container">
          <motion.h1 
            className="referral__title"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Referral Program
          </motion.h1>
          <motion.div 
            className="referral__message"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Please connect your wallet to view your referral data.
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="referral">
      <div className="referral__container">
        <motion.h1 
          className="referral__title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Referral Program
        </motion.h1>

        {loading ? (
          <motion.div 
            className="referral__loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="referral__loading-spinner"></div>
            <p>Loading referral data...</p>
          </motion.div>
        ) : (
          <>
            {/* Stats */}
            <motion.div 
              className="referral__stats-grid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div className="referral__stat-card" variants={cardVariants}>
                <h3 className="referral__stat-title">Total Referrals</h3>
                <motion.p 
                  className="referral__stat-value"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                >
                  {stats.totalReferrals}
                </motion.p>
              </motion.div>
              <motion.div className="referral__stat-card" variants={cardVariants}>
                <h3 className="referral__stat-title">Active Referrals</h3>
                <motion.p 
                  className="referral__stat-value"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                >
                  {stats.activeReferrals}
                </motion.p>
              </motion.div>
              <motion.div className="referral__stat-card" variants={cardVariants}>
                <h3 className="referral__stat-title">Points Earned</h3>
                <motion.p 
                  className="referral__stat-value"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                >
                  {stats.pointsEarned}
                </motion.p>
              </motion.div>
              <motion.div className="referral__stat-card" variants={cardVariants}>
                <h3 className="referral__stat-title">Your Referral Link</h3>
                <div className="referral__code-group">
                  <motion.code 
                    className="referral__code"
                    whileHover={{ scale: 1.02 }}
                  >
                    {stats.referralLink || 'Generating...'}
                  </motion.code>
                  {stats.referralLink && (
                    <motion.button
                      onClick={copyReferralLink}
                      className="referral__copy-btn"
                      title="Copy referral link"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      📋
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </motion.div>

            {/* History */}
            <motion.div 
              className="referral__history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h2 className="referral__history-title">Referral History</h2>
              {history.length === 0 ? (
                <motion.div 
                  className="referral__empty-message"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  No referrals yet. Share your referral link to start earning!
                </motion.div>
              ) : (
                <table className="referral__history-table">
                  <thead>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
                      <th>Address</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Points</th>
                    </motion.tr>
                  </thead>
                  <motion.tbody
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {history.map((entry, index) => (
                      <motion.tr 
                        key={index}
                        variants={rowVariants}
                        whileHover={{ scale: 1.01, x: 5 }}
                      >
                        <td>{entry.address}</td>
                        <td>{entry.date}</td>
                        <td>
                          <motion.span 
                            className={`referral__status referral__status--${entry.status}`}
                            whileHover={{ scale: 1.1 }}
                          >
                            {entry.status}
                          </motion.span>
                        </td>
                        <td>
                          <motion.span
                            whileHover={{ scale: 1.1 }}
                            style={{ display: 'inline-block' }}
                          >
                            {entry.pointsEarned}
                          </motion.span>
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  )
}
