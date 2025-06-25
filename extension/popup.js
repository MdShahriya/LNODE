// popup.js - UI controller for the TOPAY Node Dashboard extension popup

// DOM elements
const notConnectedDiv = document.getElementById('not-connected');
const connectedDiv = document.getElementById('connected');
const connectButton = document.getElementById('connect-wallet');
const disconnectButton = document.getElementById('disconnect-wallet');
const walletAddressElement = document.getElementById('wallet-address');
const startButton = document.getElementById('toggle-node');
const nodeStatusIndicator = document.getElementById('node-status');
const dashboardButton = document.getElementById('go-to-dashboard');

// State variables
let walletAddress = null;
let isNodeRunning = false;

// Initialize the popup
function init() {
  // Load state from storage
  chrome.storage.local.get(['walletAddress', 'isNodeRunning'], (result) => {
    walletAddress = result.walletAddress || null;
    isNodeRunning = result.isNodeRunning || false;
    
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
    } else if (message.type === 'STATE_UPDATED') {
      // Update local state from background script
      if (message.state) {
        walletAddress = message.state.walletAddress;
        isNodeRunning = message.state.isNodeRunning;
        
        // Update the UI
        updateUI();
      }
    }
    return true;
  });
}

function connectWallet() {
  // Open the dashboard in a new tab to get the wallet address
  chrome.tabs.create({ url: `https://node.topayfoundation.com/dashboard` });
  
  // The dashboard will send the wallet address back to the extension
  // This will be handled by the content script and message listeners
}

function disconnectWallet() {
  // Store the current wallet address before clearing it
  const currentWalletAddress = walletAddress;
  
  // Clear the wallet address locally
  walletAddress = null;
  
  // If the node is running, stop it first and ensure server is updated
  if (isNodeRunning) {
    isNodeRunning = false;
    chrome.storage.local.set({ isNodeRunning });
    
    // Send a message to the background script to toggle the node
    // This will update the server about node status change
    try {
      chrome.runtime.sendMessage({ type: 'TOGGLE_NODE' }, () => {
        // Handle potential error with callback
        if (chrome.runtime.lastError) {
          console.log('Error toggling node:', chrome.runtime.lastError.message);
        }
        
        // After node is stopped, then disconnect the wallet
        disconnectWalletAfterNodeStopped(currentWalletAddress);
      });
    } catch (error) {
      console.error('Error sending TOGGLE_NODE message:', error);
      // Still try to disconnect wallet even if there was an error stopping the node
      disconnectWalletAfterNodeStopped(currentWalletAddress);
    }
  } else {
    // If node is not running, disconnect wallet immediately
    disconnectWalletAfterNodeStopped(currentWalletAddress);
  }
}

// Helper function to disconnect wallet after node is stopped
function disconnectWalletAfterNodeStopped() {
  // Save the wallet address to storage
  chrome.storage.local.set({ walletAddress: null });
  
  // Notify the dashboard of the disconnection
  notifyDashboard('WALLET_DISCONNECTED');
  
  // Update the UI
  updateUI();
  
  // Send a message to the background script to set the wallet address to null
  // This will trigger the notifyServerAboutWalletDisconnection function in background.js
  try {
    chrome.runtime.sendMessage({ 
      type: 'SET_WALLET_ADDRESS', 
      walletAddress: null 
    }, () => {
      // Handle potential error with callback
      if (chrome.runtime.lastError) {
        console.log('Error setting wallet address to null:', chrome.runtime.lastError.message);
      }
    });
  } catch (error) {
    console.error('Error sending SET_WALLET_ADDRESS message:', error);
  }
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
  chrome.tabs.create({ url: `https://node.topayfoundation.com/dashboard?wallet=${walletAddress}` });
}

function notifyDashboard(event, data = {}) {
  // Send a message to the content script to notify the dashboard of an event
  try {
    chrome.tabs.query({ url: ["https://node.topayfoundation.com/*"] }, (tabs) => {
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
                  isNodeRunning
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
  const statusTextElement = document.getElementById('status-text');
  
  if (isNodeRunning) {
    // Show running UI
    startButton.classList.remove('start-button');
    startButton.classList.add('stop-button');
    nodeStatusIndicator.classList.remove('status-stopped');
    nodeStatusIndicator.classList.add('status-running');
    // Update button aria-label
    startButton.setAttribute('aria-label', 'Stop Node');
    // Update status description
    if (statusTextElement) {
      statusTextElement.textContent = 'Node is running';
      statusTextElement.style.color = '#10b981';
    }
    // Update SVG to power-off icon with enhanced styling
    startButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
      <div class="button-glow"></div>
    `;
    
    // Node is running
  } else {
    // Show stopped UI
    startButton.classList.remove('stop-button');
    startButton.classList.add('start-button');
    nodeStatusIndicator.classList.remove('status-running');
    nodeStatusIndicator.classList.add('status-stopped');
    // Update button aria-label
    startButton.setAttribute('aria-label', 'Start Node');
    // Update status description
    if (statusTextElement) {
      statusTextElement.textContent = 'Click to start your node';
      statusTextElement.style.color = '#94a3b8';
    }
    // Update SVG to power-on icon with enhanced styling
    startButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
        <line x1="12" y1="2" x2="12" y2="12"></line>
      </svg>
      <div class="button-glow"></div>
    `;
    
    // Node is stopped
  }
  
  // Node status updated
}

// Node status functions removed

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'STATE_UPDATED') {
      // Update local state
      if (message.walletAddress !== undefined) walletAddress = message.walletAddress;
      if (message.isNodeRunning !== undefined) isNodeRunning = message.isNodeRunning;
      
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
    chrome.storage.local.set({ walletAddress }, () => {
      // Send a message to the background script to fetch the balance
      chrome.runtime.sendMessage({
        action: 'CONNECT_WALLET',
        walletAddress: address
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error connecting wallet:', chrome.runtime.lastError);
        } else if (response && response.success) {
          console.log('Wallet connected successfully');
        }
      });
      
      // Notify the dashboard of the connection
      notifyDashboard('WALLET_CONNECTED', { walletAddress });
      
      // Update the UI
      updateUI();
    });
    
    return true;
  }
  return false;
}