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
  const [twitterWindow, setTwitterWindow] = useState<Window | null>(null);
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);

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

  // Function to check if popup window is closed
  const checkPopupClosed = useCallback(() => {
    if (twitterWindow && twitterWindow.closed) {
      // Clear the interval
      if (checkInterval) {
        clearInterval(checkInterval);
        setCheckInterval(null);
      }
      
      // Check connection status after popup is closed
      checkConnectionStatus();
    }
  }, [twitterWindow, checkInterval, checkConnectionStatus]);
  
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
        
        // Open X OAuth in a popup window
        const width = 600;
        const height = 600;
        const left = window.innerWidth / 2 - width / 2;
        const top = window.innerHeight / 2 - height / 2;
        const features = `width=${width},height=${height},left=${left},top=${top},location=yes,toolbar=no,menubar=no,scrollbars=yes,status=no`;
        
        // Open the popup and store the reference
        const popup = window.open(data.authUrl, 'x_oauth_popup', features);
        setTwitterWindow(popup);
        
        // Set up an interval to check if the popup is closed
        const interval = setInterval(checkPopupClosed, 1000);
        setCheckInterval(interval);
      } else {
        const errorData = await response.json();
        onError?.(errorData.error || 'Failed to initiate X connection.');
      }
    } catch (error) {
      console.error('Error initiating X OAuth:', error);
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
        onSuccess?.({ message: 'X account disconnected successfully!' });
      } else {
        const errorData = await response.json();
        onError?.(errorData.error || 'Failed to disconnect X account.');
      }
    } catch (error) {
      console.error('Error disconnecting X:', error);
      onError?.('Network error. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [checkInterval]);

  // Add event listener for messages from the popup window
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      // Check if the message is from our X auth popup
      if (event.data && event.data.type === 'X_AUTH_RESULT') {
        // Close the popup if it's still open
        if (twitterWindow && !twitterWindow.closed) {
          twitterWindow.close();
        }
        
        // Clear the check interval
        if (checkInterval) {
          clearInterval(checkInterval);
          setCheckInterval(null);
        }
        
        // Handle the authentication result
        if (event.data.status === 'success') {
          checkConnectionStatus();
          onSuccess?.({ message: event.data.message || 'X account connected successfully!' });
        } else {
          onError?.(event.data.message || 'An error occurred during X authentication.');
        }
      }
    };
    
    // Add the event listener
    window.addEventListener('message', handleAuthMessage);
    
    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('message', handleAuthMessage);
    };
  }, [twitterWindow, checkInterval, checkConnectionStatus, onSuccess, onError]);

  if (loading) {
    return (
      <div className={`twitter-oauth-loading ${className || ''}`}>
        <div className="loading-spinner"></div>
        <span>Checking X connection...</span>
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
        <h3>X Connection</h3>
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
            className="disconnect-button"
            onClick={handleDisconnect}
            disabled={isConnecting}
          >
            {isConnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      ) : (
        <div className="twitter-not-connected">
          <div className="connection-info">
            <div className="status-badge not-connected">
              <span className="status-dot"></span>
              Not Connected
            </div>
            <p className="connect-message">
              Connect your X account to verify your identity and unlock additional features.
            </p>
          </div>
          
          <button
            className="connect-button"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect X'}
          </button>
        </div>
      )}
    </div>
  );
}