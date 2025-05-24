'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
      // This would be replaced with an actual API call in a real implementation
      // const response = await fetch('/api/admin/stats')
      // const data = await response.json()
      // setStats(data)
      
      // For now, we'll use mock data
      setTimeout(() => {
        setStats({
          totalUsers: 125,
          activeTasks: 5,
          completedTasks: 350,
          totalPoints: 15000
        })
        setLoading(false)
      }, 1000)
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
              <h2 className="admin-card__title">Quick Actions</h2>
              <div className="admin-actions">
                <Link href="/admin/tasks" className="admin-button admin-button--primary">
                  Manage Tasks
                </Link>
                <Link href="/admin/usersmanagment" className="admin-button admin-button--secondary">
                  Manage Users
                </Link>
                <Link href="/admin/achievements" className="admin-button admin-button--secondary">
                  Manage Achievements
                </Link>
                <Link href="/admin/opinionfund" className="admin-button admin-button--secondary">
                  Opinion Fund
                </Link>
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