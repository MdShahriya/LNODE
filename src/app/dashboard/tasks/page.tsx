'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
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
  const { isConnected } = useAccount()
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Maintain Node Uptime',
      description: 'Keep your node running for 24 hours straight',
      rewards: {
        points: 100,
        tokens: 10,
      },
      requirements: ['Node must be active', 'Wallet must be connected'],
      status: 'available',
    },
    {
      id: '2',
      title: 'Complete Profile',
      description: 'Fill out all profile information',
      rewards: {
        points: 50,
      },
      requirements: ['Wallet connection'],
      status: 'available',
    },
  ])

  useEffect(() => {
    if (!isConnected) {
      return
    }
  }, [isConnected])

  const startTask = (taskId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId
          ? { ...task, status: 'in_progress' as const }
          : task
      )
    )
  }

  return (
    <div className="task-center">
      <div className="task-center__container">
        <h1 className="task-center__heading">Task Center</h1>
        <div className="task-center__grid">
          {tasks.map((task) => (
            <div key={task.id} className="task-card">
              <h3 className="task-card__title">{task.title}</h3>
              <p className="task-card__description">{task.description}</p>

              <div className="task-card__section">
                <h4 className="task-card__section-heading">Requirements:</h4>
                <ul className="task-card__requirements">
                  {task.requirements.map((req, index) => (
                    <li key={index} className="task-card__requirement-item">
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="task-card__section">
                <h4 className="task-card__section-heading">Rewards:</h4>
                <div className="task-card__rewards">
                  <span className="task-card__points">{task.rewards.points} Points</span>
                  {task.rewards.tokens && (
                    <span className="task-card__tokens">{task.rewards.tokens} Tokens</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => startTask(task.id)}
                disabled={task.status !== 'available'}
                className={`task-card__button task-card__button--${task.status}`}
              >
                {task.status === 'available'
                  ? 'Start Task'
                  : task.status === 'in_progress'
                  ? 'In Progress'
                  : 'Completed'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
