/**
 * extension-integration.ts
 * 
 * This module provides integration between the TOPAY Dashboard and the Chrome extension.
 * It handles communication, state synchronization, and event handling between the two.
 */

// Define Chrome extension API types
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage?: (message: unknown, callback?: (response: unknown) => void) => void;
      };
      storage?: {
        local?: {
          get?: (keys: string[], callback: (result: unknown) => void) => void;
          set?: (items: object, callback?: () => void) => void;
        };
        onChanged?: {
          addListener: (callback: (changes: unknown) => void) => void;
        };
      };
    };
  }
}

// Define types for extension communication
export interface ExtensionState {
  isNodeRunning: boolean;
  walletAddress: string | null;
  totalPoints: number;
  deviceIP?: string;
  pointsRate?: number;
}

export interface ExtensionEvent {
  type: string;
  data?: unknown; // Using unknown here since we need to handle various data types
}

export interface ExtensionEventHandlers {
  onStateChange?: (state: ExtensionState) => void;
  onWalletConnect?: (address: string) => void;
  onWalletDisconnect?: () => void;
  onExtensionInstalled?: () => void;
  onError?: (error: Error) => void;
}

// Define response types
interface PingResponse {
  success: boolean;
}

interface ToggleNodeResponse {
  success: boolean;
  isNodeRunning: boolean;
}

// Define storage change types
interface StorageChange {
  oldValue?: unknown;
  newValue?: unknown;
}

interface StorageChanges {
  [key: string]: StorageChange;
}

// Check if the extension is installed
export const isExtensionInstalled = (): boolean => {
  return typeof window !== 'undefined' && 
         !!window.chrome?.runtime && 
         !!window.chrome?.runtime?.sendMessage &&
         !!window.chrome?.storage?.local;
};

// Detect if the extension is installed
export const detectExtension = async (): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  // First check if Chrome APIs are available
  if (isExtensionInstalled()) {
    try {
      // Try to communicate with the extension
      return new Promise<boolean>((resolve) => {
        // We've already checked that these exist in isExtensionInstalled()
        window.chrome!.runtime!.sendMessage!({ type: 'PING' }, (response: unknown) => {
          const typedResponse = response as PingResponse;
          if (typedResponse && typedResponse.success) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
        
        // If no response within 500ms, assume extension is not available
        setTimeout(() => resolve(false), 500);
      });
    } catch (error) {
      console.error('Error detecting extension:', error);
      return false;
    }
  }
  
  return false;
};

// Get the wallet address from the extension
export const getExtensionWalletAddress = async (): Promise<string | null> => {
  return new Promise<string | null>((resolve) => {
    if (!isExtensionInstalled()) {
      resolve(null);
      return;
    }
    
    try {
      // We've already checked that these exist in isExtensionInstalled()
      window.chrome!.storage!.local!.get!(['walletAddress'], function(result: unknown) {
        const typedResult = result as {walletAddress?: string};
        if (typedResult.walletAddress) {
          resolve(typedResult.walletAddress);
        } else {
          resolve(null);
        }
      });
    } catch (error) {
      console.error('Error accessing extension wallet:', error);
      resolve(null);
    }
  });
};

// Get the node status from the extension
export const getNodeStatus = async (): Promise<ExtensionState | null> => {
  return new Promise<ExtensionState | null>((resolve) => {
    if (!isExtensionInstalled()) {
      resolve(null);
      return;
    }
    
    try {
      // Use the extension's API to get the current state
      // We've already checked that these exist in isExtensionInstalled()
      window.chrome!.runtime!.sendMessage!({ type: 'GET_STATE' }, (response: unknown) => {
        const typedResponse = response as ExtensionState | null;
        if (typedResponse) {
          resolve(typedResponse);
        } else {
          resolve(null);
        }
      });
    } catch (error) {
      console.error('Error getting node status:', error);
      resolve(null);
    }
  });
};

// Toggle the node state in the extension
export const toggleNode = async (): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    if (!isExtensionInstalled()) {
      resolve(false);
      return;
    }
    
    try {
      // We've already checked that these exist in isExtensionInstalled()
      window.chrome!.runtime!.sendMessage!({ type: 'TOGGLE_NODE' }, (response: unknown) => {
        const typedResponse = response as ToggleNodeResponse;
        if (typedResponse && typedResponse.success) {
          resolve(typedResponse.isNodeRunning);
        } else {
          resolve(false);
        }
      });
    } catch (error) {
      console.error('Error toggling node:', error);
      resolve(false);
    }
  });
};

// Request to toggle the node (used in page.tsx)
export const requestToggleNode = async (): Promise<void> => {
  if (!isExtensionInstalled()) {
    console.error('Extension not installed, cannot toggle node');
    return;
  }
  
  try {
    await toggleNode();
  } catch (error) {
    console.error('Error requesting node toggle:', error);
  }
};

// Set up listeners for extension events (original implementation)
export const setupExtensionListeners = (callback: (event: ExtensionEvent) => void): (() => void) => {
  if (!isExtensionInstalled() || typeof window === 'undefined') {
    return () => {}; // Return empty cleanup function
  }
  
  // Listen for extension installation event
  const handleExtensionInstalled = () => {
    callback({
      type: 'EXTENSION_INSTALLED'
    });
  };
  
  // Listen for messages from the extension via window messaging
  const handleExtensionMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'FROM_EXTENSION') {
      callback({
        type: event.data.event,
        data: event.data.data
      });
    }
  };
  
  // Set up the listeners
  document.addEventListener('topayNodeExtensionInstalled', handleExtensionInstalled);
  window.addEventListener('message', handleExtensionMessage);
  
  // Set up storage change listener if available
  if (window.chrome?.storage?.onChanged) {
    window.chrome.storage.onChanged.addListener((changes: unknown) => {
      const typedChanges = changes as StorageChanges;
      const updatedState: Partial<ExtensionState> = {};
      let hasChanges = false;
      
      if (typedChanges.walletAddress) {
        updatedState.walletAddress = typedChanges.walletAddress.newValue as string | null;
        hasChanges = true;
      }
      
      if (typedChanges.isNodeRunning) {
        updatedState.isNodeRunning = typedChanges.isNodeRunning.newValue as boolean;
        hasChanges = true;
      }
      
      if (typedChanges.totalPoints) {
        updatedState.totalPoints = typedChanges.totalPoints.newValue as number;
        hasChanges = true;
      }
      
      if (hasChanges) {
        callback({
          type: 'STATE_UPDATED',
          data: updatedState
        });
      }
    });
  }
  
  // Return a cleanup function
  return () => {
    document.removeEventListener('topayNodeExtensionInstalled', handleExtensionInstalled);
    window.removeEventListener('message', handleExtensionMessage);
    // Note: We can't easily remove the chrome.storage.onChanged listener
  };
};

// Set up extension event listeners with specific handlers (used in page.tsx)
export const setupExtensionEventListeners = (handlers: ExtensionEventHandlers): (() => void) => {
  if (!isExtensionInstalled() || typeof window === 'undefined') {
    return () => {}; // Return empty cleanup function
  }
  
  // Create a callback function that will route events to the appropriate handlers
  const eventCallback = (event: ExtensionEvent) => {
    try {
      switch (event.type) {
        case 'STATE_UPDATED':
          if (handlers.onStateChange && event.data) {
            handlers.onStateChange(event.data as ExtensionState);
          }
          break;
          
        case 'WALLET_CONNECTED':
          if (handlers.onWalletConnect && event.data) {
            const walletData = event.data as { walletAddress?: string };
            if (walletData.walletAddress) {
              handlers.onWalletConnect(walletData.walletAddress);
            }
          }
          break;
          
        case 'WALLET_DISCONNECTED':
          if (handlers.onWalletDisconnect) {
            handlers.onWalletDisconnect();
          }
          break;
          
        case 'EXTENSION_INSTALLED':
          if (handlers.onExtensionInstalled) {
            handlers.onExtensionInstalled();
          }
          break;
          
        default:
          console.log('Unhandled extension event:', event.type, event.data);
      }
    } catch (error) {
      console.error('Error handling extension event:', error);
      if (handlers.onError) {
        handlers.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };
  
  // Use the existing setupExtensionListeners function to set up the event listeners
  return setupExtensionListeners(eventCallback);
};

// Connect wallet to extension
export const connectWalletToExtension = async (walletAddress: string): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    if (!isExtensionInstalled()) {
      resolve(false);
      return;
    }
    
    try {
      // We've already checked that these exist in isExtensionInstalled()
      window.chrome!.storage!.local!.set!({ walletAddress }, () => {
        resolve(true);
      });
    } catch (error) {
      console.error('Error connecting wallet to extension:', error);
      resolve(false);
    }
  });
};

// Disconnect wallet from extension
export const disconnectWalletFromExtension = async (): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    if (!isExtensionInstalled()) {
      resolve(false);
      return;
    }
    
    try {
      // We've already checked that these exist in isExtensionInstalled()
      window.chrome!.storage!.local!.set!({ walletAddress: null }, () => {
        resolve(true);
      });
    } catch (error) {
      console.error('Error disconnecting wallet from extension:', error);
      resolve(false);
    }
  });
};