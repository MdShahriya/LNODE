'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState, useCallback } from 'react'
import './dashboard.css'
import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ProcessedNodeSession } from '@/app/api/user/node-sessions/helpers';

// TOPAY Node Extension types are defined in global.d.ts

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

// Interface for user sessions/nodes
interface UserSession {
  id: string
  status: string
  statusIcon: string
  nodeType: string
  deviceIP: string
  browser: string
  platform: string
  deviceInfo: string
  pointsPerSecond: string
  totalUptime: string
  pointsEarned: string
  firstConnection: string
  lastConnection: string
  totalConnections: number
  isActive: boolean
}

// Enhanced interface for chart data
interface ChartDataPoint {
  date: string;
  points: number;
  uptime: number;
  sources?: {
    node: number;
    referral: number;
    task: number;
    checkin: number;
    other: number;
  };
  connectionTypes?: {
    login: number;
    node_start: number;
    node_stop: number;
    dashboard_view: number;
    other: number;
  };
}

// No sample data generation functions - removed to clean up code

export default function Dashboard() {
  const { address, isConnected } = useAccount()
  const [nodeStats, setNodeStats] = useState<NodeStats>({
    uptime: 0.00,
    points: 0,
    tasksCompleted: 0
  })
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  
  // State for chart data
  const [activityData, setActivityData] = useState<ChartDataPoint[]>([])
  // State to toggle between different chart views
  const [activeChart, setActiveChart] = useState('points')
  // Add state for referral link
  const [referralCount] = useState(0)
  // Add state for chart data type
  const [chartDataType, setChartDataType] = useState('points')
  // Add state for today's earnings
  const [todaysEarnings, setTodaysEarnings] = useState(0.00);
  const [userSessions, setUserSessions] = useState<UserSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  // Function to fetch today's earnings
  const fetchTodaysEarnings = useCallback(async () => {
    if (!address) return;
    
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's earnings from API
      const response = await fetch(`/api/user/daily-earnings?walletAddress=${address}&date=${today}`);
      
      if (response.ok) {
        const data = await response.json();
        // Update today's earnings with actual data
        setTodaysEarnings(data.points);
      }
    } catch (error) {
      console.error('Error fetching today\'s earnings:', error);
    }
  }, [address]);

  // Fetch today's earnings on initial load and periodically
  useEffect(() => {
    if (!isConnected || !address) return;
    
    // Fetch immediately
    fetchTodaysEarnings();
    
    // Set up interval to refresh data every minute
    const intervalId = setInterval(fetchTodaysEarnings, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [address, isConnected, fetchTodaysEarnings]);

  // Fetch user sessions/nodes
  useEffect(() => {
    if (!address) return;
    
    setLoadingSessions(true);
    fetch(`/api/user/sessions?walletAddress=${address}`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setUserSessions(data.sessions || []);
        }
      })
      .catch(error => {
        console.error('Error fetching user sessions:', error);
      })
      .finally(() => {
        setLoadingSessions(false);
      });
  }, [address]); 

  // Function to safely fetch historical data with type checking
  const fetchHistoricalDataSafe = useCallback(async (walletAddress: string | undefined, days = 7, dataType = 'points') => {
    if (!walletAddress) return createEmptyChartData(days, dataType);
    
    try {
      const response = await fetch(`/api/user/node-sessions?walletAddress=${walletAddress}&days=${days}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Transform the node sessions data into the format expected by the charts
        const chartData = data.sessions.map((session: ProcessedNodeSession) => {
          const date = new Date(session.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          
          // Create data point based on the requested data type
          if (dataType === 'points') {
            return {
              date,
              points: parseFloat(session.pointsEarned.toString()) || 0,
              sources: {
                node: parseFloat(session.pointsEarned.toString()) || 0,
                referral: 0,
                task: 0,
                checkin: 0,
                other: 0
              }
            } as ChartDataPoint;
          } else { // connections
            return {
              date,
              uptime: parseFloat(session.uptime.toString()) / 3600 || 0, // Convert seconds to hours
              connectionTypes: {
                login: 1,
                node_start: session.status === 'active' ? 1 : 0,
                node_stop: session.status !== 'active' ? 1 : 0,
                dashboard_view: 1,
                other: 0
              }
            } as ChartDataPoint;
          }
        });
        
        // Group by date and aggregate values
        const groupedData = chartData.reduce((acc: ChartDataPoint[], item: ChartDataPoint) => {
          const existingItem = acc.find((i: ChartDataPoint) => i.date === item.date);
          
          if (existingItem) {
            // Update existing item
            if (dataType === 'points') {
              existingItem.points += item.points;
              if (existingItem.sources && item.sources) {
                existingItem.sources.node += item.sources.node;
              }
            } else { // connections
              existingItem.uptime += item.uptime;
              if (existingItem.connectionTypes && item.connectionTypes) {
                existingItem.connectionTypes.node_start += item.connectionTypes.node_start;
                existingItem.connectionTypes.node_stop += item.connectionTypes.node_stop;
              }
            }
          } else {
            // Add new item
            acc.push(item);
          }
          
          return acc;
        }, []);
        
        // Sort by date
        groupedData.sort((a: ChartDataPoint, b: ChartDataPoint) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });
        
        // Ensure we have data for all days
        const dates = Array.from({ length: days }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (days - i - 1));
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        
        const result = dates.map(date => {
          const existingData = groupedData.find((item: ChartDataPoint) => item.date === date);
          
          if (existingData) {
            return existingData;
          } else {
            // Create empty data point
            if (dataType === 'points') {
              return {
                date,
                points: 0,
                sources: {
                  node: 0,
                  referral: 0,
                  task: 0,
                  checkin: 0,
                  other: 0
                }
              } as ChartDataPoint;
            } else { // connections
              return {
                date,
                uptime: 0,
                connectionTypes: {
                  login: 0,
                  node_start: 0,
                  node_stop: 0,
                  dashboard_view: 0,
                  other: 0
                }
              };
            }
          }
        });
        
        return result;
      }
      
      // If there's an error, return empty chart data
      return createEmptyChartData(days, dataType);
    } catch (error) {
      console.error('Error fetching session data:', error);
      return createEmptyChartData(days, dataType);
    }
  }, []);
  
  // Helper function to create empty chart data
  const createEmptyChartData = (days = 7, dataType = 'points'): ChartDataPoint[] => {
    const dates = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    return dates.map(date => {
      if (dataType === 'points') {
        return {
          date,
          points: 0,
          sources: {
            node: 0,
            referral: 0,
            task: 0,
            checkin: 0,
            other: 0
          }
        } as ChartDataPoint;
      } else { // connections
        return {
          date,
          uptime: 0,
          connectionTypes: {
            login: 0,
            node_start: 0,
            node_stop: 0,
            dashboard_view: 0,
            other: 0
          }
        } as ChartDataPoint;
      }
    });
  };

  useEffect(() => {
    if (!isConnected || !address) return;
    
    const registerOrFetchUser = async () => {
      try {
        setLoading(true);
        // Try to fetch existing user first
        const response = await fetch(`/api/user?walletAddress=${address}`);
        
        if (response.status === 404) {
          // User doesn't exist, create a new one
          const createResponse = await fetch('/api/user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ walletAddress: address }),
          });
          
          if (createResponse.ok) {
            const data = await createResponse.json();
            setUser(data.user);
            setNodeStats({
              uptime: secondsToHours(data.user.uptime),
              points: data.user.points,
              tasksCompleted: data.user.tasksCompleted
            });
            
            // Fetch real historical data from API
            const historyData = await fetchHistoricalDataSafe(address, 7, chartDataType);
            setActivityData(historyData);
          }
        } else if (response.ok) {
          // User exists
          const data = await response.json();
          setUser(data.user);
          setNodeStats({
              uptime: secondsToHours(data.user.uptime),
              points: data.user.points,
              tasksCompleted: data.user.tasksCompleted
            });
          
          // Fetch real historical data from API
          const historyData = await fetchHistoricalDataSafe(address, 7, chartDataType);
          setActivityData(historyData);
        }
        
        // Store wallet address for access
        if (address) {
          localStorage.setItem('walletAddress', address);
          
          // Connect wallet address to TOPAY Node Extension if installed
          if (window.topayNodeExtensionDetected && window.topayNodeExtension) {
            try {
              console.log('TOPAY Node Extension detected, connecting wallet...');
              // Add a delay before connecting to ensure the extension is ready
              setTimeout(() => {
                // Add type check to ensure topayNodeExtension exists
                if (window.topayNodeExtension && typeof window.topayNodeExtension.connectWallet === 'function') {
                  window.topayNodeExtension.connectWallet(address)
                    .then(() => {
                      console.log('Wallet connected to TOPAY Node Extension successfully');
                    })
                    .catch((error: Error) => {
                      console.error('Error connecting wallet to TOPAY Node Extension:', error);
                      // Don't throw the error, just log it to prevent UI disruption
                    });
                } else {
                  console.warn('TOPAY Node Extension detected but connectWallet method is not available');
                }
              }, 500);
            } catch (error) {
              console.error('Error connecting to TOPAY Node Extension:', error);
              // Don't throw the error, just log it to prevent UI disruption
            }
          }
          
          // Device tracking and session creation removed as requested
        }
      } catch (error) {
        console.error('Error registering/fetching user:', error);
      } finally {
        setLoading(false);
      }
    };
    
    registerOrFetchUser();
  }, [isConnected, address, chartDataType, fetchHistoricalDataSafe]);

  // Effect to refresh history data periodically
  useEffect(() => {
    if (!isConnected || !address) return;
    
    const refreshHistoryData = async () => {
      try {
        const historyData = await fetchHistoricalDataSafe(address, 7, chartDataType);
        if (historyData.length > 0) {
          setActivityData(historyData);
        }
      } catch (error) {
        console.error('Error refreshing session data:', error);
      }
    };
    
    // Refresh immediately on chart type change
    refreshHistoryData();
    
    // Set up interval to refresh data every minute
    const intervalId = setInterval(refreshHistoryData, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [address, isConnected, chartDataType, fetchHistoricalDataSafe]);

  // Update activity data when node stats change
  useEffect(() => {
    if (user && nodeStats) {
      const currentDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const lastEntry = activityData[activityData.length - 1];

      // Only update if the date or values have changed
      if (!lastEntry || lastEntry.date !== currentDate || 
          lastEntry.points !== nodeStats.points || 
          lastEntry.uptime !== nodeStats.uptime) {
        // Create a new array with the updated current day data
        const newActivityData = [...activityData];
        
        // Find the index of today's entry
        const todayIndex = newActivityData.findIndex(entry => entry.date === currentDate);
        
        if (todayIndex >= 0) {
          // Update today's entry
          newActivityData[todayIndex] = {
            ...newActivityData[todayIndex],
            date: currentDate,
            points: nodeStats.points,
            uptime: nodeStats.uptime
          };
        } else {
          // If today's entry doesn't exist, add it by replacing the oldest entry
          newActivityData.shift(); // Remove the oldest entry
          newActivityData.push({
            date: currentDate,
            points: nodeStats.points,
            uptime: nodeStats.uptime,
            sources: {
              node: Math.floor(nodeStats.points * 0.8),
              referral: Math.floor(nodeStats.points * 0.1),
              task: Math.floor(nodeStats.points * 0.05),
              checkin: Math.floor(nodeStats.points * 0.05),
              other: 0
            },
            connectionTypes: {
              login: 1,
              node_start: 0,
              node_stop: 0,
              dashboard_view: 1,
              other: 0
            }
          });
        }
        
        setActivityData(newActivityData);
      }
    }
  }, [nodeStats, user, activityData]); 

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
              {activityData[0]?.sources && (
                <>
                  <Line type="monotone" dataKey="sources.node" name="Node" stroke="#15CFF1" strokeWidth={1} dot={false} />
                  <Line type="monotone" dataKey="sources.referral" name="Referral" stroke="#F1C40F" strokeWidth={1} dot={false} />
                  <Line type="monotone" dataKey="sources.task" name="Task" stroke="#2ECC71" strokeWidth={1} dot={false} />
                  <Line type="monotone" dataKey="sources.checkin" name="Check-in" stroke="#E74C3C" strokeWidth={1} dot={false} />
                </>
              )}
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
              {activityData[0]?.connectionTypes && (
                <>
                  <Bar dataKey="connectionTypes.login" name="Logins" stackId="a" fill="#F1C40F" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="connectionTypes.dashboard_view" name="Dashboard Views" stackId="a" fill="#2ECC71" radius={[4, 4, 0, 0]} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  // Memoized conversion functions
  const secondsToHours = (seconds: number) => Math.floor(seconds / 3600);

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
            <div className="dashboard-header">
              <h1 className="main-dashboard-title">Analytics Dashboard</h1>
              <div className="referral-section">
                <span className="referral-count">Referrals: {referralCount}</span>
                <button className="copy-referral-button" onClick={() => {
                  // Only create and copy link if wallet address is available
                  if (address) {
                    const link = `${window.location.origin}/ref/${address}`;
                    navigator.clipboard.writeText(link);
                    alert('Referral link copied to clipboard!');
                  } else {
                    alert('No wallet connected. Please connect a wallet first.');
                  }
                }}>
                  Copy referral link
                </button>
              </div>
              <div className="user-section">
                <span className="greeting">
                  Hi, {address ? 
                    address.substring(0, 6) + '...' + address.substring(address.length - 4) : 
                    'User'}
                </span>
              </div>
            </div>

            {/* Rest of the dashboard UI */}
            <div className="earnings-section">
              <h2 className="section-title">Earnings</h2>
              <div className="earnings-cards">
                <div className="earnings-card">
                  <h3 className="earnings-title">Total Earnings:</h3>
                  <p className="earnings-value">{nodeStats?.points ? nodeStats.points.toFixed(2) : '0.00'} pt</p>
                  <span className="earnings-detail">Total earnings from various activity</span>
                </div>
                <div className="earnings-card">
                  <h3 className="earnings-title">Today&apos;s Earnings:</h3>
                  <p className="earnings-value">{todaysEarnings ? todaysEarnings.toFixed(2) : '0.00'} pt</p>
                  <span className="earnings-detail">Today&apos;s Total earnings</span>
                </div>
              </div>
            </div>

            <div className="earnings-statistics">
              <h2 className="section-title">Earnings Statistics</h2>
              <div className="chart-controls">
                <button 
                  className={`chart-button ${activeChart === 'points' ? 'active' : ''}`}
                  onClick={() => setActiveChart('points')}
                >
                  Points
                </button>
                <button 
                  className={`chart-button ${activeChart === 'uptime' ? 'active' : ''}`}
                  onClick={() => setActiveChart('uptime')}
                >
                  Uptime
                </button>
                <select 
                  className="chart-data-type" 
                  value={chartDataType}
                  onChange={(e) => setChartDataType(e.target.value)}
                >
                  <option value="points">Points History</option>
                  <option value="connections">Connection History</option>
                </select>
              </div>
              <div className="chart-container">
                {renderActiveChart()}
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-dot extension"></span>
                  <span className="legend-text">Earnings Analytics</span>
                </div>
              </div>
            </div>

            <div className="nodes-section">
              <div className="nodes-header">
                <h2 className="section-title">Your Sessions</h2>
                <button className="view-all-button">View All</button>
              </div>
              <div className="nodes-table">
                <div className="table-header">
                  <div className="header-cell status">Status</div>
                  <div className="header-cell node">Session</div>
                  <div className="header-cell id">Unique ID</div>
                  <div className="header-cell ip">IP</div>
                  <div className="header-cell pts">PT/S</div>
                  <div className="header-cell uptime">Total Uptime</div>
                  <div className="header-cell points">Points Earned</div>
                </div>
                {loadingSessions ? (
                  <div className="table-row">
                    <div className="cell status">⏳ Loading...</div>
                    <div className="cell node">Loading...</div>
                    <div className="cell id">---</div>
                    <div className="cell ip">---</div>
                    <div className="cell pts">---</div>
                    <div className="cell uptime">---</div>
                    <div className="cell points">---</div>
                  </div>
                ) : userSessions.length > 0 ? (
                  userSessions.map((session) => (
                    <div key={session.id} className="table-row">
                      <div className="cell status">{session.statusIcon} {session.status}</div>
                      <div className="cell node">{session.nodeType}</div>
                      <div className="cell id">{session.id}</div>
                      <div className="cell ip">{session.deviceIP}</div>
                      <div className="cell pts">{session.pointsPerSecond}</div>
                      <div className="cell uptime">{session.totalUptime}</div>
                      <div className="cell points">{session.pointsEarned}</div>
                    </div>
                  ))
                ) : (
                  <div className="table-row">
                    <div className="cell status">🔴 No Sessions</div>
                    <div className="cell node">No active sessions</div>
                    <div className="cell id">---</div>
                    <div className="cell ip">---</div>
                    <div className="cell pts">0.0</div>
                    <div className="cell uptime">0 hrs</div>
                    <div className="cell points">0 pt</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
