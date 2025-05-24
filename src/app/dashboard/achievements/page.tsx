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
    }
  }, [isConnected, address, fetchAchievements])

  return (
    <div className="achievements">
      <div className="achievements__container">
        <h1 className="achievements__title">Achievements</h1>

        {loading ? (
          <div className="achievements__loading">Loading achievements data...</div>
        ) : error ? (
          <div className="achievements__error">{error}</div>
        ) : (
          <div className="achievements__grid">
            {achievements.length === 0 ? (
              <div className="achievements__empty">No achievements data available yet.</div>
            ) : (
              achievements.map((achievement) => {
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
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
