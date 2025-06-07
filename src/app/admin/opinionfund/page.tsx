'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { toast } from 'react-hot-toast'
import { formatUnits, parseUnits } from 'viem'
import { FaPause, FaPlay, FaUsers } from 'react-icons/fa'
import { SiTether } from 'react-icons/si'
import { FUND_COLLECTION_POOL_CONTRACT_ADDRESS, FUND_COLLECTION_POOL_ABI, prepareUsdtApproval, prepareWithdrawFunds } from '@/lib/contracts/creditPackages'
import './opinionfund.css'

type ContractAction = 'deposit' | 'withdraw' | 'pause' | 'unpause' | ''



export default function AdminOpinionFund() {
  const { address } = useAccount()
  const { writeContract, data: hash, error: contractError, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })
  
  const [activeAction, setActiveAction] = useState<ContractAction>('deposit')
  const [amount, setAmount] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')

  const [step, setStep] = useState<'approval' | 'transaction' | 'complete'>('approval')
  
  // Read contract data
  const { data: totalFunds, refetch: refetchTotalFunds } = useReadContract({
    address: FUND_COLLECTION_POOL_CONTRACT_ADDRESS as `0x${string}`,
    abi: FUND_COLLECTION_POOL_ABI,
    functionName: 'getContractBalance',
  })
  
  const { data: contributorCount, refetch: refetchContributorCount } = useReadContract({
    address: FUND_COLLECTION_POOL_CONTRACT_ADDRESS as `0x${string}`,
    abi: FUND_COLLECTION_POOL_ABI,
    functionName: 'getContributorCount',
  })
  
  const { data: isPaused, refetch: refetchPaused } = useReadContract({
    address: FUND_COLLECTION_POOL_CONTRACT_ADDRESS as `0x${string}`,
    abi: FUND_COLLECTION_POOL_ABI,
    functionName: 'paused',
  })
  
  const { data: userContribution, refetch: refetchUserContribution } = useReadContract({
    address: FUND_COLLECTION_POOL_CONTRACT_ADDRESS as `0x${string}`,
    abi: FUND_COLLECTION_POOL_ABI,
    functionName: 'userContributions',
    args: address ? [address] : undefined,
  })


  const resetForm = () => {
    setAmount('')
    setRecipientAddress('')
    setStep('approval')
    setActiveAction('')
  }

  const handleContractAction = useCallback(async () => {
    if (!address) {
      toast.error('Please connect your wallet')
      return
    }

    if (!amount && (activeAction === 'deposit' || activeAction === 'withdraw')) {
      toast.error('Please enter an amount')
      return
    }

    if (activeAction === 'withdraw' && !recipientAddress) {
      toast.error('Please enter recipient address')
      return
    }

    try {
       const amountInUsdt = parseUnits(amount || '0', 18)

      switch (activeAction) {
        case 'deposit':
          if (step === 'approval') {
            // First approve USDT
            const approvalConfig = prepareUsdtApproval(parseFloat(amount))
            writeContract(approvalConfig)
          } else {
            // Then deposit
            writeContract({
              address: FUND_COLLECTION_POOL_CONTRACT_ADDRESS as `0x${string}`,
              abi: FUND_COLLECTION_POOL_ABI,
              functionName: 'deposit',
              args: [amountInUsdt]
            })
          }
          break

        case 'withdraw':
          const withdrawConfig = prepareWithdrawFunds(parseFloat(amount), recipientAddress)
          writeContract(withdrawConfig)
          break

        case 'pause':
          writeContract({
            address: FUND_COLLECTION_POOL_CONTRACT_ADDRESS as `0x${string}`,
            abi: FUND_COLLECTION_POOL_ABI,
            functionName: 'pause',
            args: []
          })
          break

        case 'unpause':
          writeContract({
            address: FUND_COLLECTION_POOL_CONTRACT_ADDRESS as `0x${string}`,
            abi: FUND_COLLECTION_POOL_ABI,
            functionName: 'unpause',
            args: []
          })
          break
      }
    } catch (error) {
       console.error('Contract action error:', error)
       toast.error('Failed to execute contract action')
     }
  }, [address, amount, recipientAddress, activeAction, step, writeContract])

  // Handle transaction confirmation - simplified logic matching credits page pattern
  useEffect(() => {
    if (isConfirmed) {
      if (step === 'approval' && activeAction === 'deposit') {
        // Approval confirmed for deposit, proceed to transaction step
        setStep('transaction')
      } else if (step === 'transaction' && activeAction === 'deposit') {
        // Deposit transaction confirmed, complete the process
        setStep('complete')
        toast.success('Deposit completed successfully!')
        refetchTotalFunds()
        refetchContributorCount()
        refetchUserContribution()
        resetForm()
      } else if (step === 'approval' && activeAction !== 'deposit') {
        // Non-deposit actions complete after approval
        setStep('complete')
        toast.success('Transaction completed successfully!')
        refetchTotalFunds()
        refetchContributorCount()
        refetchPaused()
        refetchUserContribution()
        resetForm()
      }
    }
  }, [isConfirmed, step, activeAction, refetchTotalFunds, refetchContributorCount, refetchPaused, refetchUserContribution])

  // Handle step change for deposit flow - removed circular dependency
  useEffect(() => {
    if (step === 'transaction' && activeAction === 'deposit') {
      // Execute deposit transaction directly without dependency on handleContractAction
      const amountInUsdt = parseUnits(amount || '0', 18)
      writeContract({
        address: FUND_COLLECTION_POOL_CONTRACT_ADDRESS as `0x${string}`,
        abi: FUND_COLLECTION_POOL_ABI,
        functionName: 'deposit',
        args: [amountInUsdt]
      })
    }
  }, [step, activeAction, amount, writeContract])

  // Handle contract errors - improved error handling with proper state cleanup
  useEffect(() => {
    if (contractError) {
      toast.error(`Transaction failed: ${contractError.message}`)
      // Reset all transaction-related state on error
      setStep('approval')
      setAmount('')
      setRecipientAddress('')
    }
  }, [contractError])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleContractAction()
  }

  const formatBalance = (balance: bigint | undefined) => {
    if (!balance) return '0'
    return formatUnits(balance, 18)
  }

  const getButtonText = () => {
    if (isPending || isConfirming) {
      if (activeAction === 'deposit') {
        return step === 'approval' ? 'Approving USDT...' : 'Processing purcharse...'
      }
      return 'Processing...'
    }
    
    switch (activeAction) {
      case 'deposit':
        return step === 'approval' ? 'Approve USDT' : 'Deposit Funds'
      case 'withdraw':
        return 'Withdraw Funds'
      case 'pause':
        return 'Pause Contract'
      case 'unpause':
        return 'Unpause Contract'
      default:
        return 'Execute'
    }
  }

  return (
    <div className="admin-opinionfund">
      <div className="admin-opinionfund__container">
        <h1 className="admin-opinionfund__title">Fund Collection Pool Control</h1>
        <p className="admin-opinionfund__subtitle">Manage the smart contract for fund collection and distribution</p>

        {/* Contract Stats */}
        <div className="contract-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <SiTether />
            </div>
            <div className="stat-content">
              <h3>Total Funds</h3>
              <p>{formatBalance(totalFunds as bigint)} USDT</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <FaUsers />
            </div>
            <div className="stat-content">
              <h3>Contributors</h3>
              <p>{contributorCount?.toString() || '0'}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <FaUsers />
            </div>
            <div className="stat-content">
              <h3>Your Contribution</h3>
              <p>{formatBalance(userContribution as bigint)} USDT</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              {isPaused ? <FaPause /> : <FaPlay />}
            </div>
            <div className="stat-content">
              <h3>Contract Status</h3>
              <p className={`status ${isPaused ? 'inactive' : 'active'}`}>
                {isPaused ? 'Paused' : 'Active'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="admin-opinionfund__tabs">
          <div 
            className={`admin-opinionfund__tab ${activeAction === 'deposit' ? 'active' : ''}`}
            onClick={() => setActiveAction('deposit')}
          >
            <FaPlay /> Deposit
          </div>
          <div 
            className={`admin-opinionfund__tab ${activeAction === 'withdraw' ? 'active' : ''}`}
            onClick={() => setActiveAction('withdraw')}
          >
            <FaPause /> Withdraw
          </div>
          <div 
            className={`admin-opinionfund__tab ${activeAction === 'pause' ? 'active' : ''}`}
            onClick={() => setActiveAction('pause')}
          >
            <FaPause /> Pause
          </div>
          <div 
            className={`admin-opinionfund__tab ${activeAction === 'unpause' ? 'active' : ''}`}
            onClick={() => setActiveAction('unpause')}
          >
            <FaPlay /> Unpause
          </div>
        </div>

        {/* Action Form */}
        <div className="admin-opinionfund__form">
          <h2 className="admin-opinionfund__form-title">
            {activeAction === 'deposit' && 'Deposit Funds'}
            {activeAction === 'withdraw' && 'Withdraw Funds'}
            {activeAction === 'pause' && 'Pause Contract'}
            {activeAction === 'unpause' && 'Unpause Contract'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            {(activeAction === 'deposit' || activeAction === 'withdraw') && (
              <div className="admin-opinionfund__form-group">
                <label className="admin-opinionfund__form-label" htmlFor="amount">
                  Amount (USDT) *
                </label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="admin-opinionfund__form-input"
                  placeholder="Enter amount in USDT"
                  min="0"
                  step="0.000001"
                  required
                />
              </div>
            )}

            {activeAction === 'withdraw' && (
              <div className="admin-opinionfund__form-group">
                <label className="admin-opinionfund__form-label" htmlFor="recipient">
                  Recipient Address *
                </label>
                <input
                  type="text"
                  id="recipient"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="admin-opinionfund__form-input"
                  placeholder="0x..."
                  required
                />
              </div>
            )}

            {(activeAction === 'pause' || activeAction === 'unpause') && (
              <div className="admin-opinionfund__form-group">
                <p className="contract-action-warning">
                  {activeAction === 'pause' 
                    ? 'This will pause all contract operations including deposits and withdrawals.'
                    : 'This will resume all contract operations.'}
                </p>
              </div>
            )}

            <div className="admin-opinionfund__form-actions">
              <button
                type="button"
                onClick={resetForm}
                className="admin-button admin-button--secondary"
                disabled={isPending || isConfirming}
              >
                Reset
              </button>
              <button
                type="submit"
                className="admin-button admin-button--primary"
                disabled={isPending || isConfirming || !address}
              >
                {getButtonText()}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}