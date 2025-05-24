'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import "./leaderboard.css"

interface LeaderboardEntry {
  rank: number
  address: string
  points: number
  tasksCompleted: number
  uptime: number
}

export default function Leaderboard() {
  const { isConnected, address } = useAccount()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/leaderboard')
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard data')
      }
      
      const data = await response.json()
      setLeaderboard(data.leaderboard || [])
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
      setError('Failed to load leaderboard data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected) {
      fetchLeaderboardData()
    }
  }, [isConnected])

  return (
    <div className="leaderboard">
      <div className="leaderboard__container">
        <h1 className="leaderboard__title">Leaderboard</h1>

        {loading ? (
          <div className="leaderboard__loading">Loading leaderboard data...</div>
        ) : error ? (
          <div className="leaderboard__error">{error}</div>
        ) : (
          <div className="leaderboard__table-wrapper">
            {leaderboard.length === 0 ? (
              <div className="leaderboard__empty">No leaderboard data available yet.</div>
            ) : (
              <table className="leaderboard__table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Address</th>
                    <th>Points</th>
                    <th>Tasks</th>
                    <th>Uptime (h)</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => {
                    // Truncate wallet address for display
                    const displayAddress = entry.address.length > 10 
                      ? `${entry.address.substring(0, 6)}...${entry.address.substring(entry.address.length - 4)}` 
                      : entry.address;
                    
                    // Highlight the current user's row
                    const isCurrentUser = address && entry.address.toLowerCase() === address.toLowerCase();
                    
                    return (
                      <tr 
                        key={entry.address} 
                        className={`leaderboard__row ${isCurrentUser ? 'leaderboard__row--current' : ''}`}
                      >
                        <td>
                          <span
                            className={`leaderboard__rank ${entry.rank <= 3 ? `rank-${entry.rank}` : ''}`}
                          >
                            {entry.rank}
                          </span>
                        </td>
                        <td className="leaderboard__address">{displayAddress}</td>
                        <td className="leaderboard__points">{entry.points}</td>
                        <td className="leaderboard__tasks">{entry.tasksCompleted}</td>
                        <td className="leaderboard__uptime">{entry.uptime}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
