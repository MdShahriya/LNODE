'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import "./tasks.css"

interface Task {
  id: string
  title: string
  description: string
  rewards: {
    points: number
    tokens?: number
  }
  requirements: string[]
  status: 'available' | 'in_progress' | 'completed'
}

export default function TaskCenter() {
  const { isConnected } = useAccount()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Maintain Node Uptime',
      description: 'Keep your node running for 24 hours straight',
      rewards: {
        points: 100,
        tokens: 10
      },
      requirements: ['Node must be active', 'Wallet must be connected'],
      status: 'available'
    },
    {
      id: '2',
      title: 'Complete Profile',
      description: 'Fill out all profile information',
      rewards: {
        points: 50
      },
      requirements: ['Wallet connection'],
      status: 'available'
    }
  ])

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
    }
  }, [isConnected, router])

  const startTask = (taskId: string) => {
    setTasks(tasks.map(task =>
      task.id === taskId
        ? { ...task, status: 'in_progress' as const }
        : task
    ))
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Task Center</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tasks.map(task => (
            <div key={task.id} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-2">{task.title}</h3>
              <p className="text-gray-600 mb-4">{task.description}</p>
              
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Requirements:</h4>
                <ul className="list-disc list-inside">
                  {task.requirements.map((req, index) => (
                    <li key={index} className="text-gray-600">{req}</li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold mb-2">Rewards:</h4>
                <div className="flex space-x-4">
                  <span className="text-green-600">{task.rewards.points} Points</span>
                  {task.rewards.tokens && (
                    <span className="text-blue-600">{task.rewards.tokens} Tokens</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => startTask(task.id)}
                disabled={task.status !== 'available'}
                className={`px-4 py-2 rounded-lg font-semibold ${task.status === 'available' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'} transition-colors`}
              >
                {task.status === 'available' ? 'Start Task' : task.status === 'in_progress' ? 'In Progress' : 'Completed'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}