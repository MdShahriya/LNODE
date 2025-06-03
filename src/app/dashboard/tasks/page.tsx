'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import './tasks.css'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 12
    }
  }
}

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
  taskUrl?: string
}

export default function TaskCenter() {
  const { address, isConnected } = useAccount()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  // Update task status
  const updateTaskStatus = useCallback(async (taskId: string, status: 'in_progress' | 'completed') => {
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
      setRedirecting(false)
    }
  }, [address, isConnected, tasks])

  const startTask = useCallback(async (taskId: string, taskUrl?: string) => {
    try {
      if (taskUrl) {
        setRedirecting(true)
        // Update status to in_progress first
        await updateTaskStatus(taskId, 'in_progress')
        // Construct and validate the URL
        let redirectUrl: URL
        try {
          redirectUrl = new URL(taskUrl)
        } catch (error) {
          console.error('Invalid URL:', error)
          toast.error('Invalid task URL')
          setRedirecting(false)
          return
        }
        // Add parameters and redirect
        redirectUrl.searchParams.set('taskId', taskId)
        redirectUrl.searchParams.set('autoComplete', 'true')
        const newWindow = window.open(redirectUrl.toString(), '_blank')
        if (!newWindow) {
          toast.error('Failed to open task URL. Please allow popups for this site.')
          setRedirecting(false)
          return
        }
      } else {
        await updateTaskStatus(taskId, 'in_progress')
      }
    } catch (error) {
      console.error('Error starting task:', error)
      toast.error('Failed to start task')
      setRedirecting(false)
    }
  }, [updateTaskStatus])
  
  const completeTask = useCallback((taskId: string) => {
    updateTaskStatus(taskId, 'completed')
  }, [updateTaskStatus])

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

  // Auto-complete task after redirection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const taskId = urlParams.get('taskId')
    const autoComplete = urlParams.get('autoComplete')

    if (taskId && autoComplete === 'true' && !redirecting) {
      completeTask(taskId)
      // Clear URL parameters
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [completeTask, redirecting])

  useEffect(() => {
    if (isConnected && address) {
      fetchTasks()
    }
  }, [isConnected, address, fetchTasks])

  return (
    <div className="task-center">
      <div className="task-center__container">
        <motion.h1 
          className="task-center__heading"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Task Center
        </motion.h1>
        
        {!isConnected ? (
          <motion.div 
            className="task-center__message" 
            key="not-connected"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Please connect your wallet to view and complete tasks.
          </motion.div>
        ) : loading ? (
          <motion.div 
            className="task-center__loading" 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="task-center__loading-spinner" key="spinner"></div>
            <p key="loading-text">Loading tasks...</p>
          </motion.div>
        ) : tasks.length === 0 ? (
          <motion.div 
            className="task-center__message" 
            key="empty-message"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            No tasks available at the moment. Check back later!
          </motion.div>
        ) : (
          <motion.div 
            className="task-center__grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {tasks.map((task) => (
              <motion.div 
                key={task.id} 
                className="task-card"
                variants={itemVariants}
                whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)' }}
              >
                <motion.h3 
                  className="task-card__title"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {task.title}
                </motion.h3>
                <motion.p 
                  className="task-card__description"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {task.description}
                </motion.p>

                <motion.div 
                  className="task-card__section"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <h4 className="task-card__section-heading">Requirements:</h4>
                  <ul className="task-card__requirements">
                    {task.requirements.map((req, index) => (
                      <motion.li 
                        key={`${task.id}-req-${index}`} 
                        className="task-card__requirement-item"
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.4 + (index * 0.05) }}
                      >
                        {req}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div 
                  className="task-card__section"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <h4 className="task-card__section-heading">Rewards:</h4>
                  <div className="task-card__rewards">
                    <motion.span 
                      className="task-card__points"
                      whileHover={{ scale: 1.05, y: -2 }}
                    >
                      {task.rewards.points} Points
                    </motion.span>
                    {task.rewards.tokens && task.rewards.tokens > 0 && (
                      <motion.span 
                        className="task-card__tokens"
                        whileHover={{ scale: 1.05, y: -2 }}
                      >
                        {task.rewards.tokens} Tokens
                      </motion.span>
                    )}
                  </div>
                </motion.div>

                {task.status === 'available' ? (
                  <motion.button
                    onClick={() => startTask(task.id, task.taskUrl)}
                    disabled={updating === task.id || redirecting}
                    className="task-card__button task-card__button--available"
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(59, 130, 246, 0.5)' }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    {updating === task.id ? 'Starting...' : 
                     redirecting ? 'Redirecting...' : 
                     'Start Task'}
                  </motion.button>
                ) : task.status === 'in_progress' ? (
                  <motion.button
                    onClick={() => completeTask(task.id)}
                    disabled={updating === task.id}
                    className="task-card__button task-card__button--in-progress"
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(245, 158, 11, 0.5)' }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    {updating === task.id ? 'Completing...' : 'Verify'}
                  </motion.button>
                ) : (
                  <motion.button
                    disabled
                    className="task-card__button task-card__button--completed"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    Completed
                  </motion.button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
