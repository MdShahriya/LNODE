'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState, useCallback } from 'react'
import './dashboard.css'
import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Add Chrome extension API type declaration
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage?: (message: unknown) => void;
      };
      storage?: {
        local?: {
          get: (keys: string[], callback: (result: unknown) => void) => void;
        };
        onChanged?: {
          addListener: (callback: (changes: unknown) => void) => void;
        };
      };
    };
  }
}

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

// Sample data for charts - in a real implementation, this would come from API
const generateSampleData = (days = 7): ChartDataPoint[] => {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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
    };
  });
};

// Function to fetch historical data from API
const fetchHistoricalData = async (walletAddress: string | undefined, days = 7, dataType = 'points') => {
  try {
    const response = await fetch(`/api/user/history?walletAddress=${walletAddress}&days=${days}&dataType=${dataType}`);
    
    if (response.ok) {
      const data = await response.json();
      return data.data; // Return the processed daily data
    }
    
    // If there's an error, return sample data
    return generateSampleData(days);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return generateSampleData(days);
  }
};

// Fallback function to generate historical data based on user's current stats
const generateHistoricalData = (user: User | null, days = 7) => {
  if (!user) return generateSampleData(days);
  
  // Create an array of dates for the past 'days' days
  const dates = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  
  // For the last entry (today), use the current user stats
  const result = dates.map((date, index) => {
    // For the last day (today), use actual data
    if (index === dates.length - 1) {
      return {
        date,
        points: user.points,
        uptime: Math.floor(user.uptime / 3600), // Convert seconds to hours
        sources: {
          node: Math.floor(user.points * 0.8), // Assume 80% from node
          referral: Math.floor(user.points * 0.1), // Assume 10% from referrals
          task: Math.floor(user.points * 0.05), // Assume 5% from tasks
          checkin: Math.floor(user.points * 0.05), // Assume 5% from check-ins
          other: 0
        },
        connectionTypes: {
          login: 1,
          node_start: 0,
          node_stop: 0,
          dashboard_view: 1,
          other: 0
        }
      };
    }
    
    // For previous days, calculate a reasonable progression
    // This creates a more realistic progression instead of random data
    const pointsRatio = (index + 1) / dates.length;
    const uptimeRatio = (index + 1) / dates.length;
    
    return {
      date,
      points: Math.floor(user.points * pointsRatio),
      uptime: Math.floor((user.uptime / 3600) * uptimeRatio), // Convert seconds to hours
      sources: {
        node: Math.floor((user.points * pointsRatio) * 0.8),
        referral: Math.floor((user.points * pointsRatio) * 0.1),
        task: Math.floor((user.points * pointsRatio) * 0.05),
        checkin: Math.floor((user.points * pointsRatio) * 0.05),
        other: 0
      },
      connectionTypes: {
        login: 1,
        node_start: 0,
        node_stop: 0,
        dashboard_view: 1,
        other: 0
      }
    };
  });
  
  return result;
};

export default function Dashboard() {
  const { address, isConnected } = useAccount()
  const [nodeStats, setNodeStats] = useState<NodeStats>({
    uptime: 0,
    points: 0,
    tasksCompleted: 0
  })
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [extensionWalletAddress, setExtensionWalletAddress] = useState<string | null>(null)
  
  // Sample data for charts
  const [activityData, setActivityData] = useState<ChartDataPoint[]>(generateSampleData())
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

  // Check for extension wallet connection
  useEffect(() => {
    // Function to check if extension is installed and get wallet address
    const checkExtensionConnection = () => {
      // Check if Chrome extension API is available
      if (typeof window !== 'undefined' && window.chrome?.runtime && window.chrome?.runtime?.sendMessage) {
        try {
          // Try to access chrome.storage
          if (window.chrome?.storage && window.chrome?.storage?.local) {
            window.chrome.storage.local.get(['walletAddress'], function(result) {
              if (result.walletAddress) {
                setExtensionWalletAddress(result.walletAddress);
                console.log('Extension wallet connected:', result.walletAddress);
              }
            });
          }
        } catch (error) {
          console.error('Error accessing extension:', error);
        }
      } else {
        // Handle case where extension is not installed or accessible
        console.log('TOPAY extension not detected');
      }
    };

    // Check on component mount
    checkExtensionConnection();

    // Set up listener for storage changes to detect wallet connections/disconnections
    const setupStorageListener = () => {
      if (typeof window !== 'undefined' && window.chrome?.storage && window.chrome?.storage?.onChanged) {
        window.chrome.storage.onChanged.addListener((changes) => {
          if (changes.walletAddress) {
            if (changes.walletAddress.newValue) {
              setExtensionWalletAddress(changes.walletAddress.newValue);
              console.log('Extension wallet updated:', changes.walletAddress.newValue);
            } else {
              setExtensionWalletAddress(null);
              console.log('Extension wallet disconnected');
            }
          }
        });
      }
    };

    setupStorageListener();
  }, []);

  // Function to fetch today's earnings
  const fetchTodaysEarnings = useCallback(async () => {
    // Use extension wallet address if available, otherwise use connected wallet
    const walletToUse = extensionWalletAddress || address;
    
    if (!walletToUse) return;
    
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's earnings from API
      const response = await fetch(`/api/user/daily-earnings?walletAddress=${walletToUse}&date=${today}`);
      
      if (response.ok) {
        const data = await response.json();
        // Update today's earnings with actual data
        setTodaysEarnings(data.points);
      }
    } catch (error) {
      console.error('Error fetching today\'s earnings:', error);
    }
  }, [address, extensionWalletAddress]);

  // Fetch today's earnings on initial load and periodically
  useEffect(() => {
    // Use extension wallet or connected wallet
    const walletConnected = extensionWalletAddress || (isConnected && address);
    
    if (!walletConnected) return;
    
    // Fetch immediately
    fetchTodaysEarnings();
    
    // Set up interval to refresh data every minute
    const intervalId = setInterval(fetchTodaysEarnings, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [address, isConnected, fetchTodaysEarnings, extensionWalletAddress]);

  // Fetch user sessions/nodes
  useEffect(() => {
    // Use extension wallet address if available, otherwise use connected wallet
    const walletToUse = extensionWalletAddress || address;
    
    if (walletToUse) {
      setLoadingSessions(true);
      fetch(`/api/user/sessions?walletAddress=${walletToUse}`)
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
    }
  }, [address, extensionWalletAddress]); 

  // Function to safely fetch historical data with type checking
  const fetchHistoricalDataSafe = async (walletAddress: string | undefined, days = 7, dataType = 'points') => {
    if (!walletAddress) return generateSampleData(days);
    
    try {
      const response = await fetch(`/api/user/history?walletAddress=${walletAddress}&days=${days}&dataType=${dataType}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.data; // Return the processed daily data
      }
      
      // If there's an error, return sample data
      return generateSampleData(days);
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return generateSampleData(days);
    }
  };

  useEffect(() => {
    // Use extension wallet address if available, otherwise use connected wallet
    const walletToUse = extensionWalletAddress || address;
    const walletConnected = extensionWalletAddress || (isConnected && address);
    
    if (!walletConnected) return;
    
    const registerOrFetchUser = async () => {
      try {
        setLoading(true);
        // Try to fetch existing user first
        const response = await fetch(`/api/user?walletAddress=${walletToUse}`);
        
        if (response.status === 404) {
          // User doesn't exist, create a new one
          const createResponse = await fetch('/api/user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ walletAddress: walletToUse }),
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
            const historyData = await fetchHistoricalDataSafe(walletToUse, 7, chartDataType);
            setActivityData(historyData.length > 0 ? historyData : generateHistoricalData(data.user));
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
          const historyData = await fetchHistoricalDataSafe(walletToUse, 7, chartDataType);
          setActivityData(historyData.length > 0 ? historyData : generateHistoricalData(data.user));
        }
        
        // Store wallet address for extension access
        if (walletToUse) {
          localStorage.setItem('walletAddress', walletToUse);
          
          // Track device information for analytics
          try {
            const deviceInfo = {
              userAgent: navigator.userAgent,
              language: navigator.language,
              platform: navigator.platform,
              screenWidth: window.screen.width,
              screenHeight: window.screen.height,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };
            
            await fetch('/api/user/track-device', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                walletAddress: walletToUse,
                deviceInfo: JSON.stringify(deviceInfo)
              }),
            });
          } catch (error) {
            console.log('Error tracking device:', error);
          }
        }
      } catch (error) {
        console.error('Error registering/fetching user:', error);
      } finally {
        setLoading(false);
      }
    };
    
    registerOrFetchUser();
  }, [isConnected, address, chartDataType, extensionWalletAddress]);

  // Effect to refresh history data periodically
  useEffect(() => {
    // Use extension wallet address if available, otherwise use connected wallet
    const walletToUse = extensionWalletAddress || address;
    const walletConnected = extensionWalletAddress || (isConnected && address);
    
    if (!walletConnected) return;
    
    // Function to refresh history data
    const refreshHistoryData = async () => {
      try {
        const historyData = await fetchHistoricalDataSafe(walletToUse, 7, chartDataType);
        if (historyData.length > 0) {
          setActivityData(historyData);
        }
      } catch (error) {
        console.error('Error refreshing history data:', error);
      }
    };
    
    // Refresh immediately on chart type change
    refreshHistoryData();
    
    // Set up interval to refresh data every minute
    const intervalId = setInterval(refreshHistoryData, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [address, isConnected, chartDataType, extensionWalletAddress]);

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
        {!isConnected && !extensionWalletAddress ? (
          <div className="connect-wallet">
          <p>Please connect your wallet or TOPAY extension to continue.</p>
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
                  // Use extension wallet address if available, otherwise use connected wallet
                  const walletToUse = extensionWalletAddress || address;
                  // Only create and copy link if wallet address is available
                  if (walletToUse) {
                    const link = `${window.location.origin}/ref/${walletToUse}`;
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
                  Hi, {extensionWalletAddress ? 
                    extensionWalletAddress.substring(0, 6) + '...' + extensionWalletAddress.substring(extensionWalletAddress.length - 4) + ' (Extension)' : 
                    address ? 
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
