// content.js - Content script for the TOPAY Node Dashboard extension

// Inject the script into the page
function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
  console.log('TOPAY Node Extension: Script injected');
}

// Inject the script when the page loads
injectScript();

// Check if this is the dashboard page and extract wallet address from URL if present
if (window.location.pathname.includes('/dashboard')) {
  // Get the URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const walletAddress = urlParams.get('wallet');
  
  // If wallet address is present and valid, send it to the background script
  if (walletAddress && walletAddress.startsWith('0x')) {
    chrome.runtime.sendMessage({ 
      type: 'SET_WALLET_ADDRESS', 
      walletAddress: walletAddress 
    }, () => {
      // Handle potential error with callback
      if (chrome.runtime.lastError) {
        console.log('Error setting wallet address:', chrome.runtime.lastError.message);
        // Continue execution despite error
      }
      // No response processing needed but callback required to prevent errors
    });
    console.log('TOPAY Node Extension: Wallet address extracted from URL', walletAddress);
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'EXTENSION_EVENT') {
    // Forward the event to the page
    window.postMessage({
      type: 'FROM_EXTENSION',
      event: message.event,
      data: message.data
    }, '*');
  }
  return true;
});

// Listen for messages from the page
window.addEventListener('message', (event) => {
  // Only accept messages from the same frame
  if (event.source !== window) return;
  
  // Check if the message is from the dashboard
  if (event.data.type === 'FROM_DASHBOARD') {
    switch (event.data.action) {
      case 'SYNC_REQUEST':
        // Get the current state from the background script
        chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
          try {
            // Check for runtime errors
            if (chrome.runtime.lastError) {
              console.error('Error getting state:', chrome.runtime.lastError.message);
              // Send an error response back to the page
              window.postMessage({
                type: 'FROM_EXTENSION',
                action: 'SYNC_RESPONSE',
                error: chrome.runtime.lastError.message,
                success: false
              }, '*');
              return;
            }
            
            // Send the response back to the page
            window.postMessage({
              type: 'FROM_EXTENSION',
              action: 'SYNC_RESPONSE',
              data: response,
              success: true
            }, '*');
          } catch (error) {
            console.error('Error sending SYNC_RESPONSE:', error);
            // Try to send an error response
            try {
              window.postMessage({
                type: 'FROM_EXTENSION',
                action: 'SYNC_RESPONSE',
                error: error.message,
                success: false
              }, '*');
            } catch (innerError) {
              console.error('Failed to send error response:', innerError);
            }
          }
        });
        break;
        
      case 'TOGGLE_NODE':
        // Send a message to the background script to toggle the node
        chrome.runtime.sendMessage({ type: 'TOGGLE_NODE' }, (response) => {
          try {
            // Check for runtime errors
            if (chrome.runtime.lastError) {
              console.error('Error toggling node:', chrome.runtime.lastError.message);
              // Send an error response back to the page
              window.postMessage({
                type: 'FROM_EXTENSION',
                action: 'TOGGLE_NODE_RESPONSE',
                error: chrome.runtime.lastError.message,
                success: false
              }, '*');
              return;
            }
            
            // Send the response back to the page
            window.postMessage({
              type: 'FROM_EXTENSION',
              action: 'TOGGLE_NODE_RESPONSE',
              data: response,
              success: true
            }, '*');
          } catch (error) {
            console.error('Error sending TOGGLE_NODE_RESPONSE:', error);
            // Try to send an error response
            try {
              window.postMessage({
                type: 'FROM_EXTENSION',
                action: 'TOGGLE_NODE_RESPONSE',
                error: error.message,
                success: false
              }, '*');
            } catch (innerError) {
              console.error('Failed to send error response:', innerError);
            }
          }
        });
        break;
        
      case 'GET_CONNECTION_HISTORY':
        // Get the connection history from the background script
        chrome.runtime.sendMessage({ type: 'GET_CONNECTION_HISTORY' }, (response) => {
          try {
            // Check for runtime errors
            if (chrome.runtime.lastError) {
              console.error('Error getting connection history:', chrome.runtime.lastError.message);
              // Send an error response back to the page
              window.postMessage({
                type: 'FROM_EXTENSION',
                action: 'CONNECTION_HISTORY_RESPONSE',
                error: chrome.runtime.lastError.message,
                success: false
              }, '*');
              return;
            }
            
            // Send the response back to the page
            window.postMessage({
              type: 'FROM_EXTENSION',
              action: 'CONNECTION_HISTORY_RESPONSE',
              data: response,
              success: true
            }, '*');
          } catch (error) {
            console.error('Error sending CONNECTION_HISTORY_RESPONSE:', error);
            // Try to send an error response
            try {
              window.postMessage({
                type: 'FROM_EXTENSION',
                action: 'CONNECTION_HISTORY_RESPONSE',
                error: error.message,
                success: false
              }, '*');
            } catch (innerError) {
              console.error('Failed to send error response:', innerError);
            }
          }
        });
        break;

      case 'CONNECT_WALLET':
        // Get the wallet address from the dashboard
        if (event.data.walletAddress && event.data.walletAddress.startsWith('0x')) {
          // Store the message ID if provided
          const messageId = event.data.messageId;
          
          // Send the wallet address to the background script
          try {
            chrome.runtime.sendMessage({ 
              type: 'SET_WALLET_ADDRESS', 
              walletAddress: event.data.walletAddress 
            }, () => {
              try {
                // Check for runtime errors
                if (chrome.runtime.lastError) {
                  console.error('Error in SET_WALLET_ADDRESS response:', chrome.runtime.lastError.message);
                  // Send an error response back to the page
                  window.postMessage({
                    type: 'FROM_EXTENSION',
                    action: 'CONNECT_WALLET_RESPONSE',
                    success: false,
                    error: chrome.runtime.lastError.message,
                    messageId: messageId // Include the message ID in the response
                  }, '*');
                  return;
                }
                
                // Send a success response back to the page
                window.postMessage({
                  type: 'FROM_EXTENSION',
                  action: 'CONNECT_WALLET_RESPONSE',
                  success: true,
                  messageId: messageId // Include the message ID in the response
                }, '*');
              } catch (error) {
                console.error('Error sending CONNECT_WALLET_RESPONSE:', error);
                // Try to send an error response
                try {
                  window.postMessage({
                    type: 'FROM_EXTENSION',
                    action: 'CONNECT_WALLET_RESPONSE',
                    success: false,
                    error: error.message,
                    messageId: messageId // Include the message ID in the response
                  }, '*');
                } catch (innerError) {
                  console.error('Failed to send error response:', innerError);
                }
              }
            });
          } catch (error) {
            console.error('Error sending SET_WALLET_ADDRESS message:', error);
            // Try to send an error response
            try {
              window.postMessage({
                type: 'FROM_EXTENSION',
                action: 'CONNECT_WALLET_RESPONSE',
                success: false,
                error: error.message,
                messageId: messageId // Include the message ID in the response
              }, '*');
            } catch (innerError) {
              console.error('Failed to send error response:', innerError);
            }
          }
        }
        break;
    }
  }
});

// Log that the content script has loaded
console.log('TOPAY Node Extension: Content script loaded');