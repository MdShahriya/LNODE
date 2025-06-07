'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { FaCoins, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { SiTether } from 'react-icons/si';
import { prepareCreditPackagePurchase, prepareUsdtApproval } from '@/lib/contracts/creditPackages';
import './credits.css';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  popular?: boolean;
  description?: string;
}

export default function CreditsPage() {
  const { address } = useAccount();
  const { writeContract, data: hash, error: contractError, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  const [userCredits, setUserCredits] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [step, setStep] = useState<'approval' | 'deposit' | 'complete'>('approval');

  // Credit packages available for purchase
  const creditPackages: CreditPackage[] = [
    {
      id: 'basic',
      name: 'Basic Package',
      credits: 10,
      price: 1,
      description: 'Perfect for casual users'
    },
    {
      id: 'standard',
      name: 'Standard Package',
      credits: 25,
      price: 2,
      popular: true,
      description: 'Most popular choice'
    },
    {
      id: 'premium',
      name: 'Premium Package',
      credits: 60,
      price: 5,
      description: 'Best value for active users'
    },
    {
      id: 'ultimate',
      name: 'Ultimate Package',
      credits: 150,
      price: 12,
      description: 'For power users'
    }
  ];

  // Fetch user credits
  useEffect(() => {
    const fetchUserCredits = async () => {
      if (!address) {
        return;
      }

      try {
        const response = await fetch(`/api/user?walletAddress=${address}`);
        const data = await response.json();
        
        if (data.user && data.user.credits !== undefined) {
          setUserCredits(data.user.credits);
        }
      } catch (error) {
        console.error('Error fetching user credits:', error);
      }
    };

    fetchUserCredits();
  }, [address]);

  const addCreditsToAccount = useCallback(async (pkg: CreditPackage) => {
    try {
      const response = await fetch('/api/user/add-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
          amount: pkg.credits
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess(`Successfully purchased ${pkg.credits} credits!`);
        setUserCredits(data.newBalance);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        throw new Error(data.error || 'Failed to add credits');
      }
    } catch (error) {
      console.error('Error adding credits:', error);
      setError('Credits purchase successful but failed to update account. Please contact support.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setPurchasing(false);
      setSelectedPackage(null);
      setStep('approval');
    }
  }, [address]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && selectedPackage) {
      if (step === 'approval') {
        // Approval confirmed, now proceed to deposit
        setStep('deposit');
        const depositParams = prepareCreditPackagePurchase({
          packageId: selectedPackage.id,
          price: selectedPackage.price,
          credits: selectedPackage.credits
        });
        writeContract(depositParams);
      } else if (step === 'deposit') {
        // Deposit confirmed, add credits to user account
        addCreditsToAccount(selectedPackage);
        setStep('complete');
      }
    }
  }, [isConfirmed, selectedPackage, step, addCreditsToAccount, writeContract]);

  // Handle contract errors
  useEffect(() => {
    if (contractError) {
      setError(contractError.message || 'Transaction failed');
      setPurchasing(false);
      setSelectedPackage(null);
      setStep('approval');
      setTimeout(() => setError(''), 5000);
    }
  }, [contractError]);

  const handlePurchase = async (pkg: CreditPackage) => {
    if (!address) {
      setError('Please connect your wallet to purchase credits');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setSelectedPackage(pkg);
    setPurchasing(true);
    setError('');
    setStep('approval');

    try {
      // Step 1: Approve USDT transfer
      const approvalParams = prepareUsdtApproval(pkg.price);
      writeContract(approvalParams);
    } catch (error) {
      console.error('Error initiating purchase:', error);
      setError('Failed to initiate purchase');
      setPurchasing(false);
      setSelectedPackage(null);
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="credits-page">
      <div className="credits-header">
        <h1>Credit Packages</h1>
        <p>Purchase credits to submit opinions and support the community</p>
        
        {address && (
          <div className="current-balance">
            <FaCoins className="balance-icon" />
            <span>Your current balance: <strong>{userCredits} Credits</strong></span>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          <FaCheckCircle className="success-icon" /> {success}
        </div>
      )}

      <div className="packages-container">
        {creditPackages.map((pkg) => (
          <div 
            key={pkg.id} 
            className={`package-card ${pkg.popular ? 'popular' : ''}`}
          >
            {pkg.popular && <div className="popular-badge">Most Popular</div>}
            
            <h2 className="package-name">{pkg.name}</h2>
            <div className="package-credits">
              <FaCoins className="package-icon" />
              <span>{pkg.credits} Credits</span>
            </div>
            
            <p className="package-description">{pkg.description}</p>
            
            <div className="price-container">
                <div className="usd-price">${pkg.price}</div>
                <div className="usdt-price">
                  <SiTether className="usdt-icon" />
                  {pkg.price.toFixed(2)} USDT
                </div>
              </div>
            
            <button 
              className="purchase-button"
              onClick={() => handlePurchase(pkg)}
              disabled={purchasing || isPending || isConfirming}
            >
              {purchasing && selectedPackage?.id === pkg.id ? (
                <>
                  <FaSpinner className="spinner" />
                  {step === 'approval' && (isPending || isConfirming) ? 'Approving USDT...' :
                   step === 'deposit' && (isPending || isConfirming) ? 'Processing Deposit...' :
                   'Processing...'}
                </>
              ) : (
                <>
                  <SiTether className="usdt-icon" />
                  Buy with USDT
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="credits-info">
        <h3>How Credits Work</h3>
        <p>
          Credits are used to submit opinions on the Opinion Wall. Higher priority opinions cost more credits.
          You can earn credits by completing tasks, daily check-ins, and other activities, or purchase them directly here.
        </p>
        <h3>USDT Fund Collection Pool on BSC</h3>
        <p>
          Credit purchases are processed through our secure FundCollectionPool smart contract on the Binance Smart Chain (BSC) using USDT. 
          This reusable contract collects all payments in a transparent fund pool and emits events for every deposit, ensuring complete transparency. 
          When you purchase credits, your USDT is deposited into the fund pool and your wallet address is logged on the blockchain for verification.
        </p>
      </div>
    </div>
  );
}