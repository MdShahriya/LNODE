'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import ConfirmationModal from '../../../../components/ConfirmationModal'
import './lottery.css'

interface LotteryWinner {
  id: string
  date: string
  walletAddress: string
  username: string | null
  prize: number
}

interface LotteryResponse {
  winners: LotteryWinner[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

export default function LotteryWinners() {
  const router = useRouter()
  const { address } = useAccount()
  const [todaysWinner, setTodaysWinner] = useState<LotteryWinner | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState<boolean>(false)
  const [verificationLoading, setVerificationLoading] = useState<boolean>(true)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [actionToConfirm, setActionToConfirm] = useState<(() => void) | null>(null)

  // Check if a date is today
  const isToday = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Handle confirmation
  const handleConfirm = () => {
    if (actionToConfirm) {
      actionToConfirm()
    }
    setShowConfirmModal(false)
    setActionToConfirm(null)
  }

  // Handle cancel
  const handleCancel = () => {
    setShowConfirmModal(false)
    setActionToConfirm(null)
  }

  // Fetch today's lottery winner from API
  const fetchTodaysWinner = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch all winners and filter for today on frontend
      const response = await fetch('/api/lottery/winners?page=1&limit=100')
      
      if (!response.ok) {
        throw new Error('Failed to fetch lottery winners')
      }
      
      const data: LotteryResponse = await response.json()
      
      // Find today's winner (should be only one)
      const todaysWinner = data.winners.find(winner => isToday(winner.date))
      setTodaysWinner(todaysWinner || null)
    } catch (err) {
      console.error('Error fetching lottery winner:', err)
      setError('Failed to load today\'s lottery winner. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch user verification status
  const fetchVerificationStatus = useCallback(async () => {
    if (!address) {
      setVerificationLoading(false)
      setIsVerified(false)
      return
    }

    try {
      setVerificationLoading(true)
      const response = await fetch(`/api/user?walletAddress=${address}`)
      
      if (response.ok) {
        const userData = await response.json()
        // Check if user verification status is 'verified'
        const userVerification = userData.user?.verification
        const isUserVerified = userVerification === 'verified'
        setIsVerified(isUserVerified)
      } else {
        // If API fails, assume unverified to show verification prompt
        setIsVerified(false)
      }
    } catch (err) {
      console.error('Error fetching verification status:', err)
      // If API fails, assume unverified to show verification prompt
      setIsVerified(false)
    } finally {
      setVerificationLoading(false)
    }
  }, [address])

  // Load today's winner and verification status on component mount
  useEffect(() => {
    fetchTodaysWinner()
    fetchVerificationStatus()
  }, [fetchTodaysWinner, fetchVerificationStatus])

  // Format wallet address for display
  const formatWalletAddress = (address: string) => {
    if (!address) return 'Unknown'
    return `${address.slice(0, 8)}...${address.slice(-6)}`
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }



  // Get current date for display
  const getCurrentDate = () => {
    const today = new Date()
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="lottery-winners">
      <div className="lottery-winners__container">
        <motion.div 
          className="lottery-winners__header"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="lottery-winners__title">
            Daily Lottery Winner
          </h1>
          <p className="lottery-winners__date">
            {getCurrentDate()}
          </p>
        </motion.div>

        {/* Verification Section - Only show for unverified users */}
        {!verificationLoading && isVerified === false && (
          <motion.div 
            className="lottery-winners__verification"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="lottery-winners__verification-card">
              <div className="lottery-winners__verification-icon">🔐</div>
              <h3 className="lottery-winners__verification-title">
                Verify to Participate!
              </h3>
              <p className="lottery-winners__verification-text">
                Complete your profile verification to be eligible for the daily lottery draw.
              </p>
              <button 
                onClick={() => router.push('/dashboard/profile/verify')}
                className="lottery-winners__verify-btn"
              >
                Verify Now
              </button>
            </div>
          </motion.div>
        )}

        {loading && (
          <motion.div 
            className="lottery-winners__loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="lottery-winners__loading-spinner"></div>
            <p>Loading today&apos;s winner...</p>
          </motion.div>
        )}

        {error && (
          <motion.div 
            className="lottery-winners__error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="lottery-winners__error-icon">⚠️</div>
            <h3>Oops! Something went wrong</h3>
            <p>{error}</p>
            <button 
              onClick={fetchTodaysWinner}
              className="lottery-winners__retry-btn"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {!loading && !error && !todaysWinner && (
          <motion.div 
            className="lottery-winners__no-winner"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="lottery-winners__no-winner-icon">🎲</div>
            <h3>No Winner Yet Today!</h3>
            <p>The daily draw hasn&apos;t happened yet.</p>
            <p className="lottery-winners__no-winner-subtitle">
              Check back later to see today&apos;s lucky winner!
            </p>
          </motion.div>
        )}

        {!loading && !error && todaysWinner && (
          <motion.div
            className="winner-hero"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="winner-hero__crown">
              <span className="winner-hero__crown-icon">👑</span>
            </div>
            
            <motion.div 
              className="winner-hero__avatar"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4, type: "spring", stiffness: 200 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                width={120}
                height={120}
                src={`https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${todaysWinner.walletAddress}`} 
                alt="Winner Avatar" 
                className="winner-hero__avatar-image"
              />
            </motion.div>

            <motion.div 
              className="winner-hero__info"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <h2 className="winner-hero__name">
                {todaysWinner.username || 'Anonymous Winner'}
              </h2>
              <p className="winner-hero__title">🏆 Today&apos;s Winner </p>
            </motion.div>

            <motion.div 
              className="winner-hero__details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="winner-hero__detail-card">
                <div className="winner-hero__detail-item">
                  <span className="winner-hero__detail-label">🗓️ Date Won</span>
                  <span className="winner-hero__detail-value">
                    {formatDate(todaysWinner.date)}
                  </span>
                </div>
                
                <div className="winner-hero__detail-item">
                  <span className="winner-hero__detail-label">💳 Wallet Address</span>
                  <span className="winner-hero__detail-value winner-hero__wallet">
                    {formatWalletAddress(todaysWinner.walletAddress)}
                  </span>
                </div>
                
                <div className="winner-hero__detail-item">
                  <span className="winner-hero__detail-label">🎫 Winner ID</span>
                  <span className="winner-hero__detail-value">
                    #{todaysWinner.id.slice(-8).toUpperCase()}
                  </span>
                </div>
                
                <div className="winner-hero__detail-item">
                  <span className="winner-hero__detail-label">💰 Prize Amount</span>
                  <span className="winner-hero__detail-value winner-hero__prize">
                    ${todaysWinner?.prize || 0}
                  </span>
                </div>
                
                <div className="winner-hero__detail-item">
                  <span className="winner-hero__detail-label">✅ Status</span>
                  <span className="winner-hero__detail-value winner-hero__status">
                    Confirmed Winner
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="winner-hero__celebration"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1 }}
            >
              <p className="winner-hero__congratulations">
                🎊 Congratulations on your lottery win! 🎊
              </p>
            </motion.div>
          </motion.div>
        )}
      </div>
      
      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Confirm Action"
        message="Are you sure you want to proceed with this action?"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  )
}