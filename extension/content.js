// Content script for TOPAY Node Extension

// Listen for messages from the dashboard website
document.addEventListener('message', function(event) {
  // Verify the origin to ensure it's from our trusted domain
  if (event.origin !== 'http://localhost:3000' && 
      event.origin !== 'https://node.topayfoundation.com') {
    return;
  }
  
  try {
    const data = event.data;
    
    // Handle different message types from the website
    if (data.type === 'getNodeStatus') {
      // Get node status from extension storage
      chrome.storage.local.get(['nodeStatus', 'walletAddress', 'deviceIp'], function(result) {
        // Send response back to the website
        window.postMessage({
          type: 'nodeStatusResponse',
          nodeStatus: result.nodeStatus || 'stopped',
          walletAddress: result.walletAddress || '',
          deviceIp: result.deviceIp || ''
        }, event.origin);
      });
    }
    
    // Handle request to toggle node status
    if (data.type === 'toggleNode') {
      chrome.storage.local.get(['nodeStatus', 'walletAddress'], function(result) {
        const currentStatus = result.nodeStatus || 'stopped';
        const newStatus = currentStatus === 'running' ? 'stopped' : 'running';
        
        // Send message to background script
        chrome.runtime.sendMessage({
          action: 'nodeStatusChanged',
          status: newStatus,
          walletAddress: result.walletAddress || ''
        });
        
        // Send response back to the website
        window.postMessage({
          type: 'nodeToggleResponse',
          success: true,
          nodeStatus: newStatus
        }, event.origin);
      });
    }
    
    // Handle request for connection history
    if (data.type === 'getConnectionHistory') {
      chrome.storage.local.get(['connectionHistory'], function(result) {
        window.postMessage({
          type: 'connectionHistoryResponse',
          history: result.connectionHistory || []
        }, event.origin);
      });
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

// Inject a script to allow the website to detect the extension
function injectDetectionScript() {
  const script = document.createElement('script');
  script.textContent = `
    window.topayNodeExtensionDetected = true;
    
    // Dispatch an event to notify the website that the extension is installed
    document.dispatchEvent(new CustomEvent('topayNodeExtensionInstalled'));
    
    // Create a communication interface for the website
    window.topayNodeExtension = {
      getNodeStatus: function() {
        return new Promise((resolve) => {
          const messageId = Date.now().toString();
          
          // Create a listener for the response
          const listener = function(event) {
            if (event.data && event.data.type === 'nodeStatusResponse') {
              document.removeEventListener('message', listener);
              resolve(event.data);
            }
          };
          
          document.addEventListener('message', listener);
          
          // Send the request
          window.postMessage({
            type: 'getNodeStatus',
            messageId: messageId
          }, '*');
        });
      },
      
      toggleNode: function() {
        return new Promise((resolve) => {
          const messageId = Date.now().toString();
          
          // Create a listener for the response
          const listener = function(event) {
            if (event.data && event.data.type === 'nodeToggleResponse') {
              document.removeEventListener('message', listener);
              resolve(event.data);
            }
          };
          
          document.addEventListener('message', listener);
          
          // Send the request
          window.postMessage({
            type: 'toggleNode',
            messageId: messageId
          }, '*');
        });
      },
      
      getConnectionHistory: function() {
        return new Promise((resolve) => {
          const messageId = Date.now().toString();
          
          // Create a listener for the response
          const listener = function(event) {
            if (event.data && event.data.type === 'connectionHistoryResponse') {
              document.removeEventListener('message', listener);
              resolve(event.data.history);
            }
          };
          
          document.addEventListener('message', listener);
          
          // Send the request
          window.postMessage({
            type: 'getConnectionHistory',
            messageId: messageId
          }, '*');
        });
      }
    };
  `;
  
  // Append the script to the document
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

// Run the injection when the content script loads
injectDetectionScript();

// Notify the background script that the content script is active on this page
chrome.runtime.sendMessage({
  action: 'contentScriptActive',
  url: window.location.href
});

// Listen for messages from the extension's background script
chrome.runtime.onMessage.addListener(function(message) {
  // Handle messages from the background script if needed
  if (message.action === 'updateNodeStatus') {
    // Forward the status update to the webpage
    window.postMessage({
      type: 'nodeStatusUpdate',
      status: message.status
    }, '*');
  }
  
  // Return true to indicate async response
  return true;
});