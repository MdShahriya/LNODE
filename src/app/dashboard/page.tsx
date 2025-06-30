'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState, useCallback } from 'react'
import './dashboard.css'
import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ProcessedNodeSession } from '@/app/api/user/node-sessions/helpers';
import { motion } from 'framer-motion';

// Interface for raw node session data from API
interface RawNodeSession {
  sessionId: string;
  status: string;
  endTime?: string;
  nodeType?: string;
  deviceIP?: string;
  browser?: string;
  platform?: string;
  deviceInfo?: string;
  uptime?: number; // API returns uptime in seconds as number
  pointsEarned?: number; // API returns points as number
  startTime: string;
  lastHeartbeat?: string;
  sessionDuration?: number;
  performanceScore?: number;
  nodeQuality?: string;
  location?: string;
  statusIcon?: string;
}

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

// Lottery winner interfaces
interface LotteryWinner {
  id: string
  date: string
  walletAddress: string
  username: string | null
  prize: number
}

interface LotteryResponse {
  winners: LotteryWinner[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
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
  
  // Lottery winner state
  const [todaysWinner, setTodaysWinner] = useState<LotteryWinner | null>(null)
  const [lotteryLoading, setLotteryLoading] = useState(true)
  const [lotteryError, setLotteryError] = useState<string | null>(null)

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
        // Update today's earnings with actual data from stats.totalPoints
        if (data.success && data.stats) {
          setTodaysEarnings(data.stats.totalPoints);
        }
      }
    } catch (error) {
      console.error('Error fetching today\'s earnings:', error);
    }
  }, [address]);

  // Check if a date is today
  const isToday = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Fetch today's lottery winner from API
  const fetchTodaysWinner = useCallback(async () => {
    try {
      setLotteryLoading(true)
      setLotteryError(null)
      
      // Fetch all winners and filter for today on frontend
      const response = await fetch('/api/lottery/winners?page=1&limit=100')
      
      if (!response.ok) {
        throw new Error('Failed to fetch lottery winners')
      }
      
      const data: LotteryResponse = await response.json()
      
      // Find today's winner (should be only one)
      const todaysWinner = data.winners.find(winner => isToday(winner.date))
      setTodaysWinner(todaysWinner || null)
    } catch (err) {
      console.error('Error fetching lottery winner:', err)
      setLotteryError('Failed to load today\'s lottery winner.')
    } finally {
      setLotteryLoading(false)
    }
  }, [])

  // Format wallet address for display
  const formatWalletAddress = (address: string) => {
    if (!address) return 'Unknown'
    return `${address.slice(0, 8)}...${address.slice(-6)}`
  }

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

  // Fetch today's lottery winner on component mount
  useEffect(() => {
    fetchTodaysWinner()
  }, [fetchTodaysWinner])

  // Function to fetch user sessions
  const fetchUserSessions = useCallback(async () => {
    if (!address) return;
    
    try {
      const response = await fetch(`/api/user/node-sessions?walletAddress=${address}&days=7`);
      const data = await response.json();
      
      if (data.success) {
        // Convert node sessions to UserSession format and sort
        const convertedSessions = (data.sessions || []).map((session: RawNodeSession) => {
          // Calculate points per second from available data
          const uptimeInSeconds = typeof session.uptime === 'string' ? parseFloat(session.uptime) : (session.uptime || 0);
          const pointsEarned = typeof session.pointsEarned === 'string' ? parseFloat(session.pointsEarned) : (session.pointsEarned || 0);
          const pointsPerSecond = uptimeInSeconds > 0 ? (pointsEarned / uptimeInSeconds) : 0;
          
          // Format uptime from seconds to readable format (h:m format)
           const formatUptime = (seconds: number): string => {
             const hours = Math.floor(seconds / 3600);
             const minutes = Math.floor((seconds % 3600) / 60);
             return `${hours}:${minutes.toString().padStart(2, '0')}`;
           };
          
          // Improved status detection logic
          const isRecentlyActive = session.lastHeartbeat && 
            new Date(session.lastHeartbeat).getTime() > Date.now() - 5 * 60 * 1000; // Active in last 5 minutes
          const isCurrentlyActive = session.status === 'active' && !session.endTime && isRecentlyActive;
          
          return {
            id: session.sessionId,
            status: isCurrentlyActive ? 'Connected' : 'Disconnected',
            statusIcon: isCurrentlyActive ? '🟢' : '🔴',
            nodeType: session.nodeType || 'Extension Node',
            deviceIP: session.deviceIP || 'Unknown',
            browser: session.browser || 'Unknown',
            platform: session.platform || 'Unknown',
            deviceInfo: session.deviceInfo || 'Unknown',
            pointsPerSecond: pointsPerSecond.toFixed(4),
            totalUptime: formatUptime(uptimeInSeconds),
            pointsEarned: `${pointsEarned.toFixed(2)} pt`,
            firstConnection: session.startTime,
            lastConnection: session.endTime || session.lastHeartbeat || session.startTime,
            totalConnections: 1,
            isActive: session.status === 'active' && !session.endTime
          };
        });
        
        // Sort sessions with active sessions first, then by last connection
        const sortedSessions = convertedSessions.sort((a: { status: string; lastConnection: string | number | Date; }, b: { status: string; lastConnection: string | number | Date; }) => {
          // First sort by connection status (connected sessions first)
          if (a.status === 'Connected' && b.status !== 'Connected') return -1;
          if (a.status !== 'Connected' && b.status === 'Connected') return 1;
          
          // Then sort by lastConnection date (newest first)
          const dateA = new Date(a.lastConnection);
          const dateB = new Date(b.lastConnection);
          return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
        });
        setUserSessions(sortedSessions);
      }
    } catch (error) {
      console.error('Error fetching user sessions:', error);
    }
  }, [address]);

  // Fetch user sessions/nodes on initial load and periodically
  useEffect(() => {
    if (!address) return;
    
    setLoadingSessions(true);
    
    // Fetch immediately
    fetchUserSessions().finally(() => {
      setLoadingSessions(false);
    });
    
    // Set up interval to refresh sessions every 10 seconds (synchronized with extension)
    const intervalId = setInterval(fetchUserSessions, 10000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [address, fetchUserSessions]); 

  // Function to safely fetch historical data with type checking
  const fetchHistoricalDataSafe = useCallback(async (walletAddress: string | undefined, days = 7, dataType = 'points') => {
    if (!walletAddress) return createEmptyChartData(days, dataType);
    
    try {
      // Use the daily-earnings API endpoint instead of node-sessions for more accurate data
      const response = await fetch(`/api/user/daily-earnings?walletAddress=${walletAddress}&includeDetails=true`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Create an array of dates for the last 'days' days
        const dates = Array.from({ length: days }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (days - i - 1));
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        
        // Create chart data with proper date distribution
        const chartData = dates.map(date => {
          // Default empty data point
          const dataPoint = {
            date,
            points: 0,
            uptime: 0,
            sources: {
              node: 0,
              referral: 0,
              task: 0,
              checkin: 0,
              other: 0
            },
            connectionTypes: {
              login: 0,
              node_start: 0,
              node_stop: 0,
              dashboard_view: 0,
              other: 0
            }
          } as ChartDataPoint;
          
          // If this is today's date, use today's earnings from the API
          const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (date === today) {
            dataPoint.points = data.stats?.totalPoints || 0;
            
            // If we have source breakdown, use it
            if (data.sourceBreakdown) {
              Object.entries(data.sourceBreakdown).forEach(([source, details]: [string, unknown]) => {
                // Ensure sources exists before accessing its properties
                if (!dataPoint.sources) return;
                
                // Type assertion for details with proper null/undefined checks
                const total = details && typeof details === 'object' ? (details as { total?: number }).total || 0 : 0;
                
                if (source === 'node') dataPoint.sources.node = total;
                else if (source === 'referral') dataPoint.sources.referral = total;
                else if (source === 'task') dataPoint.sources.task = total;
                else if (source === 'checkin') dataPoint.sources.checkin = total;
                else dataPoint.sources.other += total;
              });
            }
          }
          
          return dataPoint;
        });
        
        // For historical data (not today), fetch from node-sessions API
        if (days > 1) {
          const historyResponse = await fetch(`/api/user/node-sessions?walletAddress=${walletAddress}&days=${days}`);
          
          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            
            // Process historical sessions and aggregate by date
            historyData.sessions.forEach((session: ProcessedNodeSession) => {
              const sessionDate = new Date(session.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              
              // Skip today's data as we already have it from daily-earnings
              if (sessionDate === today) return;
              
              // Find the matching date in our chart data
              const dataPoint = chartData.find(item => item.date === sessionDate);
              if (dataPoint) {
                if (dataType === 'points') {
                  dataPoint.points += parseFloat(session.pointsEarned.toString()) || 0;
                  // Add null check for sources
                  if (dataPoint.sources) {
                    dataPoint.sources.node += parseFloat(session.pointsEarned.toString()) || 0;
                  }
                } else { // connections/uptime
                  dataPoint.uptime += parseFloat(session.uptime.toString()) / 3600 || 0; // Convert seconds to hours
                }
              }
            });
          }
        }
        
        return chartData;
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
      // Don't modify the chart data here - this was causing the issue
      // by overwriting historical data distribution
      // The chart data should come from the API and remain as is
      // Today's earnings are shown separately in the Today's Earnings card
    }
  }, [nodeStats, user]); // Keep the dependency array but remove activityData to prevent unnecessary updates

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
            </div>

            {/* Today's Winner Section */}
            <div className="todays-winner-section">
              <h2 className="section-title">🏆 Today&apos;s Winner</h2>
              {lotteryLoading ? (
                <motion.div 
                  className="winner-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="loading-spinner"></div>
                  <p>Loading today&apos;s winner...</p>
                </motion.div>
              ) : lotteryError ? (
                <motion.div 
                  className="winner-error"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="error-icon">⚠️</div>
                  <p>{lotteryError}</p>
                  <button 
                    onClick={fetchTodaysWinner}
                    className="retry-btn"
                  >
                    Try Again
                  </button>
                </motion.div>
              ) : !todaysWinner ? (
                <motion.div 
                  className="no-winner"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="no-winner-icon">🎲</div>
                  <h3>No Winner Yet Today!</h3>
                  <p>The daily draw hasn&apos;t happened yet.</p>
                </motion.div>
              ) : (
                <motion.div
                  className="winner-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="winner-avatar">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      width={60}
                      height={60}
                      src={`https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${todaysWinner.walletAddress}`} 
                      alt="Winner Avatar" 
                      className="winner-avatar-image"
                    />
                    <div className="winner-crown">👑</div>
                  </div>
                  <div className="winner-info">
                    <h3 className="winner-name">
                      {todaysWinner.username || 'Anonymous Winner'}
                    </h3>
                    <p className="winner-address">
                      {formatWalletAddress(todaysWinner.walletAddress)}
                    </p>
                    <div className="winner-prize">Prize: ${todaysWinner.prize || 0}</div>
                  </div>
                </motion.div>
              )}
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
                ) : userSessions && userSessions.length > 0 ? (
                  userSessions.map((session, index) => (
                    <div key={index} className="table-row">
                      <div className="cell status">
                        <span dangerouslySetInnerHTML={{ __html: session.statusIcon }} />
                        {session.status}
                      </div>
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
