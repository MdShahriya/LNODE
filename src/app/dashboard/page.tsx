'use client'

import { useAccount, useSignMessage } from 'wagmi'
import { useEffect, useState } from 'react'
import './dashboard.css'
import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

// Sample data for charts - in a real implementation, this would come from API
const generateSampleData = (days = 7) => {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      points: Math.floor(Math.random() * 500) + 100,
      uptime: Math.floor(Math.random() * 8) + 1,
    };
  });
};

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
  // Sample data for charts
  const [activityData, setActivityData] = useState(generateSampleData())
  // State to toggle between different chart views
  const [activeChart, setActiveChart] = useState('points')

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
        
        // Store wallet address for extension access
        if (address) {
          localStorage.setItem('walletAddress', address)
          // Notify extension API about wallet connection
          try {
            await fetch('/api/extension/wallet', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ walletAddress: address }),
            })
          } catch (error) {
            console.log('Extension API not available:', error)
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

  // Update activity data when node stats change
  useEffect(() => {
    if (user && nodeStats) {
      const currentDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const lastEntry = activityData[activityData.length - 1];

      // Only update if the date or values have changed
      if (!lastEntry || lastEntry.date !== currentDate || 
          lastEntry.points !== nodeStats.points || 
          lastEntry.uptime !== nodeStats.uptime) {
        const newActivityData = [
          ...activityData.slice(1),
          {
            date: currentDate,
            points: nodeStats.points,
            uptime: nodeStats.uptime
          }
        ];
        setActivityData(newActivityData);
      }
    }
  }, [nodeStats, user, isNodeRunning, activityData]); // Remove activityData from dependencies

  // Function to render the active chart
  const renderActiveChart = () => {
    switch(activeChart) {
      case 'points':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={activityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#252833', border: 'none', borderRadius: '8px' }} 
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="points" stroke="#0D7CE9" strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'uptime':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#252833', border: 'none', borderRadius: '8px' }} 
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Bar dataKey="uptime" fill="#15CFF1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

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
  
  // Constants
  const MAX_NODE_RUNTIME_SECONDS = 24 * 60 * 60; // 24 hours in seconds

  // State to track remaining time
  const [remainingTime, setRemainingTime] = useState<string>('');

  // Format remaining time
  const formatRemainingTime = (seconds: number): string => {
    if (seconds <= 0) return '0h 0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${hours}h ${minutes}m`;
  };

  // Format time for display
  
  // Effect to handle UI updates for running node (display only, no database updates)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let statusTimer: NodeJS.Timeout | null = null;
    let autoStopTimer: NodeJS.Timeout | null = null;
    
    // Function to automatically stop the node after 24 hours
    const autoStopNode = async () => {
      try {
        // Update local state
        setIsNodeRunning(false);
        setRemainingTime('0h 0m');
        setStartTime(null);
        setLocalPoints(0);
        setSecondsElapsed(0);
        
        // Clear localStorage items
        if (typeof window !== 'undefined') {
          localStorage.removeItem('startTime');
          localStorage.removeItem('localPoints');
          localStorage.removeItem('secondsElapsed');
          localStorage.removeItem('isNodeRunning');
        }
        
        // Update user data to reflect stopped node
        if (user && address) {
          // Call API to update node status in the database
          await fetch('/api/user/update-node-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              walletAddress: address,
              isRunning: false,
              autoStopped: true // Indicate this was an automatic stop
            }),
          }).then(response => {
            if (response.ok) {
              return response.json();
            }
          }).then(data => {
            if (data && data.user) {
              setUser(data.user);
              setNodeStats({
                uptime: secondsToHours(data.user.uptime),
                points: data.user.points,
                tasksCompleted: data.user.tasksCompleted
              });
            }
          });
        }
        
        console.log('Node auto-stopped after 24 hours');
      } catch (error) {
        console.error('Error auto-stopping node:', error);
      }
    };
    
    if (isNodeRunning && user && startTime) {
      // Timer for UI updates only
      timer = setInterval(() => {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTime) / 1000);
        const remainingSeconds = MAX_NODE_RUNTIME_SECONDS - elapsedSeconds;
        
        // Update remaining time display
        setRemainingTime(formatRemainingTime(remainingSeconds));
        
        // Check if node has been running for more than 24 hours
        if (elapsedSeconds >= MAX_NODE_RUNTIME_SECONDS) {
          // Auto-stop the node after 24 hours
          console.log('Node has been running for 24 hours - auto stopping');
          autoStopNode();
          return;
        }
        
        // Use memoized conversion functions
        const elapsedMinutes = secondsToMinutes(elapsedSeconds);
        const potentialPoints = elapsedMinutes * 12;
        
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
      }, 1000); // Update every second for smoother UI

      // Set a timer to automatically stop the node after 24 hours
      autoStopTimer = setTimeout(() => {
        console.log('24-hour timer expired - auto stopping node');
        autoStopNode();
      }, Math.max(0, MAX_NODE_RUNTIME_SECONDS * 1000 - (Date.now() - startTime)));
  
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
      if (autoStopTimer) {
        clearTimeout(autoStopTimer);
      }
    };
  }, [isNodeRunning, user, startTime, address, MAX_NODE_RUNTIME_SECONDS]);

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
          <div className="connect-wallet">
          <p>Please connect your wallet to continue.</p>
          <appkit-connect-button />
          </div>
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
                <span className="stats-label">Earn points by running NODE</span>
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

            {/* Analytics Section */}
            <div className="analytics-section">
              <h2 className="analytics-heading">Node Analytics</h2>
              <div className="chart-controls">
                <button 
                  className={`chart-button ${activeChart === 'points' ? 'active' : ''}`}
                  onClick={() => setActiveChart('points')}
                >
                  Points History
                </button>
                <button 
                  className={`chart-button ${activeChart === 'uptime' ? 'active' : ''}`}
                  onClick={() => setActiveChart('uptime')}
                >
                  Uptime History
                </button>
              </div>
              <div className="chart-container">
                {renderActiveChart()}
              </div>
              <p className="chart-disclaimer">* Sample data shown. Historical data will be available as you use your node.</p>
            </div>

            {/* Node Control */}
            <div className="node-control">
              <h3 className="control-title">Node Status: <span className={isNodeRunning ? "status-running" : "status-stopped"}>{isNodeRunning ? "Running" : "Stopped"}</span></h3>
              {isNodeRunning && (
                <div className="time-limit-info">
                  <p>Time remaining: <span className="remaining-time">{remainingTime}</span></p>
                  <p className="time-limit-note">Nodes automatically stop after 24 hours and must be manually restarted.</p>
                </div>
              )}
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
