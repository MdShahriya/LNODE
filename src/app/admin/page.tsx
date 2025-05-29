'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import "./admin.css"

interface AdminStats {
  totalUsers: number
  activeTasks: number
  completedTasks: number
  totalPoints: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeTasks: 0,
    completedTasks: 0,
    totalPoints: 0
  })
  const [loading, setLoading] = useState(true)

  // Fetch admin dashboard stats
  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/stats')
      
      if (!response.ok) {
        throw new Error('Failed to fetch admin statistics')
      }
      
      const data = await response.json()
      setStats(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching admin stats:', error)
      toast.error('Failed to load admin statistics')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="admin-page">
      <div className="admin-container">
        <h1 className="admin-heading">Admin Dashboard</h1>
        <p className="admin-subheading">Manage your TOPAY platform</p>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading-spinner"></div>
            <p>Loading statistics...</p>
          </div>
        ) : (
          <>
            <div className="admin-grid">
              <div className="admin-stats">
                <h3 className="admin-stats__title">Total Users</h3>
                <p className="admin-stats__value">{stats.totalUsers}</p>
              </div>
              <div className="admin-stats">
                <h3 className="admin-stats__title">Active Tasks</h3>
                <p className="admin-stats__value">{stats.activeTasks}</p>
              </div>
              <div className="admin-stats">
                <h3 className="admin-stats__title">Completed Tasks</h3>
                <p className="admin-stats__value">{stats.completedTasks}</p>
              </div>
              <div className="admin-stats">
                <h3 className="admin-stats__title">Total Points Awarded</h3>
                <p className="admin-stats__value">{stats.totalPoints}</p>
              </div>
            </div>
            <div className="admin-card">
              <h2 className="admin-card__title">Recent Activity</h2>
              <p>No recent activity to display.</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}