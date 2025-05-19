'use client'

import { useState, useEffect } from 'react';
import { modal } from '@/context';
import './airdrop.css';

interface AirdropInfo {
  totalAmount: number;
  tokenSymbol: string;
  eligibleAmount: number;
  claimDeadline: string;
  claimed: boolean;
}

export default function Airdrop() {
  const [isConnected, setIsConnected] = useState(false);
  const [airdropInfo, setAirdropInfo] = useState<AirdropInfo>({
    totalAmount: 10000,
    tokenSymbol: 'TOPAY',
    eligibleAmount: 0,
    claimDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    claimed: false
  });

  // Check wallet connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // This would be replaced with actual wallet connection check
        const connected = localStorage.getItem('walletConnected') === 'true';
        setIsConnected(connected);
        
        if (connected) {
          // Load saved airdrop info from localStorage
          const savedAirdropInfo = localStorage.getItem('airdropInfo');
          if (savedAirdropInfo) {
            setAirdropInfo(JSON.parse(savedAirdropInfo));
          } else {
            // Generate random eligible amount for demo
            const randomAmount = Math.floor(Math.random() * 500) + 100;
            const newAirdropInfo = {
              ...airdropInfo,
              eligibleAmount: randomAmount
            };
            setAirdropInfo(newAirdropInfo);
            localStorage.setItem('airdropInfo', JSON.stringify(newAirdropInfo));
          }
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    };
    
    checkConnection();
  }, []);

  const handleConnectWallet = () => {
    modal.open();
    // After successful connection (would be handled by the wallet provider)
    localStorage.setItem('walletConnected', 'true');
    setIsConnected(true);
  };

  const claimAirdrop = () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    
    if (airdropInfo.claimed) {
      alert('You have already claimed your airdrop');
      return;
    }
    
    // Update airdrop info
    const updatedAirdropInfo = {
      ...airdropInfo,
      claimed: true
    };
    
    setAirdropInfo(updatedAirdropInfo);
    localStorage.setItem('airdropInfo', JSON.stringify(updatedAirdropInfo));
    
    alert(`Successfully claimed ${airdropInfo.eligibleAmount} ${airdropInfo.tokenSymbol}!`);
  };

  const calculateTimeRemaining = () => {
    const deadline = new Date(airdropInfo.claimDeadline).getTime();
    const now = new Date().getTime();
    const timeRemaining = deadline - now;
    
    if (timeRemaining <= 0) {
      return 'Expired';
    }
    
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    return `${days} days remaining`;
  };

  return (
    <div className="airdrop-container">
      <h1 className="airdrop-title">Airdrop</h1>
      
      {!isConnected ? (
        <div className="connect-wallet-container">
          <p>Connect your wallet to check your airdrop eligibility</p>
          <button 
            onClick={handleConnectWallet}
            className="connect-wallet-button"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="airdrop-content">
          <div className="airdrop-card">
            <div className="airdrop-header">
              <h2>{airdropInfo.tokenSymbol} Token Airdrop</h2>
              <span className="airdrop-deadline">{calculateTimeRemaining()}</span>
            </div>
            
            <div className="airdrop-details">
              <div className="airdrop-info-item">
                <span>Total Airdrop Amount</span>
                <span>{airdropInfo.totalAmount.toLocaleString()} {airdropInfo.tokenSymbol}</span>
              </div>
              
              <div className="airdrop-info-item">
                <span>Your Eligible Amount</span>
                <span className="eligible-amount">{airdropInfo.eligibleAmount.toLocaleString()} {airdropInfo.tokenSymbol}</span>
              </div>
              
              <div className="airdrop-info-item">
                <span>Claim Deadline</span>
                <span>{airdropInfo.claimDeadline}</span>
              </div>
              
              <div className="airdrop-info-item">
                <span>Status</span>
                <span className={`airdrop-status ${airdropInfo.claimed ? 'claimed' : 'unclaimed'}`}>
                  {airdropInfo.claimed ? 'Claimed' : 'Not Claimed'}
                </span>
              </div>
            </div>
            
            <button 
              onClick={claimAirdrop}
              className="claim-button"
              disabled={airdropInfo.claimed}
            >
              {airdropInfo.claimed ? 'Already Claimed' : 'Claim Airdrop'}
            </button>
          </div>
          
          <div className="airdrop-info-box">
            <h3>About This Airdrop</h3>
            <p>
              This airdrop is part of the TOPAY Foundation's early adopter rewards program. 
              Users who participate in the ecosystem by running nodes, completing tasks, 
              and referring friends are eligible to receive TOPAY tokens.
            </p>
            <p>
              Make sure to claim your tokens before the deadline. Unclaimed tokens will be 
              redistributed to the community treasury.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}