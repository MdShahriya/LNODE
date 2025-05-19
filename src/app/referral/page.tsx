'use client'

import { useState, useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import './referral.css';

interface Referral {
  id: string;
  email: string;
  status: 'pending' | 'joined';
  date: string;
}

interface Task {
  title: string;
  completed: boolean;
  reward: number;
}

export default function Referral() {
  const { isConnected, address } = useAccount();
  const { connect } = useConnect();
  const [referralLink, setReferralLink] = useState('');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [email, setEmail] = useState('');
  
  // Generate referral link and load referrals when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      // Generate a referral link using the connected wallet address
      const refLink = `https://topayfoundation.com/join?ref=${address.substring(0, 8)}`;
      setReferralLink(refLink);
      
      // Load saved referrals from localStorage
      const savedReferrals = localStorage.getItem('referrals');
      if (savedReferrals) {
        setReferrals(JSON.parse(savedReferrals) as Referral[]);
      }
    }
  }, [isConnected, address]);
  
  // Save referrals to localStorage when they change
  useEffect(() => {
    if (isConnected && referrals.length > 0) {
      localStorage.setItem('referrals', JSON.stringify(referrals));
    }
  }, [referrals, isConnected]);

  const { connectors } = useConnect();
  
  const handleConnectWallet = () => {
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };
  
  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    alert('Referral link copied to clipboard!');
  };
  
  const sendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      alert('Please enter an email address');
      return;
    }
    
    // Create a new referral
    const newReferral: Referral = {
      id: Date.now().toString(),
      email,
      status: 'pending',
      date: new Date().toLocaleDateString()
    };
    
    setReferrals([newReferral, ...referrals]);
    setEmail('');
    
    // In a real app, this would send an email to the invitee
    alert(`Invitation sent to ${email}`);
  };
  
  const simulateJoin = (id: string) => {
    // Update referral status
    const updatedReferrals = referrals.map(ref => {
      if (ref.id === id && ref.status === 'pending') {
        // Update task completion for referral
        updateReferralTaskCompletion();
        return { ...ref, status: 'joined' as const };
      }
      return ref;
    });
    
    setReferrals(updatedReferrals);
  };
  
  const updateReferralTaskCompletion = () => {
    // Get tasks from localStorage
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
      const tasks = JSON.parse(savedTasks);
      
      // Find the referral task
      const updatedTasks = tasks.map((task: Task) => {
        if (task.title === 'Refer a Friend' && !task.completed) {
          // Update user stats
          const savedStats = localStorage.getItem('userStats');
          if (savedStats) {
            const stats = JSON.parse(savedStats);
            const updatedStats = {
              ...stats,
              points: stats.points + task.reward,
              tasksCompleted: stats.tasksCompleted + 1
            };
            localStorage.setItem('userStats', JSON.stringify(updatedStats));
          }
          
          return { ...task, completed: true };
        }
        return task;
      });
      
      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    }
  };

  return (
    <div className="referral-container">
      <h1 className="referral-title">Referral Program</h1>
      
      {!isConnected ? (
        <div className="connect-wallet-container">
          <p>Connect your wallet to access the referral program</p>
          <button 
            onClick={handleConnectWallet}
            className="connect-wallet-button"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          <div className="referral-info">
            <h2>Your Referral Link</h2>
            <div className="referral-link-container">
              <input 
                type="text" 
                value={referralLink} 
                readOnly 
                className="referral-link-input"
              />
              <button 
                onClick={copyReferralLink}
                className="copy-button"
              >
                Copy
              </button>
            </div>
            <p className="referral-description">
              Share your referral link with friends and earn rewards when they join!
            </p>
          </div>
          
          <div className="invite-form-container">
            <h2>Invite by Email</h2>
            <form onSubmit={sendInvite} className="invite-form">
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Enter friend&apos;s email" 
                className="email-input"
              />
              <button type="submit" className="invite-button">Send Invite</button>
            </form>
          </div>
          
          <div className="referrals-list-container">
            <h2>Your Referrals</h2>
            {referrals.length === 0 ? (
              <p className="no-referrals">You haven&apos;t referred anyone yet.</p>
            ) : (
              <div className="referrals-list">
                <div className="referral-header">
                  <span>Email</span>
                  <span>Status</span>
                  <span>Date</span>
                  <span>Action</span>
                </div>
                {referrals.map(referral => (
                  <div key={referral.id} className="referral-item">
                    <span>{referral.email}</span>
                    <span className={`status ${referral.status}`}>
                      {referral.status === 'pending' ? 'Pending' : 'Joined'}
                    </span>
                    <span>{referral.date}</span>
                    <span>
                      {referral.status === 'pending' && (
                        <button 
                          onClick={() => simulateJoin(referral.id)}
                          className="simulate-button"
                        >
                          Simulate Join
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}