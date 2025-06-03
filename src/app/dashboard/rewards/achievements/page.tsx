'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState, useCallback } from 'react'
import './achievements.css'

interface Achievement {
  id: string
  title: string
  description: string
  reward: number
  progress: number
  target: number
  completed: boolean
}

export default function Achievements() {
  const { isConnected, address } = useAccount()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAchievements = useCallback(async () => {
    if (!address) return
    
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/achievements?walletAddress=${address}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch achievements data')
      }
      
      const data = await response.json()
      // Extract the achievements array from the response
      setAchievements(data.achievements || [])
    } catch (err) {
      console.error('Error fetching achievements:', err)
      setError('Failed to load achievements data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    if (isConnected && address) {
      fetchAchievements()
    } else {
      // Reset state when wallet is disconnected
      setAchievements([])
      setLoading(false)
      setError(null)
    }
  }, [isConnected, address, fetchAchievements])

  // Debug logging
  console.log('Render state:', { isConnected, loading, error, achievementsCount: achievements.length })
  
  if (!isConnected) {
    return (
      <div className="achievements">
        <h1 className="achievements__title">Achievements</h1>
        <div className="achievements__message">Please connect your wallet to view your achievements.</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="achievements">
        <h1 className="achievements__title">Achievements</h1>
        <div className="achievements__message">Loading achievements data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="achievements">
        <h1 className="achievements__title">Achievements</h1>
        <div className="achievements__message achievements__error">{error}</div>
      </div>
    )
  }

  return (
    <div className="achievements">
      <h1 className="achievements__title">Achievements</h1>
      
      {achievements.length === 0 ? (
        <div className="achievements__message">No achievements data available yet.</div>
      ) : (
        <div className="achievements__grid">
          {achievements.map((achievement) => {
            const progressPercentage = (achievement.progress / achievement.target) * 100

            return (
              <div key={achievement.id} className="achievement-card">
                <div className="achievement-card__header">
                  <h3 className="achievement-card__title">{achievement.title}</h3>
                  <span className="achievement-card__reward">{achievement.reward} pts</span>
                </div>

                <p className="achievement-card__description">{achievement.description}</p>

                <div className="achievement-card__progress">
                  <div className="achievement-card__progress-info">
                    <span>{achievement.progress} / {achievement.target}</span>
                    <span>{progressPercentage.toFixed(0)}%</span>
                  </div>

                  <div className="achievement-card__progress-bar">
                    <div
                      className={`achievement-card__progress-fill ${achievement.completed ? 'completed' : 'in-progress'}`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
