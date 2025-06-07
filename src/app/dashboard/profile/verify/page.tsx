'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { toast } from 'react-hot-toast';
import { parseEther, formatEther } from 'viem';
import Image from 'next/image';
import './verify.css';

// Import the actual ABI from the generated file
import NFTGeneratorABI from '@/abi/NFTGenarator.json';
import { USDT_CONTRACT_ADDRESS, NFT_GENERATOR_CONTRACT_ADDRESS } from '@/lib/contracts/network';

// Contract configuration
const NFT_CONTRACT_ADDRESS = NFT_GENERATOR_CONTRACT_ADDRESS; // Using the dedicated NFT Generator contract
const NFT_ABI = NFTGeneratorABI.abi;

// Payment token configuration (USDT)
const PAYMENT_TOKEN_ADDRESS = USDT_CONTRACT_ADDRESS; // Using network configuration
const PAYMENT_TOKEN_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

interface VerificationStatus {
  hasNFT: boolean;
  isVerified: boolean;
  nftBalance: number;
  hasMinted: boolean;
  loading: boolean;
}

interface PaymentTokenStatus {
  balance: bigint;
  allowance: bigint;
  loading: boolean;
}

export default function VerifyPage() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, error: contractError, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    hasNFT: false,
    isVerified: false,
    nftBalance: 0,
    hasMinted: false,
    loading: false
  });
  
  const [paymentTokenStatus, setPaymentTokenStatus] = useState<PaymentTokenStatus>({
    balance: BigInt(0),
    allowance: BigInt(0),
    loading: false
  });
  
  const [isMinting, setIsMinting] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  // Mint amount is fixed to 1 NFT per user (except contract owner)
  
  // Countdown timer state - hardcoded target date
  const targetDate = useMemo(() => new Date('2025-06-07T01:09:00'), []);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isCountdownEnded, setIsCountdownEnded] = useState(false);

  // Read NFT balance
  const { data: nftBalance, refetch: refetchBalance } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address
    }
  });

  // Read if user has already minted
  const { data: hasMinted, refetch: refetchHasMinted } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'hasMinted',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address
    }
  });

  // Read payment token balance
  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: PAYMENT_TOKEN_ADDRESS,
    abi: PAYMENT_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address
    }
  });

  // Read payment token allowance
  const { data: tokenAllowance, refetch: refetchTokenAllowance } = useReadContract({
    address: PAYMENT_TOKEN_ADDRESS,
    abi: PAYMENT_TOKEN_ABI,
    functionName: 'allowance',
    args: address ? [address, NFT_CONTRACT_ADDRESS] : undefined,
    query: {
      enabled: !!address
    }
  });

  // Read max supply
  const { data: maxSupply } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'MAX_SUPPLY',
    query: {
      enabled: true
    }
  });

  // Read total supply
  const { data: totalSupply } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'totalSupply',
    query: {
      enabled: true
    }
  });

  const checkVerificationStatus = useCallback(async () => {
    if (!address) return;
    
    try {
      setVerificationStatus(prev => ({ ...prev, loading: true }));
      
      // Check user's verification status from API
      const response = await fetch(`/api/user?walletAddress=${address}`);
      if (response.ok) {
        const data = await response.json();
        setVerificationStatus(prev => ({
          ...prev,
          isVerified: data.user?.verification === 'verified',
          loading: false
        }));
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      setVerificationStatus(prev => ({ ...prev, loading: false }));
    }
  }, [address]);

  // Check verification status on component mount and when address changes
  useEffect(() => {
    if (address) {
      checkVerificationStatus();
    }
  }, [address, checkVerificationStatus]);

  // Handle successful transactions
  useEffect(() => {
    if (isConfirmed) {
      if (isMinting) {
        toast.success('NFT minted successfully!');
        setIsMinting(false);
        // Refetch all relevant data
        setTimeout(() => {
          refetchBalance();
          refetchHasMinted();
          refetchTokenBalance();
          refetchTokenAllowance();
          checkVerificationStatus();
        }, 2000);
      } else if (isApproving) {
        toast.success('Token approval successful!');
        setIsApproving(false);
        // Refetch allowance
        setTimeout(() => {
          refetchTokenAllowance();
        }, 2000);
      }
    }
  }, [checkVerificationStatus, isConfirmed, isMinting, isApproving, refetchBalance, refetchHasMinted, refetchTokenBalance, refetchTokenAllowance]);

  // Countdown timer effect
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
        setIsCountdownEnded(false);
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsCountdownEnded(true);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  // Update NFT balance when contract data changes
  useEffect(() => {
    if (nftBalance !== undefined) {
      setVerificationStatus(prev => ({
        ...prev,
        nftBalance: Number(nftBalance),
        hasNFT: Number(nftBalance) > 0
      }));
    }
  }, [nftBalance]);

  // Update hasMinted status
  useEffect(() => {
    if (hasMinted !== undefined) {
      setVerificationStatus(prev => ({
        ...prev,
        hasMinted: Boolean(hasMinted)
      }));
    }
  }, [hasMinted]);

  // Update payment token status
  useEffect(() => {
    if (tokenBalance !== undefined || tokenAllowance !== undefined) {
      setPaymentTokenStatus(prev => ({
        ...prev,
        balance: tokenBalance || BigInt(0),
        allowance: tokenAllowance || BigInt(0)
      }));
    }
  }, [tokenBalance, tokenAllowance]);

  // Handle contract errors
  useEffect(() => {
    if (contractError) {
      toast.error(`Transaction failed: ${contractError.message}`);
      setIsMinting(false);
    }
  }, [contractError]);

  const handleApproveToken = async () => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsApproving(true);
      // Fixed amount for 1 NFT based on countdown status
      const amount = parseEther(isCountdownEnded ? '25' : '5');
      
      writeContract({
        address: PAYMENT_TOKEN_ADDRESS,
        abi: PAYMENT_TOKEN_ABI,
        functionName: 'approve',
        args: [NFT_CONTRACT_ADDRESS, amount]
      });
    } catch (error) {
      console.error('Error approving tokens:', error);
      toast.error('Failed to approve tokens');
      setIsApproving(false);
    }
  };

  const handleMintNFT = async () => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (verificationStatus.hasMinted) {
      toast.error('You have already minted an NFT');
      return;
    }

    // Fixed amount for 1 NFT based on countdown status
    const amount = parseEther(isCountdownEnded ? '25' : '5');
    if (paymentTokenStatus.balance < amount) {
      toast.error('Insufficient token balance');
      return;
    }

    if (paymentTokenStatus.allowance < amount) {
      toast.error('Please approve tokens first');
      return;
    }

    try {
      setIsMinting(true);
      
      // Mint NFT with token payment
      writeContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'mint',
        args: [amount]
      });
    } catch (error) {
      console.error('Error minting NFT:', error);
      toast.error('Failed to mint NFT');
      setIsMinting(false);
    }
  };

  const handleVerifyWithNFT = async () => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!verificationStatus.hasNFT) {
      toast.error('You need to own an NFT to get verified');
      return;
    }

    try {
      setIsCheckingVerification(true);
      
      const response = await fetch('/api/user/verify-with-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
          nftContractAddress: NFT_CONTRACT_ADDRESS
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify with NFT');
      }

      toast.success('Verification successful! You are now verified.');
      checkVerificationStatus();
    } catch (error) {
      console.error('Error verifying with NFT:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to verify with NFT');
    } finally {
      setIsCheckingVerification(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="verify-container">
        <div className="verify-not-connected">
          <h1>NFT Verification</h1>
          <p>Please connect your wallet to access NFT verification.</p>
          <appkit-button balance='hide' />
        </div>
      </div>
    );
  }

  return (
    <div className="verify-container">
      <div className="verify-header">
        <h1>TOPAY Foundation OG Card</h1>
        <p>Mint your exclusive OG Card NFT for bonus rewards and recognition</p>
      </div>

      {/* Countdown Timer */}
      {!isCountdownEnded && (
        <div className="countdown-section">
          <h3>🔥 Limited Time Offer Ends In:</h3>
          <div className="countdown-timer">
            <div className="time-unit">
              <span className="time-value">{timeLeft.days}</span>
              <span className="time-label">Days</span>
            </div>
            <div className="time-separator">:</div>
            <div className="time-unit">
              <span className="time-value">{timeLeft.hours.toString().padStart(2, '0')}</span>
              <span className="time-label">Hours</span>
            </div>
            <div className="time-separator">:</div>
            <div className="time-unit">
              <span className="time-value">{timeLeft.minutes.toString().padStart(2, '0')}</span>
              <span className="time-label">Minutes</span>
            </div>
            <div className="time-separator">:</div>
            <div className="time-unit">
              <span className="time-value">{timeLeft.seconds.toString().padStart(2, '0')}</span>
              <span className="time-label">Seconds</span>
            </div>
          </div>
         </div>
      )}


      {/* NFT Minting Section */}
      <div className="mint-section">
        <h2>Mint Your OG Card NFT</h2>
        <p>Minting is <strong>not mandatory</strong>, but OG Card holders get exclusive bonus rewards!</p>
        
        {/* NFT Preview */}
        <div className="nft-preview">
          <h3>NFT Preview</h3>
          <div className="nft-preview-container">
            <Image 
              src="/1.png" 
              alt="TOPAY Verification NFT Preview" 
              className="nft-preview-image"
              width={250}
              height={375}
              priority
            />
            <div className="nft-preview-info">
              <h4>TOPAY Foundation OG Card</h4>
              <p>Limited to only 10,000 mints</p>
              <div className="nft-features">
                <span className="feature">🎖️ Discord Role [🔰Node Guardian]</span>
                <span className="feature">🎯 5000 Bonus Points</span>
                <span className="feature">💰 300 Bonus Credits</span>
                <span className="feature">✅ Verified Tick Mark</span>
                <span className="feature">🏆 Team Recognition</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mint-info">
          <div className="info-item">
            <span className="info-label">Minting Cost:</span>
            <div className="price-display">
              {!isCountdownEnded ? (
                <>
                  <div className="price-details">
                    <span className="original-price">25 USDT</span>
                    <span className="discount-badge">80% OFF</span>
                  </div>
                  <div className="current-price">5 USDT</div>
                </>
              ) : (
                <div className="current-price normal-price">25 USDT</div>
              )}
            </div>
          </div>
          
          <div className="info-item">
            <span className="info-label">Your Token Balance:</span>
            <span className="info-value">
              {paymentTokenStatus.loading ? 'Loading...' : 
               `${formatEther(paymentTokenStatus.balance)} USDT`}
            </span>
          </div>
          
          <div className="info-item">
            <span className="info-label">Token Allowance:</span>
            <span className="info-value">
              {paymentTokenStatus.loading ? 'Loading...' : 
               `${formatEther(paymentTokenStatus.allowance)} USDT`}
            </span>
          </div>
          
          <div className="info-item">
            <span className="info-label">Mint Status:</span>
            <span className="info-value">
              {verificationStatus.hasMinted ? 'Already Minted' : 'Available to Mint'}
            </span>
          </div>
          
          <div className="info-item">
            <span className="info-label">NFT Supply:</span>
            <span className="info-value">
              {totalSupply?.toString() || '0'} / {maxSupply?.toString() || '10,000'}
            </span>
          </div>
          
          <div className="info-item">
            <span className="info-label">Mint Limit:</span>
            <span className="info-value">1 NFT per wallet</span>
          </div>
        </div>

        <div className="mint-buttons">
          {!verificationStatus.hasMinted && paymentTokenStatus.allowance < parseEther(isCountdownEnded ? '25' : '5') && (
            <button 
              onClick={handleApproveToken}
              className="approve-btn"
              disabled={isApproving || isPending || isConfirming}
            >
              {isApproving || isPending ? 'Approving...' : 
               isConfirming ? 'Confirming...' : `Approve ${isCountdownEnded ? '25' : '5'} USDT`}
            </button>
          )}
          
          {(!verificationStatus.hasMinted && paymentTokenStatus.allowance >= parseEther(isCountdownEnded ? '25' : '5')) || verificationStatus.hasMinted ? (
            <button 
              onClick={handleMintNFT}
              className="mint-btn"
              disabled={isMinting || isPending || isConfirming || verificationStatus.hasMinted || 
                       paymentTokenStatus.allowance < parseEther(isCountdownEnded ? '25' : '5') || 
                       paymentTokenStatus.balance < parseEther(isCountdownEnded ? '25' : '5')}
            >
              {isMinting || isPending ? 'Minting...' : 
               isConfirming ? 'Confirming...' : 
               verificationStatus.hasMinted ? 'Already Minted' : 
               'Mint 1 NFT'}
            </button>
          ) : null}
        </div>
      </div>

      {/* Bonus Benefits Section */}
      <div className="verification-section">
        <h2>Exclusive OG Benefits</h2>
        <p>Owning an OG Card NFT is <strong>completely optional</strong>, but holders enjoy these exclusive perks:</p>
        
        <div className="benefits-grid">
          <div className="benefit-item">
            <span className="benefit-icon">🎖️</span>
            <div className="benefit-content">
              <h4>Discord High Role</h4>
              <p>Get elevated status in our Discord community</p>
            </div>
          </div>
          
          <div className="benefit-item">
            <span className="benefit-icon">🎯</span>
            <div className="benefit-content">
              <h4>5000 Bonus Points</h4>
              <p>Massive point boost for leaderboard ranking</p>
            </div>
          </div>
          
          <div className="benefit-item">
            <span className="benefit-icon">💰</span>
            <div className="benefit-content">
              <h4>300 Bonus Credits</h4>
              <p>Instant credit boost for platform activities</p>
            </div>
          </div>
          
          <div className="benefit-item">
            <span className="benefit-icon">✅</span>
            <div className="benefit-content">
              <h4>Verified Tick Mark</h4>
              <p>Show your OG status with a special badge</p>
            </div>
          </div>
          
          <div className="benefit-item">
            <span className="benefit-icon">🏆</span>
            <div className="benefit-content">
              <h4>Team Recognition</h4>
              <p>Special acknowledgment from the TOPAY team</p>
            </div>
          </div>
        </div>

        {verificationStatus.hasNFT && (
          <button 
            onClick={handleVerifyWithNFT}
            className="verify-btn enabled"
            disabled={isCheckingVerification || verificationStatus.isVerified}
          >
            {isCheckingVerification ? 'Activating Benefits...' : 
             verificationStatus.isVerified ? 'Benefits Activated!' : 'Activate OG Benefits'}
          </button>
        )}
      </div>

      {/* Success Message */}
      {verificationStatus.isVerified && (
        <div className="success-message">
          <div className="success-icon">🎉</div>
          <h3>Welcome to the OG Club!</h3>
          <p>Your exclusive benefits are now active! Enjoy your special status and rewards.</p>
        </div>
      )}
    </div>
  );
}