'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import "./referral.css"

interface ReferralStats {
  totalReferrals: number
  activeReferrals: number
  pointsEarned: number
  referralCode: string
}

interface ReferralHistory {
  address: string
  date: string
  status: 'active' | 'pending'
  pointsEarned: number
}

export default function ReferralProgram() {
  const { isConnected } = useAccount()
  const router = useRouter()
  const [stats] = useState<ReferralStats>({
    totalReferrals: 5,
    activeReferrals: 3,
    pointsEarned: 750,
    referralCode: 'TOPAY123'
  })

  const [history] = useState<ReferralHistory[]>([
    {
      address: '0x1234...5678',
      date: '2024-03-15',
      status: 'active',
      pointsEarned: 250
    },
    {
      address: '0x8765...4321',
      date: '2024-03-14',
      status: 'pending',
      pointsEarned: 0
    }
  ])

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
    }
  }, [isConnected, router])

  const copyReferralCode = () => {
    navigator.clipboard.writeText(stats.referralCode)
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Referral Program</h1>

        {/* Referral Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold">Total Referrals</h3>
            <p className="text-3xl font-bold">{stats.totalReferrals}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold">Active Referrals</h3>
            <p className="text-3xl font-bold">{stats.activeReferrals}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold">Points Earned</h3>
            <p className="text-3xl font-bold">{stats.pointsEarned}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold">Your Referral Code</h3>
            <div className="flex items-center space-x-2 mt-2">
              <code className="text-xl bg-gray-100 px-3 py-1 rounded">{stats.referralCode}</code>
              <button
                onClick={copyReferralCode}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Copy referral code"
              >
                📋
              </button>
            </div>
          </div>
        </div>

        {/* Referral History */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="text-xl font-bold p-6 border-b">Referral History</h2>
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {history.map((entry, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.address}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      entry.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.pointsEarned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}