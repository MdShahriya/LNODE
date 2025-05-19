'use client'

import { useState, useEffect } from 'react';
import { modal } from '@/context';
import './admin.css';

interface UserStats {
  id: string;
  walletAddress: string;
  uptime: number;
  points: number;
  tasksCompleted: number;
  lastActive: string;
}

export default function Admin() {
  const [isConnected, setIsConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserStats[]>([]);
  
  // Check wallet connection status and admin rights
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // This would be replaced with actual wallet connection check
        const connected = localStorage.getItem('walletConnected') === 'true';
        setIsConnected(connected);
        
        if (connected) {
          // In a real app, this would check if the connected wallet has admin rights
          // For demo purposes, we'll just set it to true
          setIsAdmin(true);
          
          // Generate sample user data
          generateSampleUsers();
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    };
    
    checkConnection();
  }, []);

  const handleConnectWallet = () => {
    modal.open();
    // After successful connection (would be handled by the wallet provider)
    localStorage.setItem('walletConnected', 'true');
    setIsConnected(true);
  };
  
  const generateSampleUsers = () => {
    const sampleUsers: UserStats[] = [
      {
        id: '1',
        walletAddress: '0x1234...5678',
        uptime: 1200,
        points: 450,
        tasksCompleted: 3,
        lastActive: new Date().toLocaleDateString()
      },
      {
        id: '2',
        walletAddress: '0x5678...9012',
        uptime: 800,
        points: 320,
        tasksCompleted: 2,
        lastActive: new Date(Date.now() - 86400000).toLocaleDateString() // 1 day ago
      },
      {
        id: '3',
        walletAddress: '0x9012...3456',
        uptime: 1500,
        points: 580,
        tasksCompleted: 4,
        lastActive: new Date().toLocaleDateString()
      },
      {
        id: '4',
        walletAddress: '0x3456...7890',
        uptime: 300,
        points: 120,
        tasksCompleted: 1,
        lastActive: new Date(Date.now() - 172800000).toLocaleDateString() // 2 days ago
      },
      {
        id: '5',
        walletAddress: '0x7890...1234',
        uptime: 2000,
        points: 750,
        tasksCompleted: 5,
        lastActive: new Date().toLocaleDateString()
      }
    ];
    
    setUsers(sampleUsers);
  };
  
  const resetUserStats = (userId: string) => {
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        return {
          ...user,
          uptime: 0,
          points: 0,
          tasksCompleted: 0,
          lastActive: new Date().toLocaleDateString()
        };
      }
      return user;
    });
    
    setUsers(updatedUsers);
    alert(`User ${userId} stats have been reset`);
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">Admin Dashboard</h1>
      
      {!isConnected ? (
        <div className="connect-wallet-container">
          <p>Connect your wallet to access admin features</p>
          <button 
            onClick={handleConnectWallet}
            className="connect-wallet-button"
          >
            Connect Wallet
          </button>
        </div>
      ) : !isAdmin ? (
        <div className="not-admin-container">
          <p>You do not have admin privileges</p>
        </div>
      ) : (
        <>
          <div className="admin-stats">
            <div className="stat-card">
              <h3>Total Users</h3>
              <p>{users.length}</p>
            </div>
            <div className="stat-card">
              <h3>Total Points Distributed</h3>
              <p>{users.reduce((sum, user) => sum + user.points, 0)}</p>
            </div>
            <div className="stat-card">
              <h3>Active Today</h3>
              <p>{users.filter(user => user.lastActive === new Date().toLocaleDateString()).length}</p>
            </div>
          </div>
          
          <div className="users-table-container">
            <h2>User Management</h2>
            <div className="users-table">
              <div className="table-header">
                <span>ID</span>
                <span>Wallet Address</span>
                <span>Uptime (min)</span>
                <span>Points</span>
                <span>Tasks</span>
                <span>Last Active</span>
                <span>Actions</span>
              </div>
              
              {users.map(user => (
                <div key={user.id} className="table-row">
                  <span>{user.id}</span>
                  <span className="wallet-address">{user.walletAddress}</span>
                  <span>{user.uptime}</span>
                  <span>{user.points}</span>
                  <span>{user.tasksCompleted}</span>
                  <span>{user.lastActive}</span>
                  <span>
                    <button 
                      onClick={() => resetUserStats(user.id)}
                      className="reset-button"
                    >
                      Reset Stats
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="admin-actions">
            <h2>System Actions</h2>
            <div className="action-buttons">
              <button className="action-button">Distribute Rewards</button>
              <button className="action-button">Export User Data</button>
              <button className="action-button danger">Reset All Stats</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}