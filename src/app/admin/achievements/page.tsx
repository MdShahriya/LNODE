'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import ConfirmationModal from '@/components/ConfirmationModal'
import './achievements.css'

interface Achievement {
  _id: string
  title: string
  description: string
  reward: number
  target: number
  isActive: boolean
}

export default function AdminAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<Omit<Achievement, '_id'>>({ 
    title: '',
    description: '',
    reward: 0,
    target: 0,
    isActive: true
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [achievementToDelete, setAchievementToDelete] = useState<Achievement | null>(null)

  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/achievements')
      
      if (!response.ok) {
        throw new Error('Failed to fetch achievements')
      }
      
      const data = await response.json()
      setAchievements(data.achievements || [])
    } catch (error) {
      console.error('Error fetching achievements:', error)
      toast.error('Failed to load achievements')
    } finally {
      setLoading(false)
    }
  }, [])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: parseInt(value) || 0
      })
    } else if (type === 'checkbox') {
      setFormData({
        ...formData,
        // @ts-expect-error - we know this is a checkbox input
        [name]: e.target.checked
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.description) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      if (editingId) {
        // Update existing achievement
        const response = await fetch(`/api/admin/achievements/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })

        if (!response.ok) {
          throw new Error('Failed to update achievement')
        }

        const updatedAchievement = await response.json()
        setAchievements(achievements.map(a => a._id === editingId ? updatedAchievement : a))
        toast.success('Achievement updated successfully')
      } else {
        // Create new achievement
        const response = await fetch('/api/admin/achievements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })

        if (!response.ok) {
          throw new Error('Failed to create achievement')
        }

        const newAchievement = await response.json()
        setAchievements([...achievements, newAchievement])
        toast.success('Achievement created successfully')
      }
      
      // Reset form
      setFormData({ 
        title: '',
        description: '',
        reward: 0,
        target: 0,
        isActive: true
      })
      setEditingId(null)
    } catch (error) {
      console.error('Error saving achievement:', error)
      toast.error('Failed to save achievement')
    }
  }

  // Handle edit achievement
  const handleEdit = (achievement: Achievement) => {
    setFormData({
      title: achievement.title,
      description: achievement.description,
      reward: achievement.reward,
      target: achievement.target,
      isActive: achievement.isActive
    })
    setEditingId(achievement._id)
  }

  // Handle delete achievement
  const handleDelete = async (achievement: Achievement) => {
    setAchievementToDelete(achievement)
    setShowConfirmModal(true)
  }

  const confirmDelete = async () => {
    if (!achievementToDelete) return
    
    try {
      const response = await fetch(`/api/admin/achievements/${achievementToDelete._id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete achievement')
      }
      
      setAchievements(achievements.filter(a => a._id !== achievementToDelete._id))
      toast.success('Achievement deleted successfully')
    } catch (error) {
      console.error('Error deleting achievement:', error)
      toast.error('Failed to delete achievement')
    } finally {
      setShowConfirmModal(false)
      setAchievementToDelete(null)
    }
  }

  // Handle toggle achievement status
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/achievements/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update achievement status')
      }

      setAchievements(achievements.map(a => {
        if (a._id === id) {
          return { ...a, isActive: !currentStatus }
        }
        return a
      }))
      toast.success(`Achievement ${currentStatus ? 'disabled' : 'enabled'} successfully`)
    } catch (error) {
      console.error('Error toggling achievement status:', error)
      toast.error('Failed to update achievement status')
    }
  }

  // Reset form
  const handleReset = () => {
    setFormData({ 
      title: '',
      description: '',
      reward: 0,
      target: 0,
      isActive: true
    })
    setEditingId(null)
  }

  useEffect(() => {
    fetchAchievements()
  }, [fetchAchievements])

  return (
    <div className="admin-achievements">
      <div className="admin-achievements__container">
        <h1 className="admin-achievements__title">Manage Achievements</h1>
        <p className="admin-achievements__subtitle">Create and manage achievements for users to earn</p>

        <div className="admin-achievements__form">
          <h2 className="admin-achievements__form-title">
            {editingId ? 'Edit Achievement' : 'Create New Achievement'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="admin-achievements__form-group">
              <label className="admin-achievements__form-label" htmlFor="title">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="admin-achievements__form-input"
                required
              />
            </div>

            <div className="admin-achievements__form-group">
              <label className="admin-achievements__form-label" htmlFor="description">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="admin-achievements__form-textarea"
                required
              />
            </div>

            <div className="admin-achievements__form-row">
              <div className="admin-achievements__form-col">
                <label className="admin-achievements__form-label" htmlFor="reward">
                  Reward Points *
                </label>
                <input
                  type="number"
                  id="reward"
                  name="reward"
                  value={formData.reward}
                  onChange={handleInputChange}
                  className="admin-achievements__form-input"
                  min="0"
                  required
                />
              </div>

              <div className="admin-achievements__form-col">
                <label className="admin-achievements__form-label" htmlFor="target">
                  Target Value *
                </label>
                <input
                  type="number"
                  id="target"
                  name="target"
                  value={formData.target}
                  onChange={handleInputChange}
                  className="admin-achievements__form-input"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="admin-achievements__form-group">
              <label className="admin-achievements__form-label">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                />
                {' '} Active
              </label>
            </div>

            <div className="admin-achievements__form-actions">
              <button
                type="button"
                onClick={handleReset}
                className="admin-button admin-button--secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="admin-button admin-button--primary"
              >
                {editingId ? 'Update Achievement' : 'Create Achievement'}
              </button>
            </div>
          </form>
        </div>

        <div className="admin-achievements__list">
          <h2 className="admin-achievements__list-title">Achievements List</h2>
          
          {loading ? (
            <div className="admin-achievements__loading">
              <div className="admin-achievements__loading-spinner"></div>
              <p>Loading achievements...</p>
            </div>
          ) : achievements.length === 0 ? (
            <p>No achievements found. Create your first achievement above.</p>
          ) : (
            <table className="admin-achievements__table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Reward</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {achievements.map((achievement) => (
                  <tr key={achievement._id}>
                    <td>{achievement.title}</td>
                    <td>{achievement.description}</td>
                    <td>{achievement.reward} points</td>
                    <td>{achievement.target}</td>
                    <td>
                      <span className={`status ${achievement.isActive ? 'active' : 'inactive'}`}>
                        {achievement.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-achievements__table-actions">
                        <button
                          onClick={() => handleEdit(achievement)}
                          className="admin-button admin-button--secondary"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(achievement._id, achievement.isActive)}
                          className="admin-button admin-button--secondary"
                        >
                          {achievement.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDelete(achievement)}
                          className="admin-button admin-button--danger"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      <ConfirmationModal
          isOpen={showConfirmModal}
          title="Delete Achievement"
          message={`Are you sure you want to delete "${achievementToDelete?.title}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowConfirmModal(false);
            setAchievementToDelete(null);
          }}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
    </div>
  )
}