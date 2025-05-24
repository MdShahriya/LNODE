'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import './tasks.css'

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
  const { address, isConnected } = useAccount()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    if (!address || !isConnected) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/tasks?walletAddress=${address}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch tasks')
      }
      
      const data = await response.json()
      setTasks(data.tasks || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }, [address, isConnected])

  // Update task status
  const updateTaskStatus = async (taskId: string, status: 'in_progress' | 'completed') => {
    if (!address || !isConnected) return
    
    try {
      setUpdating(taskId)
      const response = await fetch('/api/tasks/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
          taskId,
          status,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${status === 'in_progress' ? 'start' : 'complete'} task`)
      }
      
      const data = await response.json()
      
      // Update task in state
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: data.task.status } : task
      ))
      
      toast.success(`Task ${status === 'in_progress' ? 'started' : 'completed'} successfully`)
    } catch (error) {
      console.error('Error updating task status:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update task')
    } finally {
      setUpdating(null)
    }
  }

  useEffect(() => {
    if (isConnected && address) {
      fetchTasks()
    }
  }, [isConnected, address, fetchTasks])

  const startTask = (taskId: string) => {
    updateTaskStatus(taskId, 'in_progress')
  }
  
  const completeTask = (taskId: string) => {
    updateTaskStatus(taskId, 'completed')
  }

  return (
    <div className="task-center">
      <div className="task-center__container">
        <h1 className="task-center__heading">Task Center</h1>
        
        {!isConnected ? (
          <div className="task-center__message" key="not-connected">
            Please connect your wallet to view and complete tasks.
          </div>
        ) : loading ? (
          <div className="task-center__loading" key="loading">
            <div className="task-center__loading-spinner" key="spinner"></div>
            <p key="loading-text">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="task-center__message" key="empty-message">
            No tasks available at the moment. Check back later!
          </div>
        ) : (
          <div className="task-center__grid">
            {tasks.map((task) => (
              <div key={task.id} className="task-card">
                <h3 className="task-card__title">{task.title}</h3>
                <p className="task-card__description">{task.description}</p>

                <div className="task-card__section">
                  <h4 className="task-card__section-heading">Requirements:</h4>
                  <ul className="task-card__requirements">
                    {task.requirements.map((req, index) => (
                      <li key={`${task.id}-req-${index}`} className="task-card__requirement-item">
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="task-card__section">
                  <h4 className="task-card__section-heading">Rewards:</h4>
                  <div className="task-card__rewards">
                    <span className="task-card__points">{task.rewards.points} Points</span>
                    {task.rewards.tokens && task.rewards.tokens > 0 && (
                      <span className="task-card__tokens">{task.rewards.tokens} Tokens</span>
                    )}
                  </div>
                </div>

                {task.status === 'available' ? (
                  <button
                    onClick={() => startTask(task.id)}
                    disabled={updating === task.id}
                    className="task-card__button task-card__button--available"
                  >
                    {updating === task.id ? 'Starting...' : 'Start Task'}
                  </button>
                ) : task.status === 'in_progress' ? (
                  <button
                    onClick={() => completeTask(task.id)}
                    disabled={updating === task.id}
                    className="task-card__button task-card__button--in-progress"
                  >
                    {updating === task.id ? 'Completing...' : 'Complete Task'}
                  </button>
                ) : (
                  <button
                    disabled
                    className="task-card__button task-card__button--completed"
                  >
                    Completed
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
