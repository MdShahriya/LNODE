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
  }
  requirements: string[]
  status: 'available' | 'in_progress' | 'completed'
  taskUrl?: string
  verificationMethod?: {
    type: 'auto' | 'manual'
    urlParam?: string
    apiEndpoint?: string
    apiMethod?: 'GET' | 'POST'
    apiParams?: Record<string, string>
  }
}

export default function TaskCenter() {
  const { address, isConnected } = useAccount()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)

  // Update task status
  const updateTaskStatus = useCallback(async (taskId: string, status: 'in_progress' | 'completed') => {
    if (!address || !isConnected) {
      toast.error('Please connect your wallet to continue')
      return
    }
    
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
        const errorData = await response.json().catch(() => ({}))
        
        // Handle specific error cases
        if (response.status === 400) {
          if (errorData.error?.includes('Cannot change task status')) {
            toast.error(`Invalid task status transition: ${errorData.error}`)
          } else if (errorData.error?.includes('Invalid status')) {
            toast.error('Invalid task status provided')
          } else if (errorData.error?.includes('required')) {
            toast.error('Missing required information for task update')
          } else {
            toast.error(errorData.error || 'Invalid request. Please check your input.')
          }
        } else if (response.status === 404) {
          if (errorData.error?.includes('User not found')) {
            toast.error('User account not found. Please ensure your wallet is registered.')
          } else if (errorData.error?.includes('Task not found')) {
            toast.error('Task not found. It may have been removed or is no longer available.')
          } else {
            toast.error('Resource not found')
          }
        } else if (response.status === 500) {
          toast.error('Server error occurred. Please try again later.')
        } else {
          toast.error(errorData.error || `Failed to ${status === 'in_progress' ? 'start' : 'complete'} task`)
        }
        return
      }
      
      const data = await response.json()
      
      // Update task in state
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: data.task.status } : task
      ))
      
      toast.success(`Task ${status === 'in_progress' ? 'started' : 'completed'} successfully`)
    } catch (error) {
      console.error('Error updating task status:', error)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('Network error. Please check your internet connection and try again.')
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to update task. Please try again.')
      }
    } finally {
      setUpdating(null)
      setRedirecting(false)
      setVerifying(null)
    }
  }, [address, isConnected, tasks])

  // Verify task completion via API
  const verifyTaskViaApi = useCallback(async (task: Task) => {
    if (!task.verificationMethod?.apiEndpoint || !task.verificationMethod?.apiMethod) {
      toast.error('Task verification is not properly configured')
      return false
    }

    if (!address) {
      toast.error('Wallet address is required for verification')
      return false
    }

    try {
      setVerifying(task.id)
      
      // Prepare API parameters
      const apiParams = task.verificationMethod.apiParams || {}
      
      // Make the API call based on the method
      let response;
      if (task.verificationMethod.apiMethod === 'GET') {
        // Build query string
        const queryParams = new URLSearchParams()
        Object.entries(apiParams).forEach(([key, value]) => {
          queryParams.append(key, value)
        })
        // Add wallet address as a parameter
        if (address) {
          queryParams.append('walletAddress', address)
        }
        
        response = await fetch(`${task.verificationMethod.apiEndpoint}?${queryParams.toString()}`)
      } else { // POST
        response = await fetch(task.verificationMethod.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...apiParams,
            walletAddress: address,
            taskId: task.id
          }),
        })
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Handle specific verification error cases
        if (response.status === 400) {
          toast.error(errorData.error || 'Invalid verification request. Please check task requirements.')
        } else if (response.status === 401) {
          toast.error('Authentication failed. Please reconnect your wallet.')
        } else if (response.status === 403) {
          toast.error('Access denied. You may not meet the task requirements.')
        } else if (response.status === 404) {
          toast.error('Verification endpoint not found. Task may be outdated.')
        } else if (response.status === 429) {
          toast.error('Too many verification attempts. Please wait before trying again.')
        } else if (response.status >= 500) {
          toast.error('Verification service is temporarily unavailable. Please try again later.')
        } else {
          toast.error(errorData.error || 'Verification failed. Please try again.')
        }
        return false
      }
      
      const data = await response.json().catch(() => ({ verified: false }))
      
      if (!data.verified) {
        toast.error('Task verification failed. Please ensure you have completed all requirements.')
      }
      
      return data.verified === true
    } catch (error) {
      console.error('Error verifying task via API:', error)
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('Network error during verification. Please check your connection and try again.')
      } else if (error instanceof SyntaxError) {
        toast.error('Invalid response from verification service. Please try again.')
      } else {
        toast.error(error instanceof Error ? error.message : 'Verification failed due to an unexpected error.')
      }
      return false
    } finally {
      setVerifying(null)
    }
  }, [address])

  const startTask = useCallback(async (taskId: string, taskUrl?: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) {
      toast.error('Task not found. Please refresh the page and try again.')
      return
    }

    // Check if task is already started or completed
    if (task.status === 'in_progress') {
      toast.error('Task is already in progress! Click "Verify" to complete it.')
      return
    }
    
    if (task.status === 'completed') {
      toast.error('Task is already completed!')
      return
    }

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
          toast.error(`Invalid task URL: ${taskUrl}. Please contact support if this issue persists.`)
          setRedirecting(false)
          return
        }
        
        // Validate URL protocol for security
        if (!['http:', 'https:'].includes(redirectUrl.protocol)) {
          toast.error('Unsafe URL protocol. Only HTTP and HTTPS links are allowed.')
          setRedirecting(false)
          return
        }
        
        // Add parameters and redirect
        redirectUrl.searchParams.set('taskId', taskId)
        redirectUrl.searchParams.set('autoComplete', 'true')
        
        try {
          const newWindow = window.open(redirectUrl.toString(), '_blank')
          if (!newWindow) {
            toast.error('Failed to open task URL. Please allow popups for this site and try again.')
            setRedirecting(false)
            return
          }
        } catch (error) {
          console.error('Error opening window:', error)
          toast.error('Failed to open task URL due to browser restrictions. Please try again.')
          setRedirecting(false)
          return
        }
      } else {
        await updateTaskStatus(taskId, 'in_progress')
        toast.success(`Task "${task.title}" started successfully!`)
      }
    } catch (error) {
      console.error('Error starting task:', error)
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error(`Network error while starting task "${task.title}". Please check your connection and try again.`)
      } else {
        toast.error(`Failed to start task "${task.title}". ${error instanceof Error ? error.message : 'Please try again.'}`)
      }
      setRedirecting(false)
    }
  }, [updateTaskStatus, tasks])
  
  // Function to check if task requirements are met
  const checkTaskRequirements = useCallback((task: Task) => {
    // Basic requirement checks that can be done client-side
    const unmetRequirements: string[] = []
    
    // Check wallet connection
    if (!address || !isConnected) {
      unmetRequirements.push('Connect your wallet')
    }
    
    // Check if task has specific requirements that need validation
    if (task.requirements && task.requirements.length > 0) {
      // For demonstration purposes, let's add some common requirement checks
      task.requirements.forEach((requirement) => {
        const reqLower = requirement.toLowerCase()
        
        // Check for social media requirements
        if (reqLower.includes('follow') && reqLower.includes('twitter')) {
          // Simulate checking if user has followed on Twitter
          unmetRequirements.push('Follow us on Twitter')
        } else if (reqLower.includes('join') && reqLower.includes('discord')) {
          // Simulate checking if user has joined Discord
          unmetRequirements.push('Join our Discord community')
        } else if (reqLower.includes('refer') && reqLower.includes('friend')) {
          // Simulate checking if user has made referrals
          unmetRequirements.push('Refer at least one friend')
        } else if (reqLower.includes('profile') && reqLower.includes('complete')) {
          // Simulate checking if profile is complete
          unmetRequirements.push('Complete your profile')
        } else if (reqLower.includes('verify') && reqLower.includes('email')) {
          // Simulate checking if email is verified
          unmetRequirements.push('Verify your email address')
        }
        // For any other requirements, add them as unmet for demonstration
        else if (!reqLower.includes('wallet') && !reqLower.includes('connect')) {
          unmetRequirements.push(requirement)
        }
      })
    }
    
    return unmetRequirements
  }, [address, isConnected])

  const completeTask = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) {
      toast.error('Task not found. Please refresh the page and try again.')
      return
    }

    // Check if task is in the correct status to be completed
    if (task.status !== 'in_progress') {
      toast.error('Task must be started before it can be completed!')
      return
    }

    // Check basic requirements before attempting completion
    const unmetRequirements = checkTaskRequirements(task)
    if (unmetRequirements.length > 0) {
      toast.error(`Please complete the following requirements first:\n• ${unmetRequirements.join('\n• ')}`)
      return
    }

    try {
      // If task has API verification, try that first
      if (task.verificationMethod?.type === 'auto' && task.verificationMethod.apiEndpoint) {
        const verified = await verifyTaskViaApi(task)
        if (verified) {
          await updateTaskStatus(taskId, 'completed')
          toast.success(`Task "${task.title}" completed successfully! You earned ${task.rewards.points} points.`)
        } else {
          // Show specific requirements that weren't met
          const requirementsList = task.requirements.map(req => `• ${req}`).join('\n')
          toast.error(`Task "${task.title}" verification failed. Please ensure you have completed all requirements:\n\n${requirementsList}\n\nThen try again.`)
        }
        return
      }

      // For manual verification, show requirements reminder as toast
      const requirementsList = task.requirements.map(req => `• ${req}`).join('\n')
      toast(
        `Please confirm you have completed all requirements for "${task.title}":\n\n${requirementsList}\n\nIf you have completed all requirements, click the Verify button again to mark as completed.`,
        {
          duration: 8000,
          style: {
            maxWidth: '500px',
            fontSize: '14px',
            lineHeight: '1.4'
          }
        }
      )
      return

      // Proceed with manual verification
      await updateTaskStatus(taskId, 'completed')
// Remove unreachable code since it appears after a return statement
    } catch (error) {
      console.error('Error completing task:', error)
      toast.error(`Failed to complete task "${task.title}". Please try again.`)
    }
  }, [tasks, updateTaskStatus, verifyTaskViaApi, checkTaskRequirements])

  // Test function to demonstrate popup messages
  const testPopupMessages = useCallback(() => {
    // Test different types of popup messages
    const testScenarios = [
      () => {
        toast.error('Please complete the following requirements first:\n• Connect your wallet\n• Follow us on Twitter\n• Join our Discord community', {
          duration: 6000,
          style: {
            maxWidth: '400px',
            fontSize: '14px'
          }
        })
      },
      () => {
        toast(
          'Please confirm you have completed all requirements for "Test Task":\n\n• Follow us on Twitter\n• Join our Discord community\n• Complete your profile\n\nIf you have completed all requirements, click the Verify button again to mark as completed.',
          {
            duration: 8000,
            style: {
              maxWidth: '500px',
              fontSize: '14px',
              lineHeight: '1.4'
            }
          }
        )
      },
      () => {
        toast.error('Task "Social Media Engagement" verification failed. Please ensure you have completed all requirements:\n\n• Follow us on Twitter\n• Join our Discord community\n• Share our latest post\n\nThen try again.', {
          duration: 7000,
          style: {
            maxWidth: '450px',
            fontSize: '14px'
          }
        })
      },
      () => {
        toast.success('Task completed successfully! You earned 100 points.', {
          duration: 4000,
          style: {
            fontSize: '14px'
          }
        })
      },
      () => {
        toast.loading('Verifying task completion...', {
          duration: 2000
        })
        setTimeout(() => {
          toast.success('Verification complete!')
        }, 2000)
      }
    ]
    
    // Cycle through different test scenarios
    const scenario = testScenarios[Math.floor(Math.random() * testScenarios.length)]
    scenario()
  }, [])

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    if (!address || !isConnected) {
      toast.error('Please connect your wallet to view tasks')
      return
    }
    
    try {
      setLoading(true)
      
      const response = await fetch(`/api/tasks?walletAddress=${address}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Handle specific fetch error cases
        if (response.status === 400) {
          toast.error(errorData.error || 'Invalid wallet address provided')
        } else if (response.status === 404) {
          toast.error('User account not found. Please ensure your wallet is registered.')
        } else if (response.status === 500) {
          toast.error('Server error occurred while fetching tasks. Please try again later.')
        } else {
          toast.error(errorData.error || 'Failed to fetch tasks. Please try again.')
        }
        return
      }
      
      const data = await response.json()
      const tasks = data.tasks || []
      
      if (tasks.length === 0) {
        toast('No tasks available at the moment. Check back later!')
      }
      
      setTasks(tasks)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('Network error. Please check your internet connection and try again.')
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to fetch tasks due to an unexpected error.')
      }
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
      // Find the task to check if it has a URL parameter for verification
      const task = tasks.find(t => t.id === taskId)
      
      if (task && task.verificationMethod?.type === 'auto' && task.verificationMethod.urlParam) {
        // Check if the specified URL parameter exists and has the expected value
        const paramValue = urlParams.get(task.verificationMethod.urlParam)
        if (paramValue === 'true' || paramValue === '1' || paramValue === 'yes') {
          completeTask(taskId)
        } else {
          toast.error('Task verification failed. Missing or invalid verification parameter.')
        }
      } else {
        // Fall back to regular completion if no specific verification parameter is defined
        completeTask(taskId)
      }
      
      // Clear URL parameters
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [completeTask, redirecting, tasks])

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
        
        {/* Test button for popup messages */}
        <motion.button
          onClick={testPopupMessages}
          className="task-center__test-button"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: '500'
          }}
          whileHover={{ scale: 1.05, boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)' }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          🧪 Test Popup Messages
        </motion.button>
        
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
                  </div>
                </motion.div>

                {task.verificationMethod?.type === 'auto' && (
                  <motion.div 
                    className="task-card__section task-card__verification"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <span className="task-card__verification-badge">Auto-verified</span>
                  </motion.div>
                )}

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
                    disabled={updating === task.id || verifying === task.id}
                    className="task-card__button task-card__button--in-progress"
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(245, 158, 11, 0.5)' }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    {updating === task.id ? 'Completing...' : 
                     verifying === task.id ? 'Verifying...' : 
                     task.verificationMethod?.type === 'auto' ? 'Auto-verify' : 'Verify'}
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
