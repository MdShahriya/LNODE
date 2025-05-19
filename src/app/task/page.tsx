'use client'

import { useState, useEffect } from 'react';
import { modal } from '@/context';
import './task.css';

interface Task {
  id: number;
  title: string;
  description: string;
  requirements: string;
  reward: number;
  completed: boolean;
}

export default function TaskCenter() {
  const [isConnected, setIsConnected] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userStats, setUserStats] = useState({
    points: 0,
    tasksCompleted: 0
  });

  // Check wallet connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // This would be replaced with actual wallet connection check
        const connected = localStorage.getItem('walletConnected') === 'true';
        setIsConnected(connected);
        
        // Load saved stats from localStorage
        if (connected) {
          const savedStats = localStorage.getItem('userStats');
          if (savedStats) {
            setUserStats(JSON.parse(savedStats));
          }
          
          const savedTasks = localStorage.getItem('tasks');
          if (savedTasks) {
            setTasks(JSON.parse(savedTasks));
          } else {
            // Initialize with sample tasks if none exist
            initializeSampleTasks();
          }
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    };
    
    checkConnection();
  }, []);

  // Save tasks to localStorage when they change
  useEffect(() => {
    if (isConnected && tasks.length > 0) {
      localStorage.setItem('tasks', JSON.stringify(tasks));
    }
  }, [tasks, isConnected]);

  // Save user stats to localStorage when they change
  useEffect(() => {
    if (isConnected) {
      localStorage.setItem('userStats', JSON.stringify(userStats));
    }
  }, [userStats, isConnected]);

  const initializeSampleTasks = () => {
    const sampleTasks: Task[] = [
      {
        id: 1,
        title: 'Complete Profile',
        description: 'Fill out all required fields in your profile.',
        requirements: 'All profile fields must be completed',
        reward: 50,
        completed: false
      },
      {
        id: 2,
        title: 'Run Node for 24 Hours',
        description: 'Keep your node running continuously for 24 hours.',
        requirements: '24 hours of continuous uptime',
        reward: 100,
        completed: false
      },
      {
        id: 3,
        title: 'Refer a Friend',
        description: 'Invite a friend to join the TOPAY ecosystem.',
        requirements: 'Friend must sign up using your referral link',
        reward: 75,
        completed: false
      },
      {
        id: 4,
        title: 'Complete Quiz',
        description: 'Take and pass the TOPAY ecosystem knowledge quiz.',
        requirements: 'Score at least 80% on the quiz',
        reward: 60,
        completed: false
      },
      {
        id: 5,
        title: 'Join Community',
        description: 'Join the TOPAY community on Discord or Telegram.',
        requirements: 'Verify your account in the community',
        reward: 30,
        completed: false
      }
    ];
    
    setTasks(sampleTasks);
    localStorage.setItem('tasks', JSON.stringify(sampleTasks));
  };

  const handleConnectWallet = () => {
    modal.open();
    // After successful connection (would be handled by the wallet provider)
    localStorage.setItem('walletConnected', 'true');
    setIsConnected(true);
  };

  const completeTask = (taskId: number) => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    
    // Update task status
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId && !task.completed) {
        // Update user stats
        setUserStats(prev => ({
          points: prev.points + task.reward,
          tasksCompleted: prev.tasksCompleted + 1
        }));
        
        return { ...task, completed: true };
      }
      return task;
    });
    
    setTasks(updatedTasks);
  };

  return (
    <div className="task-container">
      <h1 className="task-title">Task Center</h1>
      
      {!isConnected ? (
        <div className="connect-wallet-container">
          <p>Connect your wallet to access tasks</p>
          <button 
            onClick={handleConnectWallet}
            className="connect-wallet-button"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          <div className="task-stats">
            <div className="stat-item">
              <h3>Points Earned</h3>
              <p>{userStats.points}</p>
            </div>
            <div className="stat-item">
              <h3>Tasks Completed</h3>
              <p>{userStats.tasksCompleted}/{tasks.length}</p>
            </div>
          </div>
          
          <div className="task-list">
            {tasks.map(task => (
              <div key={task.id} className={`task-card ${task.completed ? 'completed' : ''}`}>
                <div className="task-header">
                  <h3>{task.title}</h3>
                  <span className="task-reward">{task.reward} points</span>
                </div>
                <p className="task-description">{task.description}</p>
                <div className="task-requirements">
                  <strong>Requirements:</strong> {task.requirements}
                </div>
                <button 
                  onClick={() => completeTask(task.id)}
                  className="task-button"
                  disabled={task.completed}
                >
                  {task.completed ? 'Completed' : 'Complete Task'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}