'use client'

import { useState, useEffect } from 'react'
import './tasks.css'
import { toast } from 'react-hot-toast'
import ConfirmationModal from '@/components/ConfirmationModal'

interface Task {
  id: string  // Changed from id?: string to make id required
  title: string
  description: string
  rewards: {
    points: number
  }
  requirements: string[]
  isActive: boolean
  taskUrl?: string
  verificationMethod?: {
    type: 'auto' | 'manual'
    urlParam?: string
    apiEndpoint?: string
    apiMethod?: 'GET' | 'POST'
    apiParams?: Record<string, string>
  }
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
    },
    requirements: [''],
    isActive: true,
    taskUrl: '',
    verificationMethod: {
      type: 'manual'
    }
  })
  
  // Add new API param field
  const [apiParams, setApiParams] = useState<{key: string, value: string}[]>([{key: '', value: ''}])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)

  // Fetch all tasks
  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/tasks')
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }
      
      const data = await response.json()
      // Map MongoDB _id to id for frontend use
      const formattedTasks = data.tasks.map((task: {
        _id: string;
        title: string;
        description: string;
        rewards: {
          points: number;
        };
        requirements: string[];
        isActive: boolean;
        taskUrl?: string;
        verificationMethod?: {
          type: 'auto' | 'manual';
          urlParam?: string;
          apiEndpoint?: string;
          apiMethod?: 'GET' | 'POST';
          apiParams?: Record<string, string>;
        };
      }) => ({
        id: task._id,
        title: task.title,
        description: task.description,
        rewards: task.rewards,
        requirements: task.requirements,
        isActive: task.isActive,
        taskUrl: task.taskUrl,
        verificationMethod: task.verificationMethod
      }))
      setTasks(formattedTasks)
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
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    if (name === 'rewards.points') {
      setNewTask({
        ...newTask,
        rewards: {
          ...newTask.rewards,
          points: parseInt(value) || 0,
        },
      })
    } else if (name === 'verificationMethod.type') {
      setNewTask({
        ...newTask,
        verificationMethod: {
          ...newTask.verificationMethod,
          type: value as 'auto' | 'manual',
        },
      })
    } else if (name === 'verificationMethod.urlParam') {
      setNewTask({
        ...newTask,
        verificationMethod: {
          type: newTask.verificationMethod?.type || 'manual',
          ...newTask.verificationMethod,
          urlParam: value,
        },
      })
    } else if (name === 'verificationMethod.apiEndpoint') {
      setNewTask({
        ...newTask,
        verificationMethod: {
          type: newTask.verificationMethod?.type || 'manual',
          ...newTask.verificationMethod,
          apiEndpoint: value,
        },
      })
    } else if (name === 'verificationMethod.apiMethod') {
      setNewTask({
        ...newTask,
        verificationMethod: {
          type: newTask.verificationMethod?.type || 'manual',
          ...newTask.verificationMethod,
          apiMethod: value as 'GET' | 'POST',
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

  // Handle API params changes
  const handleApiParamChange = (key: string, value: string) => {
    setNewTask({
      ...newTask,
      verificationMethod: {
        type: newTask.verificationMethod?.type || 'manual',
        ...newTask.verificationMethod,
        apiParams: {
          ...newTask.verificationMethod?.apiParams,
          [key]: value
        }
      }
    })
  }

  // Add new API param field
  const addApiParam = () => {
    setApiParams([...apiParams, {key: '', value: ''}])
  }

  // Remove API param field
  const removeApiParam = (index: number) => {
    if (apiParams.length <= 1) return
    
    const updatedParams = [...apiParams]
    updatedParams.splice(index, 1)
    
    setApiParams(updatedParams)

    // Update task state with new params
    const newParams: Record<string, string> = {}
    updatedParams.forEach(param => {
      if (param.key.trim() !== '') {
        newParams[param.key] = param.value
      }
    })

    setNewTask({
      ...newTask,
      verificationMethod: {
        type: newTask.verificationMethod?.type || 'manual',
        ...newTask.verificationMethod,
        apiParams: newParams
      }
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

    // Process API params if auto verification is selected
    let processedTask = { ...newTask }
    if (newTask.verificationMethod?.type === 'auto' && apiParams.length > 0) {
      const validParams: Record<string, string> = {}
      apiParams.forEach(param => {
        if (param.key.trim() !== '') {
          validParams[param.key] = param.value
        }
      })
      
      processedTask = {
        ...processedTask,
        verificationMethod: {
          type: newTask.verificationMethod.type,
          ...processedTask.verificationMethod,
          apiParams: validParams
        }
      }
    }
    
    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...processedTask,
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
        },
        requirements: [''],
        isActive: true,
        taskUrl: '',
        verificationMethod: {
          type: 'manual'
        }
      })
      
      // Reset API params
      setApiParams([{key: '', value: ''}])
      
      // Refresh tasks list
      fetchTasks()
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create task')
    }
  }

  // Delete task
  const deleteTask = async (taskId: string) => {
    setTaskToDelete(taskId)
    setShowConfirmModal(true)
  }

  const confirmDelete = async () => {
    if (!taskToDelete) return
    
    try {
      const response = await fetch(`/api/admin/tasks?id=${taskToDelete}`, {
        method: 'DELETE',
      })
      
      // Parse the response before checking status
      let data;
      try {
        data = await response.json()
      } catch (e) {
        // If JSON parsing fails, handle it gracefully
        console.error('Error parsing response:', e)
        data = {}
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete task')
      }
      
      toast.success(data.message || 'Task deleted successfully')
      
      // Refresh tasks list
      fetchTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete task')
    } finally {
      setShowConfirmModal(false)
      setTaskToDelete(null)
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
                  name="rewards.points"
                  value={newTask.rewards.points}
                  onChange={handleInputChange}
                  min="0"
                  required
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
              <label htmlFor="taskUrl">Task URL</label>
              <input
                type="url"
                id="taskUrl"
                name="taskUrl"
                value={newTask.taskUrl || ''}
                onChange={handleInputChange}
                placeholder="https://example.com"
                pattern="https?://.*"
                title="Enter a valid URL starting with http:// or https://"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="verificationType">Verification Method</label>
              <select
                id="verificationType"
                name="verificationMethod.type"
                value={newTask.verificationMethod?.type || 'manual'}
                onChange={handleInputChange}
              >
                <option value="manual">Manual Verification</option>
                <option value="auto">Automatic Verification</option>
              </select>
            </div>
            
            {newTask.verificationMethod?.type === 'auto' && (
              <>
                <div className="form-group">
                  <label htmlFor="urlParam">URL Parameter for Verification</label>
                  <input
                    type="text"
                    id="urlParam"
                    name="verificationMethod.urlParam"
                    value={newTask.verificationMethod?.urlParam || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., verified"
                  />
                  <small>Parameter that will be checked in the return URL</small>
                </div>
                
                <div className="form-group">
                  <label htmlFor="apiEndpoint">API Endpoint for Verification (Optional)</label>
                  <input
                    type="text"
                    id="apiEndpoint"
                    name="verificationMethod.apiEndpoint"
                    value={newTask.verificationMethod?.apiEndpoint || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., /api/verify-task"
                  />
                </div>
                
                {newTask.verificationMethod?.apiEndpoint && (
                  <>
                    <div className="form-group">
                      <label htmlFor="apiMethod">API Method</label>
                      <select
                        id="apiMethod"
                        name="verificationMethod.apiMethod"
                        value={newTask.verificationMethod?.apiMethod || 'GET'}
                        onChange={handleInputChange}
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>API Parameters</label>
                      {apiParams.map((param, index) => (
                        <div key={index} className="api-param-row">
                          <input
                            type="text"
                            value={param.key}
                            onChange={(e) => {
                              const updatedParams = [...apiParams]
                              updatedParams[index].key = e.target.value
                              setApiParams(updatedParams)
                              handleApiParamChange(e.target.value, param.value)
                            }}
                            placeholder="Parameter name"
                          />
                          <input
                            type="text"
                            value={param.value}
                            onChange={(e) => {
                              const updatedParams = [...apiParams]
                              updatedParams[index].value = e.target.value
                              setApiParams(updatedParams)
                              handleApiParamChange(param.key, e.target.value)
                            }}
                            placeholder="Parameter value"
                          />
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => removeApiParam(index)}
                            disabled={apiParams.length <= 1}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={addApiParam}
                      >
                        Add Parameter
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
            
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
                  
                  {task.taskUrl && (
                    <div className="admin-task-card__section">
                      <h4 className="admin-task-card__section-heading">Task URL:</h4>
                      <a 
                        href={task.taskUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="admin-task-card__url"
                      >
                        {task.taskUrl}
                      </a>
                    </div>
                  )}
                  
                  <div className="admin-task-card__section">
                    <h4 className="admin-task-card__section-heading">Rewards:</h4>
                    <div className="admin-task-card__rewards">
                      <span className="admin-task-card__points">{task.rewards.points} Points</span>
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

                  <div className="admin-task-card__section">
                    <h4 className="admin-task-card__section-heading">Verification Method:</h4>
                    <div className="admin-task-card__verification">
                      <span className="admin-task-card__verification-type">
                        {task.verificationMethod?.type === 'auto' ? 'Automatic' : 'Manual'}
                      </span>
                      {task.verificationMethod?.type === 'auto' && task.verificationMethod?.urlParam && (
                        <div className="admin-task-card__verification-detail">
                          <strong>URL Parameter:</strong> {task.verificationMethod.urlParam}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirmModal(false)
          setTaskToDelete(null)
        }}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}