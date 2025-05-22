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
  const { isConnected } = useAccount()

  const [leaderboard] = useState<LeaderboardEntry[]>([
    {
      rank: 1,
      address: '0x1234...5678',
      points: 1500,
      tasksCompleted: 25,
      uptime: 120
    },
    {
      rank: 2,
      address: '0x8765...4321',
      points: 1200,
      tasksCompleted: 20,
      uptime: 100
    },
    {
      rank: 3,
      address: '0x9876...1234',
      points: 1000,
      tasksCompleted: 18,
      uptime: 90
    }
  ])

  useEffect(() => {
    if (!isConnected) return
  }, [isConnected])

  return (
    <div className="leaderboard">
      <div className="leaderboard__container">
        <h1 className="leaderboard__title">Leaderboard</h1>

        <div className="leaderboard__table-wrapper">
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
              {leaderboard.map((entry) => (
                <tr key={entry.address} className="leaderboard__row">
                  <td>
                    <span
                      className={`leaderboard__rank rank-${entry.rank}`}
                    >
                      {entry.rank}
                    </span>
                  </td>
                  <td className="leaderboard__address">{entry.address}</td>
                  <td className="leaderboard__points">{entry.points}</td>
                  <td className="leaderboard__tasks">{entry.tasksCompleted}</td>
                  <td className="leaderboard__uptime">{entry.uptime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
