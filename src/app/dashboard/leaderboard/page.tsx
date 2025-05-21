'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()

  const updateLeaderboard = (address: string, points: number, tasksCompleted: number, uptime: number) => {
    setLeaderboard(prevLeaderboard => {
      const updatedLeaderboard = prevLeaderboard.map(entry =>
        entry.address === address
          ? { ...entry, points, tasksCompleted, uptime }
          : entry
      )
      
      return updatedLeaderboard
        .sort((a, b) => b.points - a.points)
        .map((entry, index) => ({ ...entry, rank: index + 1 }))
    })
  }

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([
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
    if (!isConnected) {
      router.push('/')
    }
  }, [isConnected, router])

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Leaderboard</h1>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uptime (h)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaderboard.map((entry) => (
                <tr key={entry.address} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${entry.rank === 1 ? 'bg-yellow-100 text-yellow-800' : entry.rank === 2 ? 'bg-gray-100 text-gray-800' : entry.rank === 3 ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                        {entry.rank}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.address}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {entry.points}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.tasksCompleted}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.uptime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}