// inject.js - Injected into the dashboard page to detect the extension

// Set a flag to indicate that the extension is installed
window.topayNodeExtensionDetected = true;

// Create a custom event to notify the dashboard that the extension is installed
const event = new CustomEvent('topayNodeExtensionInstalled');
document.dispatchEvent(event);

// Define the extension API that will be available to the dashboard
window.topayNodeExtension = {
  // Get the current node status
  getNodeStatus: () => {
    return new Promise((resolve, reject) => {
      // Send a message to the extension to get the node status
      window.postMessage({
        type: 'FROM_DASHBOARD',
        action: 'SYNC_REQUEST'
      }, '*');
      
      // Set up a listener for the response
      const listener = (event) => {
        if (event.data.type === 'FROM_EXTENSION' && event.data.action === 'SYNC_RESPONSE') {
          window.removeEventListener('message', listener);
          resolve(event.data.data || {});
        }
      };
      
      window.addEventListener('message', listener);
      
      // Set a timeout to reject the promise if no response is received
      setTimeout(() => {
        window.removeEventListener('message', listener);
        reject(new Error('Timeout waiting for node status'));
      }, 5000);
    });
  },
  
  // Toggle the node (start/stop)
  toggleNode: () => {
    return new Promise((resolve, reject) => {
      // Send a message to the extension to toggle the node
      window.postMessage({
        type: 'FROM_DASHBOARD',
        action: 'TOGGLE_NODE'
      }, '*');
      
      // Set up a listener for the response
      const listener = (event) => {
        if (event.data.type === 'FROM_EXTENSION' && event.data.action === 'TOGGLE_NODE_RESPONSE') {
          window.removeEventListener('message', listener);
          resolve(event.data.data || {});
        }
      };
      
      window.addEventListener('message', listener);
      
      // Set a timeout to reject the promise if no response is received
      setTimeout(() => {
        window.removeEventListener('message', listener);
        reject(new Error('Timeout waiting for toggle node response'));
      }, 5000);
    });
  },
  
  // Get the connection history
  getConnectionHistory: () => {
    return new Promise((resolve, reject) => {
      // Send a message to the extension to get the connection history
      window.postMessage({
        type: 'FROM_DASHBOARD',
        action: 'GET_CONNECTION_HISTORY'
      }, '*');
      
      // Set up a listener for the response
      const listener = (event) => {
        if (event.data.type === 'FROM_EXTENSION' && event.data.action === 'CONNECTION_HISTORY_RESPONSE') {
          window.removeEventListener('message', listener);
          resolve(event.data.data || []);
        }
      };
      
      window.addEventListener('message', listener);
      
      // Set a timeout to reject the promise if no response is received
      setTimeout(() => {
        window.removeEventListener('message', listener);
        reject(new Error('Timeout waiting for connection history'));
      }, 5000);
    });
  },
  
  // Connect wallet to the extension
  connectWallet: (walletAddress) => {
    return new Promise((resolve, reject) => {
      if (!walletAddress || !walletAddress.startsWith('0x')) {
        reject(new Error('Invalid wallet address'));
        return;
      }
      
      // Create a unique message ID for this request
      const messageId = 'connect_wallet_' + Date.now();
      
      // Send a message to the extension to connect the wallet
      window.postMessage({
        type: 'FROM_DASHBOARD',
        action: 'CONNECT_WALLET',
        walletAddress,
        messageId
      }, '*');
      
      // Set up a listener for the response
      const listener = (event) => {
        // Only process messages from the extension with the matching message ID or general connect wallet responses
        if (event.data.type === 'FROM_EXTENSION' && 
            (event.data.action === 'CONNECT_WALLET_RESPONSE' || 
             (event.data.messageId && event.data.messageId === messageId))) {
          window.removeEventListener('message', listener);
          if (event.data.success) {
            resolve(true);
          } else {
            reject(new Error(event.data.error || 'Failed to connect wallet'));
          }
        }
      };
      
      window.addEventListener('message', listener);
      
      // Set a timeout to reject the promise if no response is received
      setTimeout(() => {
        window.removeEventListener('message', listener);
        // Don't reject with error, just resolve with a warning
        console.warn('Timeout waiting for wallet connection response, but continuing anyway');
        resolve(false); // Resolve with false instead of rejecting
      }, 5000);
    });
  }
};

console.log('TOPAY Node Extension detected and API injected');