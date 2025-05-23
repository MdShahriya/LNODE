'use client'

import { useAccount, useSignMessage } from 'wagmi'
import { useEffect, useState } from 'react'
import './dashboard.css'
import React from 'react';

interface NodeStats {
  uptime: number
  points: number
  tasksCompleted: number
}

interface User {
  walletAddress: string
  points: number
  tasksCompleted: number
  uptime: number
  nodeStatus: boolean
  nodeStartTime: string | null
  createdAt: string
  updatedAt: string
}

export default function Dashboard() {
  const { address, isConnected } = useAccount()
  const [nodeStats, setNodeStats] = useState<NodeStats>({
    uptime: 0,
    points: 0,
    tasksCompleted: 0
  })
  const [isNodeRunning, setIsNodeRunning] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  // Track server-side start time
  const [startTime, setStartTime] = useState<number | null>(null)
  const [localPoints, setLocalPoints] = useState(0)
  const [secondsElapsed, setSecondsElapsed] = useState(0)
  // Add a state to track if we're currently processing a signature
  const [isProcessingSignature, setIsProcessingSignature] = useState(false)

  useEffect(() => {
    if (!isConnected || !address) return
    
    const registerOrFetchUser = async () => {
      try {
        setLoading(true)
        // Try to fetch existing user first
        const response = await fetch(`/api/user?walletAddress=${address}`)
        
        if (response.status === 404) {
          // User doesn't exist, create a new one
          const createResponse = await fetch('/api/user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ walletAddress: address }),
          })
          
          if (createResponse.ok) {
            const data = await createResponse.json()
            setUser(data.user)
            setIsNodeRunning(data.user.nodeStatus)
            setNodeStats({
              uptime: data.user.uptime,
              points: data.user.points,
              tasksCompleted: data.user.tasksCompleted
            })
            
            // If node is running, set the start time from server
            if (data.user.nodeStatus && data.user.nodeStartTime) {
              setStartTime(new Date(data.user.nodeStartTime).getTime())
            }
          }
        } else if (response.ok) {
          // User exists
          const data = await response.json()
          setUser(data.user)
          setIsNodeRunning(data.user.nodeStatus)
          setNodeStats({
            uptime: data.user.uptime,
            points: data.user.points,
            tasksCompleted: data.user.tasksCompleted
          })
          
          // If node is running, set the start time from server
          if (data.user.nodeStatus && data.user.nodeStartTime) {
            setStartTime(new Date(data.user.nodeStartTime).getTime())
          }
        }
      } catch (error) {
        console.error('Error registering/fetching user:', error)
      } finally {
        setLoading(false)
      }
    }
    
    registerOrFetchUser()
  }, [isConnected, address])

  const { data: signMessageData, isPending: isSignLoading, signMessage, reset: resetSignMessage } = useSignMessage()



  const toggleNode = async () => {
    // Prevent multiple clicks while processing
    if (isProcessingSignature) return;
    
    // If node is already running, request signature to stop it
    if (isNodeRunning) {
      const stopMessage = `I authorize stopping my TOPAY node with wallet ${address} at ${new Date().toISOString()}`;
      signMessage({ message: stopMessage });
      return;
    }
    
    // If trying to start the node, request signature verification first
    if (!isNodeRunning && user && address) {
      // Create a message with timestamp to prevent replay attacks
      const message = `I authorize starting my TOPAY node with wallet ${address} at ${new Date().toISOString()}`
      
      // Request signature from wallet
      signMessage({ message })
    }
  }
  
  // Effect to handle successful signature verification for start/stop
  useEffect(() => {
    const verifyAndUpdateNode = async () => {
      if (!signMessageData || !address || !user || isProcessingSignature) return
      
      try {
        // Set processing flag to prevent multiple executions
        setIsProcessingSignature(true);
        
        // Update node status after successful signature
        const newStatus = !isNodeRunning;
        
        if (newStatus) {
          // Starting the node - just update status
          const response = await fetch('/api/user/update-node-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              walletAddress: address,
              isRunning: true
            }),
          })
          
          if (response.ok) {
            const data = await response.json();
            // Update local state with server data
            if (data.user && data.user.nodeStartTime) {
              setStartTime(new Date(data.user.nodeStartTime).getTime());
            }
            setLocalPoints(0);
            setSecondsElapsed(0);
            setIsNodeRunning(true);
            if (user) {
              setUser({ ...user, nodeStatus: true, nodeStartTime: data.user.nodeStartTime });
            }
            console.log('Node started with server-tracked time');
          }
        } else {
          // Stopping the node - server will calculate points and update database
          const response = await fetch('/api/user/update-node-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              walletAddress: address,
              isRunning: false
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            // Reset local state
            setStartTime(null);
            setLocalPoints(0);
            setSecondsElapsed(0);
            setIsNodeRunning(false);
            
            // Update user data with the latest from server
            if (data.user) {
              setUser(data.user);
              setNodeStats({
                uptime: data.user.uptime,
                points: data.user.points,
                tasksCompleted: data.user.tasksCompleted
              });
            }
            console.log('Node stopped and points calculated on server');
          }
        }
      } catch (error) {
        console.error('Error updating node status:', error);
      } finally {
        // Reset signature data and processing flag
        resetSignMessage();
        setIsProcessingSignature(false);
      }
    }
    
    if (signMessageData && !isProcessingSignature) {
      verifyAndUpdateNode();
    }
  }, [signMessageData, address, user, isNodeRunning, startTime, isProcessingSignature, resetSignMessage])
  

  
  // Effect to handle UI updates for running node (display only, no database updates)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let statusTimer: NodeJS.Timeout | null = null;
    
    if (isNodeRunning && user && startTime) {
      // Timer for UI updates only
      timer = setInterval(() => {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTime) / 1000);
        const elapsedMinutes = elapsedSeconds / 60; // Minutes for points calculation
        const elapsedHours = elapsedSeconds / 3600; // Hours for uptime display
        
        // Calculate potential points at 30 points per minute (1800 per hour)
        const potentialPoints = elapsedMinutes * 30;
        
        setSecondsElapsed(elapsedSeconds);
        setLocalPoints(potentialPoints);
        
        // Update displayed stats (for UI only, not saved to database until stop)
        setNodeStats(prev => ({
          ...prev,
          points: user.points + potentialPoints,
          uptime: user.uptime + Math.floor(elapsedHours) // Only count full hours for uptime display
        }));
      }, 10000); // Update every 10 seconds for smoother UI

      // Heartbeat to keep node status active in backend
      statusTimer = setInterval(async () => {
        try {
          // Fetch latest user data to ensure we have the most up-to-date information
          const userResponse = await fetch(`/api/user?walletAddress=${address}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            // Only update if node is still running according to server
            if (userData.user.nodeStatus) {
              setUser(userData.user);
              // If server has a different start time, update our local copy
              if (userData.user.nodeStartTime) {
                const serverStartTime = new Date(userData.user.nodeStartTime).getTime();
                if (serverStartTime !== startTime) {
                  setStartTime(serverStartTime);
                }
              }
            } else {
              // Node was stopped on server, update local state
              setIsNodeRunning(false);
              setStartTime(null);
              setLocalPoints(0);
              setSecondsElapsed(0);
              setNodeStats({
                uptime: userData.user.uptime,
                points: userData.user.points,
                tasksCompleted: userData.user.tasksCompleted
              });
            }
          }
        } catch (error) {
          console.error('Error updating node status:', error);
        }
      }, 300000); // Heartbeat every 5 minutes
    }
    
    return () => {
      if (timer) {
        clearInterval(timer);
      }
      if (statusTimer) {
        clearInterval(statusTimer);
      }
    };
  }, [isNodeRunning, user, startTime, address]);

  // Check for existing node status on initial load
  useEffect(() => {
    // If we have a user with nodeStatus true but no local startTime,
    // we need to fetch the latest data from the server
    if (user && user.nodeStatus && !startTime && address) {
      // Fetch latest user data to ensure we have the most up-to-date information
      fetch(`/api/user?walletAddress=${address}`)
        .then(response => response.json())
        .then(data => {
          if (data.user.nodeStatus && data.user.nodeStartTime) {
            // Update local state with server data
            setStartTime(new Date(data.user.nodeStartTime).getTime());
            setIsNodeRunning(true);
            setUser(data.user);
          } else if (!data.user.nodeStatus) {
            // Node is not running on server, update local state
            setIsNodeRunning(false);
          }
        })
        .catch(error => {
          console.error('Error fetching user data on load:', error);
        });
    }
  }, [user, startTime, address]);

  // Format elapsed time
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        <h1 className="dashboard-heading">Node Operator Dashboard</h1>
        <p className="dashboard-subheading">Monitor your node&apos;s performance and manage uptime in real-time.</p>

        {!isConnected ? (
          <div className="alert-message">
            <p>Please connect your wallet to access your dashboard.</p>
          </div>
        ) : loading ? (
          <div className="loading-container">
            <p>Loading your node data...</p>
          </div>
        ) : (
          <>
            {/* User Welcome Message */}
            {user && (
              <div className="user-welcome">
                <p>Welcome, <span className="wallet-address">{user.walletAddress.substring(0, 6)}...{user.walletAddress.substring(user.walletAddress.length - 4)}</span></p>
              </div>
            )}

            {/* Node Stats */}
            <div className="stats-grid">
              <div className="stats-card">
                <h3 className="stats-title">Total Uptime</h3>
                <p className="stats-value">{nodeStats.uptime}h 0m</p>
                <span className="stats-label">Tracked uptime while node is active</span>
                {isNodeRunning && (
                  <span className="stats-elapsed">Current session: {formatElapsedTime(secondsElapsed)}</span>
                )}
              </div>
              
              <div className="stats-card">
                <h3 className="stats-title">Points Earned</h3>
                <p className="stats-value">{nodeStats.points.toFixed(3)}</p>
                <span className="stats-label">Points will save after stoping Node</span>
                {isNodeRunning && (
                  <span className="stats-update">Points: {localPoints.toFixed(3)}</span>
                )}
              </div>
              
              <div className="stats-card">
                <h3 className="stats-title">Tasks Completed</h3>
                <p className="stats-value">{nodeStats.tasksCompleted}</p>
                <span className="stats-label">Network tasks processed by your node</span>
              </div>
            </div>

            {/* Node Control */}
            <div className="node-control">
              <h3 className="control-title">Node Status: <span className={isNodeRunning ? "status-running" : "status-stopped"}>{isNodeRunning ? "Running" : "Stopped"}</span></h3>
              <button 
                className={`control-button ${isNodeRunning ? "stop-button" : "start-button"}`}
                onClick={toggleNode}
                disabled={isSignLoading || isProcessingSignature}
              >
                {isSignLoading ? "Waiting for signature..." : isProcessingSignature ? "Processing..." : isNodeRunning ? "Stop Node" : "Start Node"}
              </button>
              <p className="control-info">{isNodeRunning ? "Your node is active and earning points." : "Start your node to begin earning points."}</p>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

