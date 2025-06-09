'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

interface TwitterOAuthProps {
  onSuccess?: (data: Record<string, unknown>) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface TwitterConnectionStatus {
  connected: boolean;
  username?: string;
  connectedAt?: string;
  verified?: boolean;
}

export default function TwitterOAuth({ onSuccess, onError, className }: TwitterOAuthProps) {
  const { address } = useAccount();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<TwitterConnectionStatus>({ connected: false });
  const [loading, setLoading] = useState(true);

  // Define checkConnectionStatus with useCallback to prevent recreation on each render
  const checkConnectionStatus = useCallback(async () => {
    if (!address) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (response.ok) {
        const data = await response.json();
        const user = data.user;
        
        setConnectionStatus({
          connected: !!user.twitterVerified,
          username: user.twitterUsername,
          connectedAt: user.twitterConnectedAt,
          verified: user.twitterVerified,
        });
      }
    } catch (error) {
      console.error('Error checking Twitter connection status:', error);
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Check current connection status
  useEffect(() => {
    checkConnectionStatus();
  }, [address, checkConnectionStatus]);

  // Handle URL parameters for OAuth callback results
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const twitterSuccess = urlParams.get('twitter_success');
    const twitterError = urlParams.get('twitter_error');

    if (twitterSuccess === 'connected') {
      // Refresh connection status
      checkConnectionStatus();
      onSuccess?.({ message: 'Twitter account connected successfully!' });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (twitterError) {
      const errorMessages: { [key: string]: string } = {
        access_denied: 'Twitter authorization was denied.',
        missing_params: 'Missing required parameters from Twitter.',
        invalid_state: 'Invalid OAuth state. Please try again.',
        no_wallet: 'No wallet address found. Please connect your wallet first.',
        user_not_found: 'User account not found.',
        callback_failed: 'OAuth callback failed. Please try again.',
      };
      
      const errorMessage = errorMessages[twitterError] || 'An unknown error occurred.';
      onError?.(errorMessage);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [onSuccess, onError, checkConnectionStatus]);

  // Remove the duplicate checkConnectionStatus function
  
  const handleConnect = async () => {
    if (!address) {
      onError?.('Please connect your wallet first.');
      return;
    }

    setIsConnecting(true);

    try {
      const response = await fetch('/api/auth/twitter/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          walletAddress: address,
          scopes: ['tweet.read', 'users.read', 'follows.read', 'like.read']
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Twitter OAuth
        window.location.href = data.authUrl;
      } else {
        const errorData = await response.json();
        onError?.(errorData.error || 'Failed to initiate Twitter connection.');
      }
    } catch (error) {
      console.error('Error initiating Twitter OAuth:', error);
      onError?.('Network error. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!address) {
      onError?.('Please connect your wallet first.');
      return;
    }

    setIsConnecting(true);

    try {
      const response = await fetch('/api/auth/twitter/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (response.ok) {
        setConnectionStatus({ connected: false });
        onSuccess?.({ message: 'Twitter account disconnected successfully!' });
      } else {
        const errorData = await response.json();
        onError?.(errorData.error || 'Failed to disconnect Twitter account.');
      }
    } catch (error) {
      console.error('Error disconnecting Twitter:', error);
      onError?.('Network error. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className={`twitter-oauth-loading ${className || ''}`}>
        <div className="loading-spinner"></div>
        <span>Checking Twitter connection...</span>
      </div>
    );
  }

  return (
    <div className={`twitter-oauth-container ${className || ''}`}>
      <div className="twitter-oauth-header">
        <div className="twitter-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </div>
        <h3>Twitter Connection</h3>
      </div>

      {connectionStatus.connected ? (
        <div className="twitter-connected">
          <div className="connection-info">
            <div className="status-badge connected">
              <span className="status-dot"></span>
              Connected
            </div>
            <div className="username">@{connectionStatus.username}</div>
            {connectionStatus.connectedAt && (
              <div className="connected-date">
                Connected on {new Date(connectionStatus.connectedAt).toLocaleDateString()}
              </div>
            )}
          </div>
          
          <button
            onClick={handleDisconnect}
            disabled={isConnecting}
            className="disconnect-button"
          >
            {isConnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      ) : (
        <div className="twitter-disconnected">
          <div className="connection-info">
            <div className="status-badge disconnected">
              <span className="status-dot"></span>
              Not Connected
            </div>
            <p className="description">
              Connect your Twitter account to verify your identity and unlock additional features.
            </p>
          </div>
          
          <button
            onClick={handleConnect}
            disabled={isConnecting || !address}
            className="connect-button"
          >
            {isConnecting ? 'Connecting...' : 'Connect Twitter'}
          </button>
          
          {!address && (
            <p className="wallet-warning">
              Please connect your wallet first to link your Twitter account.
            </p>
          )}
        </div>
      )}

      <style jsx>{`
        .twitter-oauth-container {
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
        }

        .twitter-oauth-loading {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px;
          color: #888;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #333;
          border-top: 2px solid #1da1f2;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .twitter-oauth-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .twitter-icon {
          color: #1da1f2;
        }

        .twitter-oauth-header h3 {
          margin: 0;
          color: #fff;
          font-size: 18px;
          font-weight: 600;
        }

        .connection-info {
          margin-bottom: 16px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 12px;
        }

        .status-badge.connected {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .status-badge.disconnected {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
        }

        .username {
          color: #1da1f2;
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 4px;
        }

        .connected-date {
          color: #888;
          font-size: 12px;
        }

        .description {
          color: #ccc;
          font-size: 14px;
          line-height: 1.5;
          margin: 0;
        }

        .connect-button, .disconnect-button {
          width: 100%;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .connect-button {
          background: #1da1f2;
          color: white;
        }

        .connect-button:hover:not(:disabled) {
          background: #1991db;
          transform: translateY(-1px);
        }

        .connect-button:disabled {
          background: #333;
          color: #666;
          cursor: not-allowed;
        }

        .disconnect-button {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .disconnect-button:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.2);
          transform: translateY(-1px);
        }

        .disconnect-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .wallet-warning {
          color: #f59e0b;
          font-size: 12px;
          text-align: center;
          margin: 12px 0 0 0;
          padding: 8px;
          background: rgba(245, 158, 11, 0.1);
          border-radius: 6px;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }
      `}</style>
    </div>
  );
}