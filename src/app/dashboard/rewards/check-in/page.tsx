'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import './check-in.css'

interface CheckInStats {
  lastCheckIn: string | null
  currentStreak: number
  longestStreak: number
  totalCheckIns: number
  totalPointsEarned: number
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 12
    }
  }
}

export default function DailyCheckIn() {
  const { address, isConnected } = useAccount()
  const [checkInStats, setCheckInStats] = useState<CheckInStats>({
    lastCheckIn: null,
    currentStreak: 0,
    longestStreak: 0,
    totalCheckIns: 0,
    totalPointsEarned: 0
  })
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [canCheckInToday, setCanCheckInToday] = useState(false)
  
  // Check if user can check in today
  const checkIfCanCheckInToday = useCallback((lastCheckIn: string | null) => {
    if (!lastCheckIn) return true
    
    const lastDate = new Date(lastCheckIn)
    const today = new Date()
    
    // Reset hours to compare just the dates
    lastDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    
    // Can check in if last check-in was before today
    return lastDate.getTime() < today.getTime()
  }, [])
  
  // Fetch check-in data
  const fetchCheckInData = useCallback(async () => {
    if (!address || !isConnected) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/user/check-in?walletAddress=${address}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch check-in data')
      }
      
      const data = await response.json()
      setCheckInStats(data.stats)
      setCanCheckInToday(checkIfCanCheckInToday(data.stats.lastCheckIn))
    } catch (error) {
      console.error('Error fetching check-in data:', error)
      toast.error('Failed to load check-in data')
    } finally {
      setLoading(false)
    }
  }, [address, isConnected, checkIfCanCheckInToday])
  
  // Perform daily check-in
  const performCheckIn = async () => {
    if (!address || !isConnected || checkingIn || !canCheckInToday) return
    
    try {
      setCheckingIn(true)
      const response = await fetch('/api/user/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to check in')
      }
      
      const data = await response.json()
      
      // Update local state with new data
      setCheckInStats(data.stats)
      setCanCheckInToday(false)
      
      // Show success message with points earned
      toast.success(`Check-in successful! You earned ${data.checkIn.points} points!`)
    } catch (error) {
      console.error('Error checking in:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to check in')
    } finally {
      setCheckingIn(false)
    }
  }
  
  useEffect(() => {
    if (isConnected && address) {
      fetchCheckInData()
    }
  }, [isConnected, address, fetchCheckInData])
  
  // Daily rewards data
  const dailyRewards = [
    { day: 1, points: 250 },
    { day: 2, points: 500 },
    { day: 3, points: 750 },
    { day: 4, points: 1000 },
    { day: 5, points: 1250 },
    { day: 6, points: 1500 },
    { day: 7, points: 1750 }
  ]
  
  if (!isConnected) {
    return (
      <div className="check-in">
        <div className="check-in__container">
          <motion.h1 
            className="check-in__title"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Daily Check
          </motion.h1>
          <motion.div 
            className="check-in__message"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Please connect your wallet to access the daily check-in feature.
          </motion.div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="check-in">
      <div className="check-in__container">
        <motion.h1 
          className="check-in__title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Daily Check
        </motion.h1>
        
        {loading ? (
          <motion.div 
            className="check-in__loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="check-in__loading-spinner"></div>
            <p>Loading check-in data...</p>
          </motion.div>
        ) : (
          <motion.div 
            className="check-in__calendar"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="check-in__calendar-header">
              <button 
                className={`check-in__button ${!canCheckInToday ? 'check-in__button--disabled' : ''}`}
                onClick={performCheckIn}
                disabled={!canCheckInToday || checkingIn}
              >
                {checkingIn ? 'CHECKING...' : 'CHECK'}
              </button>
            </div>
            
            <div className="check-in__calendar-days">
              {dailyRewards.map((reward, index) => (
                <div 
                  key={index} 
                  className={`check-in__day ${checkInStats.currentStreak >= reward.day ? 'check-in__day--active' : ''}`}
                >
                  <div className="check-in__day-label">DAY {reward.day}</div>
                  <div className="check-in__day-points">{reward.points} pt</div>
                </div>
              ))}
            </div>
            
            {!canCheckInToday && checkInStats.lastCheckIn && (
              <p className="check-in__next-time">
                You&apos;ve already checked in today. Come back tomorrow!
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}