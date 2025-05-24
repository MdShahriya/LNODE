'use client'

import { useState, useEffect } from 'react'
import './tasks.css'
import { toast } from 'react-hot-toast'

interface Task {
  id: string  // Changed from id?: string to make id required
  title: string
  description: string
  rewards: {
    points: number
    tokens?: number
  }
  requirements: string[]
  isActive: boolean
}

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState<Task>({
    id: '',  // Added empty string for id
    title: '',
    description: '',
    rewards: {
      points: 0,
      tokens: 0,
    },
    requirements: [''],
    isActive: true,
  })

  // Fetch all tasks
  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/tasks')
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }
      
      const data = await response.json()
      setTasks(data.tasks)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name === 'points' || name === 'tokens') {
      setNewTask({
        ...newTask,
        rewards: {
          ...newTask.rewards,
          [name]: parseInt(value) || 0,
        },
      })
    } else {
      setNewTask({
        ...newTask,
        [name]: value,
      })
    }
  }

  // Handle requirement changes
  const handleRequirementChange = (index: number, value: string) => {
    const updatedRequirements = [...newTask.requirements]
    updatedRequirements[index] = value
    
    setNewTask({
      ...newTask,
      requirements: updatedRequirements,
    })
  }

  // Add new requirement field
  const addRequirement = () => {
    setNewTask({
      ...newTask,
      requirements: [...newTask.requirements, ''],
    })
  }

  // Remove requirement field
  const removeRequirement = (index: number) => {
    if (newTask.requirements.length <= 1) return
    
    const updatedRequirements = [...newTask.requirements]
    updatedRequirements.splice(index, 1)
    
    setNewTask({
      ...newTask,
      requirements: updatedRequirements,
    })
  }

  // Create new task
  const createTask = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    if (!newTask.title.trim() || !newTask.description.trim() || newTask.rewards.points <= 0) {
      toast.error('Please fill in all required fields')
      return
    }
    
    // Filter out empty requirements
    const filteredRequirements = newTask.requirements.filter(req => req.trim() !== '')
    
    if (filteredRequirements.length === 0) {
      toast.error('Please add at least one requirement')
      return
    }
    
    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newTask,
          requirements: filteredRequirements,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create task')
      }
      
      toast.success('Task created successfully')
      
      // Reset form
      setNewTask({
        id: '',
        title: '',
        description: '',
        rewards: {
          points: 0,
          tokens: 0,
        },
        requirements: [''],
        isActive: true,
      })
      
      // Refresh tasks list
      fetchTasks()
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create task')
    }
  }

  // Delete task
  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    
    try {
      const response = await fetch(`/api/admin/tasks?id=${taskId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete task')
      }
      
      toast.success('Task deleted successfully')
      
      // Refresh tasks list
      fetchTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete task')
    }
  }

  // Toggle task active status
  const toggleTaskStatus = async (taskId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: taskId,
          isActive: !currentStatus,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update task')
      }
      
      toast.success(`Task ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      
      // Refresh tasks list
      fetchTasks()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update task')
    }
  }

  return (
    <div className="admin-tasks">
      <div className="admin-tasks__container">
        <h1 className="admin-tasks__heading">Task Management</h1>
        
        {/* Create Task Form */}
        <div className="admin-tasks__form-container">
          <h2 className="admin-tasks__subheading">Create New Task</h2>
          <form className="admin-tasks__form" onSubmit={createTask}>
            <div className="form-group">
              <label htmlFor="title">Title*</label>
              <input
                type="text"
                id="title"
                name="title"
                value={newTask.title}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description*</label>
              <textarea
                id="description"
                name="description"
                value={newTask.description}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="points">Points*</label>
                <input
                  type="number"
                  id="points"
                  name="points"
                  value={newTask.rewards.points}
                  onChange={handleInputChange}
                  min="0"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="tokens">Tokens</label>
                <input
                  type="number"
                  id="tokens"
                  name="tokens"
                  value={newTask.rewards.tokens}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Requirements*</label>
              {newTask.requirements.map((req, index) => (
                <div key={index} className="requirement-row">
                  <input
                    type="text"
                    value={req}
                    onChange={(e) => handleRequirementChange(index, e.target.value)}
                    placeholder="Enter requirement"
                    required
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => removeRequirement(index)}
                    disabled={newTask.requirements.length <= 1}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary"
                onClick={addRequirement}
              >
                Add Requirement
              </button>
            </div>
            
            <div className="form-group">
              <label htmlFor="isActive">Status</label>
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={newTask.isActive}
                  onChange={(e) => setNewTask({ ...newTask, isActive: e.target.checked })}
                />
                <label htmlFor="isActive">Active</label>
              </div>
            </div>
            
            <button type="submit" className="btn-primary">
              Create Task
            </button>
          </form>
        </div>
        
        {/* Tasks List */}
        <div className="admin-tasks__list-container">
          <h2 className="admin-tasks__subheading">Existing Tasks</h2>
          
          {loading ? (
            <div className="admin-tasks__loading" key="loading">
              <div className="admin-tasks__loading-spinner" key="spinner"></div>
              <p key="loading-text">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="admin-tasks__message" key="empty-message">
              No tasks found. Create your first task above.
            </div>
          ) : (
            <div className="admin-tasks__list">
              {tasks.map((task, index) => (
                <div key={task.id || `task-${index}`} className="admin-task-card">
                  <div className="admin-task-card__header">
                    <h3 className="admin-task-card__title">{task.title}</h3>
                    <div className="admin-task-card__actions">
                      <button
                        className={`status-toggle ${task.isActive ? 'active' : 'inactive'}`}
                        onClick={() => toggleTaskStatus(task.id, task.isActive)}
                      >
                        {task.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => deleteTask(task.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  <p className="admin-task-card__description">{task.description}</p>
                  
                  <div className="admin-task-card__section">
                    <h4 className="admin-task-card__section-heading">Rewards:</h4>
                    <div className="admin-task-card__rewards">
                      <span className="admin-task-card__points">{task.rewards.points} Points</span>
                      {task.rewards.tokens && task.rewards.tokens > 0 && (
                        <span className="admin-task-card__tokens">{task.rewards.tokens} Tokens</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="admin-task-card__section">
                    <h4 className="admin-task-card__section-heading">Requirements:</h4>
                    <ul className="admin-task-card__requirements">
                      {task.requirements.map((req, reqIndex) => (
                        <li key={`${task.id || `task-${index}`}-req-${reqIndex}`} className="admin-task-card__requirement-item">
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}