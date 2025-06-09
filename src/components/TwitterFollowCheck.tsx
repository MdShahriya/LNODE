'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAccount } from 'wagmi';

interface TwitterFollowCheckProps {
  targetUsername?: string;
  onVerificationSuccess?: (isFollowing: boolean) => void;
  onVerificationFailure?: (error: string) => void;
}

export default function TwitterFollowCheck({
  targetUsername = 'TopayFoundation',
  onVerificationSuccess,
  onVerificationFailure
}: TwitterFollowCheckProps) {
  const { address } = useAccount();
  const [isChecking, setIsChecking] = useState(false);
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [twitterUsername, setTwitterUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const checkFollowStatus = useCallback(async () => {
    if (!address) {
      const errorMsg = 'Please connect your wallet first';
      setError(errorMsg);
      if (onVerificationFailure) onVerificationFailure(errorMsg);
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch(`/api/user/twitter-verify?targetUsername=${targetUsername}`);
      const result = await response.json();

      if (response.ok) {
        setIsFollowing(result.verified);
        setTwitterUsername(result.twitterUsername);
        
        if (result.verified) {
          toast.success(`You are following @${targetUsername}`);
          if (onVerificationSuccess) onVerificationSuccess(true);
        } else {
          toast.error(`You are not following @${targetUsername}`);
          if (onVerificationSuccess) onVerificationSuccess(false);
        }
      } else {
        setError(result.error || 'Failed to verify Twitter follow status');
        if (onVerificationFailure) onVerificationFailure(result.error);
        toast.error(result.error || 'Failed to verify Twitter follow status');
      }
    } catch {
      const errorMsg = 'Error checking Twitter follow status';
      setError(errorMsg);
      if (onVerificationFailure) onVerificationFailure(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsChecking(false);
    }
  }, [address, targetUsername, onVerificationSuccess, onVerificationFailure]);

  // Check follow status when component mounts if wallet is connected
  useEffect(() => {
    if (address) {
      checkFollowStatus();
    }
  }, [address, checkFollowStatus]);

  return (
    <div className="twitter-follow-check">
      <div className="follow-check-header">
        <h3>Twitter Follow Check</h3>
      </div>

      <div className="follow-check-content">
        {error ? (
          <div className="error-message">
            <p>{error}</p>
            {error.includes('not connected') && (
              <p className="connect-prompt">
                Please connect your Twitter account in your profile settings.
              </p>
            )}
          </div>
        ) : isChecking ? (
          <div className="checking-status">
            <div className="spinner"></div>
            <p>Checking if you follow @{targetUsername}...</p>
          </div>
        ) : isFollowing === null ? (
          <div className="initial-state">
            <p>Click the button below to check if you follow @{targetUsername}</p>
          </div>
        ) : isFollowing ? (
          <div className="following-status success">
            <p>✅ @{twitterUsername} is following @{targetUsername}</p>
          </div>
        ) : (
          <div className="following-status error">
            <p>❌ @{twitterUsername} is not following @{targetUsername}</p>
            <a 
              href={`https://twitter.com/${targetUsername}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="follow-link"
            >
              Follow @{targetUsername} on Twitter
            </a>
          </div>
        )}
      </div>

      <div className="follow-check-actions">
        <button 
          onClick={checkFollowStatus} 
          disabled={isChecking}
          className="check-button"
        >
          {isChecking ? (
            <>
              <span className="spinner-small"></span>
              Checking...
            </>
          ) : (
            'Check Follow Status'
          )}
        </button>
      </div>

      <style jsx>{`
        .twitter-follow-check {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          margin: 16px 0;
        }

        .follow-check-header h3 {
          margin: 0 0 16px 0;
          color: #1da1f2;
          font-size: 18px;
        }

        .follow-check-content {
          background: #e3f2fd;
          padding: 16px;
          border-radius: 6px;
          margin-bottom: 16px;
          min-height: 80px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .follow-check-content p {
          margin: 0 0 8px 0;
          color: #1565c0;
        }

        .error-message {
          background: #ffebee;
          padding: 12px;
          border-radius: 6px;
          color: #c62828;
        }

        .error-message p {
          color: #c62828;
          margin: 0 0 8px 0;
        }

        .error-message .connect-prompt {
          font-style: italic;
          font-size: 14px;
        }

        .checking-status {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .following-status {
          padding: 12px;
          border-radius: 6px;
          text-align: center;
        }

        .following-status.success {
          background: #e8f5e9;
        }

        .following-status.success p {
          color: #2e7d32;
          font-weight: 600;
        }

        .following-status.error {
          background: #ffebee;
        }

        .following-status.error p {
          color: #c62828;
          font-weight: 600;
        }

        .follow-link {
          display: inline-block;
          margin-top: 8px;
          color: #1da1f2;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.2s;
        }

        .follow-link:hover {
          text-decoration: underline;
          opacity: 0.9;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(29, 161, 242, 0.2);
          border-top: 3px solid #1da1f2;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        .spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          display: inline-block;
          margin-right: 8px;
          vertical-align: middle;
        }

        .check-button {
          background: #1da1f2;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .check-button:hover:not(:disabled) {
          background: #1991db;
          transform: translateY(-1px);
        }

        .check-button:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}