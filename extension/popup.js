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
let pointsRate = 0;

// Constants
const POINTS_PER_SECOND = 0.2;

// Variables for points animation
let displayedPoints = 0;
let pointsAnimationInterval = null;

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
    
    // Start points animation if not already running
    startPointsAnimation();
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
    
    // Stop points animation and update to exact value
    stopPointsAnimation();
    totalRewardsElement.textContent = totalPoints.toFixed(2) + ' pt';
  }
  
  // Update rewards rate display
  rewardRateElement.textContent = isNodeRunning ? pointsRate.toFixed(2) + ' pt/s' : '0.200 pt/s';
  
  // If not animating, update the total rewards display directly
  if (!pointsAnimationInterval) {
    displayedPoints = totalPoints;
    totalRewardsElement.textContent = displayedPoints.toFixed(2) + ' pt';
  }
}

// Function to start the points animation
function startPointsAnimation() {
  // Clear any existing animation interval
  stopPointsAnimation();
  
  // Set the initial displayed points if needed
  if (displayedPoints === 0 && totalPoints > 0) {
    displayedPoints = totalPoints;
  }
  
  // Track the last increment time
  let lastIncrementTime = Date.now();
  
  // Start a new interval to animate the points
  pointsAnimationInterval = setInterval(() => {
    // If the node is running, increment the displayed points
    if (isNodeRunning) {
      const currentTime = Date.now();
      const elapsedSeconds = (currentTime - lastIncrementTime) / 1000;
      
      // Only increment when a full second has passed
      if (elapsedSeconds >= 1) {
        // Increment by exactly POINTS_PER_SECOND (0.2)
        displayedPoints += POINTS_PER_SECOND;
        lastIncrementTime = currentTime;
        
        // Ensure displayed points don't exceed actual points by too much
        if (displayedPoints > totalPoints + 0.5) {
          displayedPoints = totalPoints;
        }
        
        // Update the display with exact increments (0.2, 0.4, 0.6, etc.)
        totalRewardsElement.textContent = displayedPoints.toFixed(2) + ' pt';
        totalRewardsElement.classList.add('points-animating');
      }
    } else {
      // If node is stopped, stop the animation
      stopPointsAnimation();
    }
  }, 100); // Check every 100ms but only increment at 1-second intervals
}

// Function to stop the points animation
function stopPointsAnimation() {
  if (pointsAnimationInterval) {
    clearInterval(pointsAnimationInterval);
    pointsAnimationInterval = null;
    totalRewardsElement.classList.remove('points-animating');
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'STATE_UPDATED') {
      // Update local state
      if (message.walletAddress !== undefined) walletAddress = message.walletAddress;
      if (message.isNodeRunning !== undefined) isNodeRunning = message.isNodeRunning;
      if (message.totalPoints !== undefined) totalPoints = message.totalPoints;
      if (message.pointsRate !== undefined) pointsRate = message.pointsRate || POINTS_PER_SECOND;
      
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