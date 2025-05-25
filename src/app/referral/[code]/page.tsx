'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'

export default function ReferralLandingPage() {
  const params = useParams()
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [applying, setApplying] = useState(false)
  const [referralCode, setReferralCode] = useState('')

  useEffect(() => {
    if (params.code) {
      setReferralCode(params.code as string)
    }
  }, [params.code])

  const applyReferralLink = async () => {
    if (!address || !isConnected || !referralCode) {
      toast.error('Please connect your wallet first')
      return
    }
    
    try {
      setApplying(true)
      const response = await fetch('/api/referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
          referralCode: referralCode
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply referral code')
      }
      
      toast.success(`Referral applied! ${data.pointsAwarded} points awarded to referrer.`)
      
      // Redirect to dashboard after successful application
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error) {
      console.error('Error applying referral link:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to apply referral link')
    } finally {
      setApplying(false)
    }
  }

  const goToDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to TOPAY!</h1>
          <p className="text-gray-600">You&apos;ve been invited to join our platform</p>
        </div>

        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Referral Link:</h3>
            <code className="bg-blue-100 px-3 py-2 rounded text-blue-800 font-mono text-lg">
              {referralCode}
            </code>
          </div>
        </div>

        {!isConnected ? (
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Connect your wallet to apply this referral link and start earning rewards!
            </p>
            <button
              onClick={goToDashboard}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                ✅ Wallet connected: {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
            
            <button
              onClick={applyReferralLink}
              disabled={applying}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {applying ? 'Applying Referral...' : 'Apply Referral Link'}
            </button>
            
            <button
              onClick={goToDashboard}
              className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
              By applying this referral link, you&apos;ll help your referrer earn bonus points!
            </p>
        </div>
      </div>
    </div>
  )
}