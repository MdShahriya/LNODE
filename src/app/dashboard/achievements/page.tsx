'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import "./achievements.css"

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
  const router = useRouter()

  const updateAchievementProgress = (id: string, newProgress: number) => {
    setAchievements(prevAchievements => {
      return prevAchievements.map(achievement => {
        if (achievement.id === id) {
          const updated = {
            ...achievement,
            progress: Math.min(newProgress, achievement.target),
            completed: newProgress >= achievement.target
          }
          return updated
        }
        return achievement
      })
    })
  }

  const [achievements, setAchievements] = useState<Achievement[]>([
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
    if (!isConnected) {
      router.push('/')
    }
  }, [isConnected, router])

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Achievements</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievements.map(achievement => {
            const progressPercentage = (achievement.progress / achievement.target) * 100
            
            return (
              <div key={achievement.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold">{achievement.title}</h3>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {achievement.reward} pts
                  </span>
                </div>
                
                <p className="text-gray-600 mb-4">{achievement.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{achievement.progress} / {achievement.target}</span>
                    <span>{progressPercentage.toFixed(0)}%</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${achievement.completed ? 'bg-green-500' : 'bg-blue-500'}`}
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