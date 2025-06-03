'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import './check-in.css'

interface CheckInHistory {
  date: string
  points: number
  streak: number
}

interface CheckInStats {
  lastCheckIn: string | null
  currentStreak: number
  longestStreak: number
  totalCheckIns: number
  totalPointsEarned: number
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
  const [history, setHistory] = useState<CheckInHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [canCheckInToday, setCanCheckInToday] = useState(false)
  
  // Calculate points based on streak
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }
  
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
      setHistory(data.history || [])
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
      setHistory(data.history || [])
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
  
  if (!isConnected) {
    return (
      <div className="check-in">
        <div className="check-in__container">
          <h1 className="check-in__title">Daily Check-In</h1>
          <div className="check-in__message">
            Please connect your wallet to access the daily check-in feature.
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="check-in">
      <div className="check-in__container">
        <h1 className="check-in__title">Daily Check-In</h1>
        <p className="check-in__description">
          Check in daily to earn points and build your streak. Longer streaks earn bonus points!
        </p>
        
        {loading ? (
          <div className="check-in__loading">
            <div className="check-in__loading-spinner"></div>
            <p>Loading check-in data...</p>
          </div>
        ) : (
          <>
            {/* Check-in Button */}
            <div className="check-in__action">
              <button 
                className={`check-in__button ${!canCheckInToday ? 'check-in__button--disabled' : ''}`}
                onClick={performCheckIn}
                disabled={!canCheckInToday || checkingIn}
              >
                {checkingIn ? 'Checking in...' : 
                 canCheckInToday ? 'Check In Now' : 'Already Checked In Today'}
              </button>
              
              {!canCheckInToday && checkInStats.lastCheckIn && (
                <p className="check-in__next-time">
                  You&apos;ve already checked in today. Come back tomorrow!
                </p>
              )}
            </div>
            
            {/* Stats */}
            <div className="check-in__stats-grid">
              <div className="check-in__stat-card">
                <h3 className="check-in__stat-title">Current Streak</h3>
                <p className="check-in__stat-value">{checkInStats.currentStreak} days</p>
              </div>
              <div className="check-in__stat-card">
                <h3 className="check-in__stat-title">Longest Streak</h3>
                <p className="check-in__stat-value">{checkInStats.longestStreak} days</p>
              </div>
              <div className="check-in__stat-card">
                <h3 className="check-in__stat-title">Total Check-ins</h3>
                <p className="check-in__stat-value">{checkInStats.totalCheckIns}</p>
              </div>
              <div className="check-in__stat-card">
                <h3 className="check-in__stat-title">Points Earned</h3>
                <p className="check-in__stat-value">{checkInStats.totalPointsEarned}</p>
              </div>
            </div>
            
            {/* Rewards Info */}
            <div className="check-in__rewards-info">
              <h2 className="check-in__rewards-title">Streak Rewards</h2>
              <div className="check-in__rewards-grid">
                <div className="check-in__reward-item">
                  <div className="check-in__reward-icon">🔄</div>
                  <div className="check-in__reward-details">
                    <h4>Daily Check-in</h4>
                    <p>100 points</p>
                  </div>
                </div>
                <div className="check-in__reward-item">
                  <div className="check-in__reward-icon">🔥</div>
                  <div className="check-in__reward-details">
                    <h4>3-Day Streak</h4>
                    <p>+500 bonus points</p>
                  </div>
                </div>
                <div className="check-in__reward-item">
                  <div className="check-in__reward-icon">⚡</div>
                  <div className="check-in__reward-details">
                    <h4>7-Day Streak</h4>
                    <p>+2000 bonus points</p>
                  </div>
                </div>
                <div className="check-in__reward-item">
                  <div className="check-in__reward-icon">🌟</div>
                  <div className="check-in__reward-details">
                    <h4>30-Day Streak</h4>
                    <p>+50000 bonus points</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* History */}
            <div className="check-in__history">
              <h2 className="check-in__history-title">Check-in History</h2>
              {history.length === 0 ? (
                <div className="check-in__empty-message">
                  No check-in history yet. Start checking in daily!
                </div>
              ) : (
                <div className="check-in__history-list">
                  {history.map((entry, index) => (
                    <div key={index} className="check-in__history-item">
                      <div className="check-in__history-date">{formatDate(entry.date)}</div>
                      <div className="check-in__history-streak">{entry.streak} day streak</div>
                      <div className="check-in__history-points">+{entry.points} pts</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}