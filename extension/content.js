// Content script for dashboard communication

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getWalletAddress') {
    // Get wallet address from localStorage
    const walletAddress = localStorage.getItem('walletAddress');
    sendResponse({ walletAddress });
  } else if (request.action === 'setWalletAddress') {
    // Set wallet address in localStorage
    localStorage.setItem('walletAddress', request.walletAddress);
    sendResponse({ success: true });
  }
});

// Monitor wallet connection changes
let lastWalletAddress = localStorage.getItem('walletAddress');

// Check for wallet address changes periodically
setInterval(() => {
  const currentWalletAddress = localStorage.getItem('walletAddress');
  
  if (currentWalletAddress !== lastWalletAddress) {
    lastWalletAddress = currentWalletAddress;
    
    // Notify background script of wallet change
    chrome.runtime.sendMessage({
      type: 'walletChanged',
      walletAddress: currentWalletAddress
    }).catch(() => {
      // Ignore errors when extension context is invalid
    });
  }
}, 1000); // Check every second

// Listen for storage events (when wallet is connected/disconnected)
window.addEventListener('storage', (event) => {
  if (event.key === 'walletAddress') {
    chrome.runtime.sendMessage({
      type: 'walletChanged',
      walletAddress: event.newValue
    }).catch(() => {
      // Ignore errors when extension context is invalid
    });
  }
});

// Notify background script that content script is ready
chrome.runtime.sendMessage({
  type: 'contentScriptReady',
  url: window.location.href
}).catch(() => {
  // Ignore errors when extension context is invalid
});