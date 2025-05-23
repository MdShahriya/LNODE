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
              uptime: secondsToHours(data.user.uptime),
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
              uptime: secondsToHours(data.user.uptime),
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
              const serverStartTime = new Date(data.user.nodeStartTime).getTime();
              setStartTime(serverStartTime);
              
              // Cache start time in localStorage
              if (typeof window !== 'undefined') {
                localStorage.setItem('startTime', serverStartTime.toString());
                localStorage.setItem('localPoints', '0');
                localStorage.setItem('secondsElapsed', '0');
              }
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
            
            // Clear localStorage cache
            if (typeof window !== 'undefined') {
              localStorage.removeItem('localPoints');
              localStorage.removeItem('secondsElapsed');
              localStorage.removeItem('startTime');
            }
            
            // Update user data with the latest from server
            if (data.user) {
              setUser(data.user);
              setNodeStats({
                uptime: secondsToHours(data.user.uptime),
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
  

  
  // Initialize state from localStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Retrieve cached local points if available
      const cachedLocalPoints = localStorage.getItem('localPoints');
      const cachedStartTime = localStorage.getItem('startTime');
      const cachedSecondsElapsed = localStorage.getItem('secondsElapsed');
      
      if (cachedLocalPoints) {
        setLocalPoints(parseFloat(cachedLocalPoints));
      }
      
      if (cachedSecondsElapsed) {
        setSecondsElapsed(parseInt(cachedSecondsElapsed, 10));
      }
      
      // Only set startTime from localStorage if we don't have a server value yet
      if (cachedStartTime && !startTime) {
        setStartTime(parseInt(cachedStartTime, 10));
      }
    }
  }, [startTime]);

  // Memoized conversion functions
  const secondsToHours = (seconds: number) => Math.floor(seconds / 3600);
  const secondsToMinutes = (seconds: number) => seconds / 60;

  // Effect to handle UI updates for running node (display only, no database updates)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let statusTimer: NodeJS.Timeout | null = null;
    
    if (isNodeRunning && user && startTime) {
      // Timer for UI updates only
      timer = setInterval(() => {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTime) / 1000);
        
        // Use memoized conversion functions
        const elapsedMinutes = secondsToMinutes(elapsedSeconds);
        const potentialPoints = elapsedMinutes * 30;
        
        setSecondsElapsed(elapsedSeconds);
        setLocalPoints(potentialPoints);
        
        // Cache values in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('localPoints', potentialPoints.toString());
          localStorage.setItem('secondsElapsed', elapsedSeconds.toString());
          localStorage.setItem('startTime', startTime.toString());
        }
        
        // Update displayed stats (for UI only, not saved to database until stop)
        setNodeStats(prev => {
          // Use memoized conversion for both uptime values
          const uptimeHours = secondsToHours(user.uptime);
          const additionalHours = secondsToHours(elapsedSeconds);
          
          return {
            ...prev,
            points: user.points + potentialPoints,
            uptime: uptimeHours + additionalHours
          };
        });
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
                  // Update localStorage with new start time
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('startTime', serverStartTime.toString());
                  }
                }
              }
            } else {
              // Node was stopped on server, update local state
              setIsNodeRunning(false);
              setStartTime(null);
              setLocalPoints(0);
              setSecondsElapsed(0);
              
              // Clear localStorage cache
              if (typeof window !== 'undefined') {
                localStorage.removeItem('localPoints');
                localStorage.removeItem('secondsElapsed');
                localStorage.removeItem('startTime');
              }
              
              setNodeStats({
              uptime: secondsToHours(userData.user.uptime),
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
            const serverStartTime = new Date(data.user.nodeStartTime).getTime();
            setStartTime(serverStartTime);
            setIsNodeRunning(true);
            
            // Cache values in localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('startTime', serverStartTime.toString());
              // Initialize with zeros, will be updated in the next UI update cycle
              localStorage.setItem('localPoints', '0');
              localStorage.setItem('secondsElapsed', '0');
            }
            
            // Convert uptime from seconds to hours for display
            setNodeStats({
              uptime: secondsToHours(data.user.uptime),
              points: data.user.points,
              tasksCompleted: data.user.tasksCompleted
            });
          } else if (!data.user.nodeStatus) {
            // Node is not running on server, update local state
            setIsNodeRunning(false);
            setStartTime(null);
            
            // Clear localStorage cache
            if (typeof window !== 'undefined') {
              localStorage.removeItem('localPoints');
              localStorage.removeItem('secondsElapsed');
              localStorage.removeItem('startTime');
            }
            
            // Convert uptime from seconds to hours for display
            setNodeStats({
              uptime: secondsToHours(data.user.uptime),
              points: data.user.points,
              tasksCompleted: data.user.tasksCompleted
            });
          }
        })
        .catch(error => {
          console.error('Error checking node status:', error);
        });
    }
  }, [user, startTime, address]);

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        {!isConnected ? (
          <p>Please connect your wallet to continue.</p>
        ) : loading ? (
          <div className="stats-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="stats-card stats-loading">
                <h3 className="stats-title">Loading...</h3>
                <p className="stats-value loading">0</p>
                <span className="stats-label">&nbsp;</span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <h1 className="dashboard-heading">Node Dashboard</h1>
            <p className="dashboard-subheading">Monitor your node&apos;s performance and earnings</p>
            
            <div className="stats-grid">
              <div className="stats-card">
                <h3 className="stats-title">Total Uptime</h3>
                <p className="stats-value">{nodeStats.uptime} hours</p>
                <span className="stats-label">Time your node has been active</span>
                {isNodeRunning && (
                  <span className="stats-update">Time: {secondsToHours(secondsElapsed)} hours {Math.floor((secondsElapsed % 3600) / 60)} minutes</span>
                )}
              </div>
              
              <div className="stats-card">
                <h3 className="stats-title">Points Earned</h3>
                <p className="stats-value">{nodeStats.points.toFixed(3)}</p>
                <span className="stats-label">Points will add after current Uptime ends.</span>
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

