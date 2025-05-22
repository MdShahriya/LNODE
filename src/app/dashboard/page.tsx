'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import './dashboard.css'

interface NodeStats {
  uptime: number
  points: number
  tasksCompleted: number
}

interface User {
  walletAddress: string
  points: number
  tasksCompleted: number
  uptime: number
  createdAt: string
  updatedAt: string
}

export default function Dashboard() {
  const { address, isConnected } = useAccount()
  const [nodeStats, setNodeStats] = useState<NodeStats>({
    uptime: 0,
    points: 0,
    tasksCompleted: 0
  })
  const [isNodeRunning, setIsNodeRunning] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isConnected || !address) return
    
    const registerOrFetchUser = async () => {
      try {
        setLoading(true)
        // Try to fetch existing user first
        const response = await fetch(`/api/user?walletAddress=${address}`)
        
        if (response.status === 404) {
          // User doesn't exist, create a new one
          const createResponse = await fetch('/api/user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ walletAddress: address }),
          })
          
          if (createResponse.ok) {
            const data = await createResponse.json()
            setUser(data.user)
            setNodeStats({
              uptime: data.user.uptime,
              points: data.user.points,
              tasksCompleted: data.user.tasksCompleted
            })
          }
        } else if (response.ok) {
          // User exists
          const data = await response.json()
          setUser(data.user)
          setNodeStats({
            uptime: data.user.uptime,
            points: data.user.points,
            tasksCompleted: data.user.tasksCompleted
          })
        }
      } catch (error) {
        console.error('Error registering/fetching user:', error)
      } finally {
        setLoading(false)
      }
    }
    
    registerOrFetchUser()
  }, [isConnected, address])

  const toggleNode = async () => {
    const newStatus = !isNodeRunning
    setIsNodeRunning(newStatus)
    
    // Only update if user exists and is connected
    if (user && address) {
      try {
        // In a real application, you would have a more sophisticated
        // way to track uptime, but for demo purposes we'll just
        // increment uptime when node is started
        if (newStatus) {
          // Update user stats when node is started
          const response = await fetch('/api/user/update-node-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              walletAddress: address,
              isRunning: newStatus
            }),
          })
          
          if (response.ok) {
            console.log('Node status updated in database')
          }
        }
      } catch (error) {
        console.error('Error updating node status:', error)
      }
    }
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">

        <h1 className="dashboard-heading">Node Operator Dashboard</h1>
        <p className="dashboard-subheading">Monitor your node&apos;s performance and manage uptime in real-time.</p>

        {!isConnected ? (
          <div className="alert-message">
            <p>Please connect your wallet to access your dashboard.</p>
          </div>
        ) : loading ? (
          <div className="loading-container">
            <p>Loading your node data...</p>
          </div>
        ) : (
          <>
            {/* User Welcome Message */}
            {user && (
              <div className="user-welcome">
                <p>Welcome, <span className="wallet-address">{user.walletAddress.substring(0, 6)}...{user.walletAddress.substring(user.walletAddress.length - 4)}</span></p>
              </div>
            )}

            {/* Node Stats */}
            <div className="stats-grid">
              <div className="stats-card">
                <h3 className="stats-title">Total Uptime</h3>
                <p className="stats-value">{nodeStats.uptime}h</p>
                <span className="stats-label">Tracked uptime while node is active</span>
              </div>
              <div className="stats-card">
                <h3 className="stats-title">Points Earned</h3>
                <p className="stats-value">{nodeStats.points}</p>
                <span className="stats-label">Earned through uptime & task completion</span>
              </div>
              <div className="stats-card">
                <h3 className="stats-title">Tasks Completed</h3>
                <p className="stats-value">{nodeStats.tasksCompleted}</p>
                <span className="stats-label">Total tasks processed by your node</span>
              </div>
            </div>

            {/* Node Control */}
            <div className="node-control-card">
              <h2 className="node-control-title">Node Status</h2>
              <p className={`node-status ${isNodeRunning ? 'running' : 'stopped'}`}>
                {isNodeRunning ? '🟢 Running' : '🔴 Stopped'}
              </p>
              <button
                onClick={toggleNode}
                className={`node-toggle-button ${isNodeRunning ? 'stop' : 'start'}`}
              >
                {isNodeRunning ? 'Stop Node' : 'Start Node'}
              </button>
            </div>
          </>
        )}

      </div>
    </main>
  )
}
