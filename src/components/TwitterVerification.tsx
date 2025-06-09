'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAccount } from 'wagmi';

interface TwitterVerificationProps {
  taskId: string;
  action?: 'follow' | 'retweet' | 'like';
  targetUsername?: string;
  tweetId?: string;
  onVerificationSuccess?: (taskId: string) => void;
}

export default function TwitterVerification({
  taskId,
  action = 'follow',
  targetUsername = 'TopayFoundation',
  tweetId,
  onVerificationSuccess
}: TwitterVerificationProps) {
  const { address } = useAccount();
  const [username, setUsername] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const handleVerification = async () => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!username.trim()) {
      toast.error('Please enter your Twitter username');
      return;
    }

    if ((action === 'retweet' || action === 'like') && !tweetId) {
      toast.error(`Tweet ID is required for ${action} verification`);
      return;
    }

    setIsVerifying(true);

    try {
      const params = new URLSearchParams({
        walletAddress: address,
        platform: 'twitter',
        username: username.replace('@', ''), // Remove @ if user includes it
        action,
        targetUsername
      });

      if (tweetId) {
        params.append('tweetId', tweetId);
      }

      const response = await fetch(`/api/social/verify?${params}`);
      const result = await response.json();

      if (result.verified) {
        setIsVerified(true);
        toast.success(result.message || `Twitter ${action} verification successful!`);
        
        // Call the success callback if provided
        if (onVerificationSuccess) {
          onVerificationSuccess(taskId);
        }
      } else {
        toast.error(result.message || `Twitter ${action} verification failed`);
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Verification failed. Please try again later.');
    } finally {
      setIsVerifying(false);
    }
  };

  const getActionText = () => {
    switch (action) {
      case 'follow':
        return `Follow @${targetUsername}`;
      case 'retweet':
        return 'Retweet the specified tweet';
      case 'like':
        return 'Like the specified tweet';
      default:
        return 'Complete the Twitter action';
    }
  };

  const getInstructions = () => {
    switch (action) {
      case 'follow':
        return `Please follow @${targetUsername} on Twitter, then enter your Twitter username below to verify.`;
      case 'retweet':
        return 'Please retweet the specified tweet, then enter your Twitter username below to verify.';
      case 'like':
        return 'Please like the specified tweet, then enter your Twitter username below to verify.';
      default:
        return 'Please complete the required Twitter action, then verify below.';
    }
  };

  return (
    <div className="twitter-verification-container">
      <div className="verification-header">
        <h3>Twitter Verification</h3>
        <p className="action-text">{getActionText()}</p>
      </div>

      <div className="verification-instructions">
        <p>{getInstructions()}</p>
        {tweetId && (
          <p className="tweet-info">
            <strong>Tweet ID:</strong> {tweetId}
          </p>
        )}
      </div>

      <div className="verification-form">
        <div className="input-group">
          <label htmlFor="twitter-username">Twitter Username:</label>
          <input
            id="twitter-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your Twitter username (without @)"
            disabled={isVerifying || isVerified}
            className="username-input"
          />
        </div>

        <button
          onClick={handleVerification}
          disabled={isVerifying || isVerified || !username.trim()}
          className={`verify-button ${
            isVerified ? 'verified' : isVerifying ? 'verifying' : ''
          }`}
        >
          {isVerifying ? (
            <>
              <span className="spinner"></span>
              Verifying...
            </>
          ) : isVerified ? (
            <>
              <span className="checkmark">✓</span>
              Verified
            </>
          ) : (
            `Verify ${action.charAt(0).toUpperCase() + action.slice(1)}`
          )}
        </button>
      </div>

      {isVerified && (
        <div className="verification-success">
          <p>✅ Twitter {action} verification completed successfully!</p>
        </div>
      )}

      <style jsx>{`
        .twitter-verification-container {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          margin: 16px 0;
        }

        .verification-header h3 {
          margin: 0 0 8px 0;
          color: #1da1f2;
          font-size: 18px;
        }

        .action-text {
          font-weight: 600;
          color: #333;
          margin: 0 0 16px 0;
        }

        .verification-instructions {
          background: #e3f2fd;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .verification-instructions p {
          margin: 0 0 8px 0;
          color: #1565c0;
        }

        .tweet-info {
          font-size: 14px;
          color: #666;
        }

        .input-group {
          margin-bottom: 16px;
        }

        .input-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #333;
        }

        .username-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .username-input:focus {
          outline: none;
          border-color: #1da1f2;
          box-shadow: 0 0 0 2px rgba(29, 161, 242, 0.1);
        }

        .username-input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .verify-button {
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
          gap: 8px;
        }

        .verify-button:hover:not(:disabled) {
          background: #1991db;
          transform: translateY(-1px);
        }

        .verify-button:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
        }

        .verify-button.verified {
          background: #28a745;
        }

        .verify-button.verifying {
          background: #6c757d;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .checkmark {
          font-size: 16px;
        }

        .verification-success {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
          padding: 12px;
          border-radius: 6px;
          margin-top: 16px;
        }

        .verification-success p {
          margin: 0;
          font-weight: 500;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}