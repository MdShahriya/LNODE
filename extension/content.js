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
          // Send the response back to the page
          window.postMessage({
            type: 'FROM_EXTENSION',
            action: 'SYNC_RESPONSE',
            data: response
          }, '*');
        });
        break;
        
      case 'TOGGLE_NODE':
        // Send a message to the background script to toggle the node
        chrome.runtime.sendMessage({ type: 'TOGGLE_NODE' }, (response) => {
          // Send the response back to the page
          window.postMessage({
            type: 'FROM_EXTENSION',
            action: 'TOGGLE_NODE_RESPONSE',
            data: response
          }, '*');
        });
        break;
        
      case 'GET_CONNECTION_HISTORY':
        // Get the connection history from the background script
        chrome.runtime.sendMessage({ type: 'GET_CONNECTION_HISTORY' }, (response) => {
          // Send the response back to the page
          window.postMessage({
            type: 'FROM_EXTENSION',
            action: 'CONNECTION_HISTORY_RESPONSE',
            data: response
          }, '*');
        });
        break;
    }
  }
});

// Log that the content script has loaded
console.log('TOPAY Node Extension: Content script loaded');