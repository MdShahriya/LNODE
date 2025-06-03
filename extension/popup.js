// popup.js - UI controller for the TOPAY Node Dashboard extension popup

// DOM elements
const notConnectedDiv = document.getElementById('not-connected');
const connectedDiv = document.getElementById('connected');
const connectButton = document.getElementById('connect-wallet');
const disconnectButton = document.getElementById('disconnect-wallet');
const walletAddressElement = document.getElementById('wallet-address');
const startButton = document.getElementById('toggle-node');
const nodeStatusIndicator = document.getElementById('node-status');
const totalRewardsElement = document.querySelector('.reward-item:first-child .reward-value');
const rewardRateElement = document.querySelector('.reward-item:last-child .reward-value');
const dashboardButton = document.getElementById('go-to-dashboard');

// State variables
let walletAddress = null;
let isNodeRunning = false;
let totalPoints = 0;

// Initialize the popup
function init() {
  // Load state from storage
  chrome.storage.local.get(['walletAddress', 'isNodeRunning', 'totalPoints'], (result) => {
    walletAddress = result.walletAddress || null;
    isNodeRunning = result.isNodeRunning || false;
    totalPoints = result.totalPoints || 0;
    
    // Update the UI
    updateUI();
  });
  
  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.walletAddress) {
      walletAddress = changes.walletAddress.newValue;
    }
    if (changes.isNodeRunning) {
      isNodeRunning = changes.isNodeRunning.newValue;
    }
    if (changes.totalPoints) {
      totalPoints = changes.totalPoints.newValue;
    }
    
    // Update the UI
    updateUI();
  });
  
  // Set up event listeners
  connectButton.addEventListener('click', connectWallet);
  disconnectButton.addEventListener('click', disconnectWallet);
  startButton.addEventListener('click', toggleNode);
  dashboardButton.addEventListener('click', goToDashboard);
  // Remove sync button event listener as we're using automatic sync only
  
  // Request current state from background script
  try {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
      // Handle potential error with callback
      if (chrome.runtime.lastError) {
        console.log('Error getting state:', chrome.runtime.lastError.message);
        return; // Exit early if there's an error
      }
      
      if (response) {
        walletAddress = response.walletAddress;
        isNodeRunning = response.isNodeRunning;
        totalPoints = response.totalPoints;
        pointsRate = response.pointsRate || 0;
        updateUI();
      }
    });
  } catch (error) {
    console.error('Error sending GET_STATE message:', error);
  }
  
  // Listen for wallet address updates from background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'WALLET_ADDRESS_UPDATED') {
      setWalletAddressFromDashboard(message.walletAddress);
    }
    return true;
  });
}

function connectWallet() {
  // Open the dashboard in a new tab to get the wallet address
  chrome.tabs.create({ url: `http://localhost:3000/dashboard` });
  
  // The dashboard will send the wallet address back to the extension
  // This will be handled by the content script and message listeners
}

function disconnectWallet() {
  // Clear the wallet address
  walletAddress = null;
  
  // If the node is running, stop it
  if (isNodeRunning) {
    isNodeRunning = false;
    chrome.storage.local.set({ isNodeRunning });
    
    // Send a message to the background script to toggle the node
    try {
      chrome.runtime.sendMessage({ type: 'TOGGLE_NODE' }, () => {
        // Handle potential error with callback
        if (chrome.runtime.lastError) {
          console.log('Error toggling node:', chrome.runtime.lastError.message);
          // Continue execution despite error
        }
        // No response processing needed but callback required to prevent errors
      });
    } catch (error) {
      console.error('Error sending TOGGLE_NODE message:', error);
    }
  }
  
  // Save the wallet address to storage
  chrome.storage.local.set({ walletAddress });
  
  // Notify the dashboard of the disconnection
  notifyDashboard('WALLET_DISCONNECTED');
  
  // Update the UI
  updateUI();
}

function toggleNode() {
  // Send a message to the background script to toggle the node
  try {
    chrome.runtime.sendMessage({ type: 'TOGGLE_NODE' }, (response) => {
      // Handle potential error with callback
      if (chrome.runtime.lastError) {
        console.log('Error toggling node:', chrome.runtime.lastError.message);
        return; // Exit early if there's an error
      }
      
      if (response && response.success) {
        isNodeRunning = response.isNodeRunning;
        
        // Notify the dashboard of the node status change
        notifyDashboard(isNodeRunning ? 'NODE_STARTED' : 'NODE_STOPPED');
        
        // Update the UI
        updateUI();
      }
    });
  } catch (error) {
    console.error('Error sending TOGGLE_NODE message:', error);
  }
}

function goToDashboard() {
  // Open the dashboard in a new tab with the wallet address as a parameter
  chrome.tabs.create({ url: `http://localhost:3000/dashboard?wallet=${walletAddress}` });
}

function notifyDashboard(event, data = {}) {
  // Send a message to the content script to notify the dashboard of an event
  try {
    chrome.tabs.query({ url: ["http://localhost:3000/*"] }, (tabs) => {
      if (tabs && tabs.length > 0) {
        // Add a small delay to ensure content scripts are fully loaded
        setTimeout(() => {
          tabs.forEach((tab) => {
            try {
              chrome.tabs.sendMessage(tab.id, {
                type: 'EXTENSION_EVENT',
                event,
                data: {
                  ...data,
                  walletAddress,
                  isNodeRunning,
                  totalPoints
                }
              }, () => {
                // Handle potential error with callback
                if (chrome.runtime.lastError) {
                  console.log('Could not send message to tab:', chrome.runtime.lastError.message);
                  // Continue execution despite error
                }
                // No response processing needed but callback required to prevent errors
              });
            } catch (error) {
              console.error('Error sending message to tab:', error);
            }
          });
        }, 500); // 500ms delay to ensure content scripts are loaded
      } else {
        console.log('No dashboard tabs found to notify');
      }
    });
  } catch (error) {
    console.error('Error notifying dashboard:', error);
  }
}

// Update the UI based on the current state
function updateUI() {
  // Update wallet connection status
  if (walletAddress) {
    // Show connected UI
    notConnectedDiv.classList.add('hidden');
    connectedDiv.classList.remove('hidden');
    
    // Update wallet address display (truncate for readability)
    const truncatedAddress = walletAddress.substring(0, 6) + '...' + walletAddress.substring(walletAddress.length - 4);
    walletAddressElement.textContent = truncatedAddress;
  } else {
    // Show disconnected UI
    notConnectedDiv.classList.remove('hidden');
    connectedDiv.classList.add('hidden');
    walletAddressElement.textContent = 'Not connected';
  }
  
  // Update node status
  if (isNodeRunning) {
    // Show running UI
    startButton.classList.remove('start-button');
    startButton.classList.add('stop-button');
    nodeStatusIndicator.classList.remove('status-stopped');
    nodeStatusIndicator.classList.add('status-running');
    // Update button aria-label
    startButton.setAttribute('aria-label', 'Stop Node');
    // Update SVG to power-off icon
    startButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
    `;
  } else {
    // Show stopped UI
    startButton.classList.remove('stop-button');
    startButton.classList.add('start-button');
    nodeStatusIndicator.classList.remove('status-running');
    nodeStatusIndicator.classList.add('status-stopped');
    // Update button aria-label
    startButton.setAttribute('aria-label', 'Start Node');
    // Update SVG to power-on icon
    startButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
        <line x1="12" y1="2" x2="12" y2="12"></line>
      </svg>
    `;
  }
  
  // Update rewards display
  totalRewardsElement.textContent = totalPoints.toFixed(2) + ' pt';
  rewardRateElement.textContent = isNodeRunning ? '0.2 pt/s' : '0.000 pt/s';
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'STATE_UPDATED') {
      // Update local state
      if (message.walletAddress !== undefined) walletAddress = message.walletAddress;
      if (message.isNodeRunning !== undefined) isNodeRunning = message.isNodeRunning;
      if (message.totalPoints !== undefined) totalPoints = message.totalPoints;
      
      // Update the UI
      updateUI();
    } else if (message.type === 'WALLET_ADDRESS_UPDATED') {
      // Handle wallet address update
      setWalletAddressFromDashboard(message.walletAddress);
    }
    
    // Send a response to prevent "Receiving end does not exist" errors
    if (sendResponse) {
      sendResponse({ success: true });
    }
  } catch (error) {
    console.error('Error handling message in popup:', error);
    // Still try to send a response even if there was an error
    if (sendResponse) {
      sendResponse({ success: false, error: error.message });
    }
  }
  
  // Always return true to indicate async response
  return true;
});

// Initialize the popup when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Add a function to handle wallet address from dashboard
function setWalletAddressFromDashboard(address) {
  if (address && address.startsWith('0x')) {
    walletAddress = address;
    
    // Save the wallet address to storage
    chrome.storage.local.set({ walletAddress });
    
    // Notify the dashboard of the connection
    notifyDashboard('WALLET_CONNECTED', { walletAddress });
    
    // Update the UI
    updateUI();
    
    return true;
  }
  return false;
}