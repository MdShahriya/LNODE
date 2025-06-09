'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'react-hot-toast';
import { signOut } from 'next-auth/react';

interface TwitterOAuthBindProps {
  onConnectionUpdate?: (connected: boolean) => void;
}

const TwitterOAuthBind: React.FC<TwitterOAuthBindProps> = ({ onConnectionUpdate }) => {
  const { address } = useAccount();
  const [isConnected, setIsConnected] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkConnectionStatus = useCallback(async () => {
    if (!address) return;

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
        const connected = data.user?.twitterConnected || false;
        const username = data.user?.twitterUsername || null;
        
        setIsConnected(connected);
        setTwitterUsername(username);
        onConnectionUpdate?.(connected);
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  }, [address, onConnectionUpdate]);

  // Check connection status on component mount and when address changes
  useEffect(() => {
    checkConnectionStatus();
  }, [address, checkConnectionStatus]);

  const handleConnect = async () => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    
    try {
      // Step 1: Get authorization URL from our API
      const authResponse = await fetch('/api/auth/twitter/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
        }),
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        toast.error(errorData.error || 'Failed to get authorization URL');
        setIsLoading(false);
        return;
      }

      const { authorizationUrl } = await authResponse.json();

      // Step 2: Open popup window for Twitter authorization
      const popup = window.open(
        authorizationUrl,
        'twitter-auth',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        toast.error('Popup blocked. Please allow popups for this site.');
        setIsLoading(false);
        return;
      }

      // Step 3: Listen for popup to close (indicating completion)
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          // Check if connection was successful
          setTimeout(() => {
            checkConnectionStatus();
            setIsLoading(false);
          }, 1000);
        }
      }, 1000);

      // Handle popup messages
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'TWITTER_AUTH_SUCCESS') {
          popup.close();
          setIsConnected(true);
          setTwitterUsername(event.data.username);
          onConnectionUpdate?.(true);
          toast.success(`X account successfully connected: @${event.data.username}`);
          setIsLoading(false);
        } else if (event.data.type === 'TWITTER_AUTH_ERROR') {
          popup.close();
          toast.error(event.data.message || 'Failed to connect X account');
          setIsLoading(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Cleanup listener when popup closes
      const cleanup = () => {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosed);
      };

      // Set timeout to cleanup after 5 minutes
      setTimeout(cleanup, 300000);
      
    } catch (error) {
      console.error('Error connecting to Twitter:', error);
      toast.error('Failed to connect to X');
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    
    try {
      // Disconnect the Twitter account from the user's profile
      const response = await fetch('/api/auth/twitter/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
        }),
      });

      if (response.ok) {
        setIsConnected(false);
        setTwitterUsername(null);
        onConnectionUpdate?.(false);
        toast.success('X account successfully unbound!');
        
        // Sign out from NextAuth Twitter session
        await signOut({ redirect: false });
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to unbind X account');
      }
    } catch (error) {
      console.error('Error disconnecting Twitter:', error);
      toast.error('Failed to disconnect X account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="twitter-oauth-container">
      <div className="connection-status">
        {isConnected ? (
          <div className="connected-state">
            <div className="status-indicator connected">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <span>Connected to X</span>
            </div>
            {twitterUsername && (
              <div className="username-display">
                @{twitterUsername}
              </div>
            )}
          </div>
        ) : (
          <div className="disconnected-state">
            <div className="status-indicator disconnected">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>Not connected to X</span>
            </div>
          </div>
        )}
      </div>

      <div className="action-buttons">
        {isConnected ? (
          <button
            onClick={handleDisconnect}
            disabled={isLoading}
            className="disconnect-button"
          >
            {isLoading ? 'Disconnecting...' : 'Disconnect X'}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isLoading || !address}
            className="connect-button"
          >
            {isLoading ? 'Connecting...' : 'Bind X'}
          </button>
        )}
      </div>
    </div>
  );
};

export default TwitterOAuthBind;