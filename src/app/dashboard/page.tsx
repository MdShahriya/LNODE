'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import "./dashboard.css"

interface NodeStats {
  uptime: number
  points: number
  tasksCompleted: number
}

export default function Dashboard() {
  const { isConnected } = useAccount()
  const router = useRouter()
  const [nodeStats, setNodeStats] = useState<NodeStats>({
    uptime: 0,
    points: 0,
    tasksCompleted: 0
  })
  const [isNodeRunning, setIsNodeRunning] = useState(false)

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
    }
  }, [isConnected, router])

  const toggleNode = () => {
    setIsNodeRunning(!isNodeRunning)
    // Here we'll implement the node simulation logic
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold">Uptime</h3>
            <p className="text-3xl font-bold">{nodeStats.uptime}h</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold">Points Earned</h3>
            <p className="text-3xl font-bold">{nodeStats.points}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold">Tasks Completed</h3>
            <p className="text-3xl font-bold">{nodeStats.tasksCompleted}</p>
          </div>
        </div>

        {/* Node Control */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Node Control</h2>
          <button
            onClick={toggleNode}
            className={`px-6 py-3 rounded-lg font-semibold ${isNodeRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white transition-colors`}
          >
            {isNodeRunning ? 'Stop Node' : 'Start Node'}
          </button>
        </div>
      </div>
    </main>
  )
}