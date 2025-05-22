'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
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
  const { isConnected } = useAccount()

  const [achievements] = useState<Achievement[]>([
    {
      id: '1',
      title: 'Node Master',
      description: 'Maintain node uptime for 100 hours',
      reward: 500,
      progress: 45,
      target: 100,
      completed: false
    },
    {
      id: '2',
      title: 'Task Champion',
      description: 'Complete 50 tasks',
      reward: 1000,
      progress: 25,
      target: 50,
      completed: false
    },
    {
      id: '3',
      title: 'Community Builder',
      description: 'Refer 10 new users',
      reward: 750,
      progress: 3,
      target: 10,
      completed: false
    }
  ])

  useEffect(() => {
    if (!isConnected) return
  }, [isConnected])

  return (
    <div className="achievements">
      <div className="achievements__container">
        <h1 className="achievements__title">Achievements</h1>

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
      </div>
    </div>
  )
}
