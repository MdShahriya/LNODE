'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import "./address.css"

export default function ReferralByAddressPage() {
  const params = useParams()
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [applying, setApplying] = useState(false)
  const [referrerAddress, setReferrerAddress] = useState('')

  useEffect(() => {
    if (params.address) {
      setReferrerAddress(params.address as string)
    }
  }, [params.address])

  const applyReferralByAddress = useCallback(async (): Promise<void> => {
    if (!address || !isConnected || !referrerAddress) {
      return
    }
    
    try {
      setApplying(true)
      
      // First, get the referrer's referral code using their wallet address
      const userResponse = await fetch(`/api/user?walletAddress=${referrerAddress}`)
      
      if (!userResponse.ok) {
        throw new Error('Invalid referrer address')
      }
      
      const userData = await userResponse.json()
      const referralCode = userData.user.referralCode
      
      if (!referralCode) {
        throw new Error('Referrer does not have a valid referral code')
      }
      
      // Apply the referral code
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
        // If user already has a referrer, just redirect to dashboard
        if (data.error?.includes('already has a referrer')) {
          toast.success('You already have a referrer. Redirecting to dashboard...')

          setTimeout(() => {
            router.push('/dashboard')
          }, 1500)
          return
        }
        throw new Error(data.error || 'Failed to apply referral code')
      }
      
      toast.success(`Referral applied! ${data.pointsAwarded} points awarded to referrer.`)
      
      // Redirect to dashboard after successful application
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error) {
      console.error('Error applying referral:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to apply referral')
    } finally {
      setApplying(false)
    }
  }, [address, isConnected, referrerAddress, router])

  // Auto-apply referral when wallet is connected
  useEffect(() => {
    if (isConnected && address && referrerAddress && !applying) {
      applyReferralByAddress()
    }
  }, [isConnected, address, referrerAddress, applyReferralByAddress, applying])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to TOPAY!</h1>
          <p className="text-gray-600">You&apos;ve been invited to join our platform</p>
        </div>

        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Referrer Address:</h3>
            <code className="bg-blue-100 px-3 py-2 rounded text-blue-800 font-mono text-sm break-all">
              {referrerAddress}
            </code>
          </div>
        </div>

        {!isConnected ? (
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Connect your wallet to automatically apply this referral and start earning rewards!
            </p>
            <appkit-connect-button />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                ✅ Wallet connected: {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
            
            {applying ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <p className="text-blue-800 font-medium">Automatically applying referral...</p>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm text-center">
                  🎉 Referral will be applied automatically!
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
              By connecting your wallet, this referral will be automatically applied and your referrer will earn bonus points!
            </p>
        </div>
      </div>
    </div>
  )
}