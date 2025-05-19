'use client'

import { useState, useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import './page.css';

export default function Dashboard() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [nodeActive, setNodeActive] = useState(false);
  const [userStats, setUserStats] = useState({
    uptime: 0,
    points: 0,
    tasksCompleted: 0
  });

  // Simulate node activity and update stats
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (nodeActive) {
      interval = setInterval(() => {
        setUserStats(prev => ({
          ...prev,
          uptime: prev.uptime + 1,
          points: prev.points + 0.1 // Simulate earning points for uptime
        }));
      }, 60000); // Update every minute
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [nodeActive]);

  // Load saved stats when wallet is connected
  useEffect(() => {
    if (isConnected) {
      // Load saved stats
      const savedStats = localStorage.getItem('userStats');
      if (savedStats) {
        setUserStats(JSON.parse(savedStats));
      }
      
      const savedNodeStatus = localStorage.getItem('nodeActive') === 'true';
      setNodeActive(savedNodeStatus);
    }
  }, [isConnected]);

  // Save stats to localStorage when they change
  useEffect(() => {
    if (isConnected) {
      localStorage.setItem('userStats', JSON.stringify(userStats));
      localStorage.setItem('nodeActive', String(nodeActive));
    }
  }, [userStats, nodeActive, isConnected]);

  const toggleNode = () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    setNodeActive(!nodeActive);
  };

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Dashboard</h1>
      
      {!isConnected ? (
        <div className="connect-wallet-container">
          <p>Connect your wallet to access the dashboard</p>
          <button onClick={() => {
            if (connectors.length > 0) {
              connect({ connector: connectors[0] });
            }
          }} className="connect-wallet-button">Connect Wallet</button>
        </div>
      ) : (
        <>
          <div className="stats-container">
            <div className="stat-card">
              <h3>Uptime</h3>
              <p>{userStats.uptime} minutes</p>
            </div>
            <div className="stat-card">
              <h3>Points Earned</h3>
              <p>{userStats.points.toFixed(1)}</p>
            </div>
            <div className="stat-card">
              <h3>Tasks Completed</h3>
              <p>{userStats.tasksCompleted}</p>
            </div>
          </div>
          
          <div className="node-control">
            <h2>Node Control</h2>
            <p>Current Status: {nodeActive ? 'Active' : 'Inactive'}</p>
            <button 
              onClick={toggleNode}
              className={`node-button ${nodeActive ? 'active' : 'inactive'}`}
            >
              {nodeActive ? 'Stop Node' : 'Start Node'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}