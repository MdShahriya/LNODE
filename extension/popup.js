// popup.js - UI controller for the TOPAY Node Dashboard extension popup

// DOM elements
const notConnectedDiv = document.getElementById('not-connected');
const connectedDiv = document.getElementById('connected');
const connectButton = document.getElementById('connect-wallet');
const disconnectButton = document.getElementById('disconnect-wallet');
const walletAddressElement = document.getElementById('wallet-address');
const startButton = document.getElementById('toggle-node');
const nodeStatusIndicator = document.getElementById('node-status-indicator');
const totalRewardsElement = document.querySelector('.reward-item:first-child .reward-value');
const rewardRateElement = document.querySelector('.reward-item:last-child .reward-value');
const dashboardButton = document.getElementById('go-to-dashboard');

// State variables
let walletAddress = null;
let isNodeRunning = false;
let totalPoints = 0;
let pointsRate = 0;

// Initialize the popup
function init() {
  // Load state from storage
  chrome.storage.local.get(['walletAddress', 'isNodeRunning', 'totalPoints', 'pointsRate'], (result) => {
    walletAddress = result.walletAddress || null;
    isNodeRunning = result.isNodeRunning || false;
    totalPoints = result.totalPoints || 0;
    pointsRate = result.pointsRate || 0;
    
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
    if (changes.pointsRate) {
      pointsRate = changes.pointsRate.newValue;
    }
    
    // Update the UI
    updateUI();
  });
  
  // Set up event listeners
  connectButton.addEventListener('click', connectWallet);
  disconnectButton.addEventListener('click', disconnectWallet);
  startButton.addEventListener('click', toggleNode);
  dashboardButton.addEventListener('click', goToDashboard);
  
  // Request current state from background script
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    if (response) {
      walletAddress = response.walletAddress;
      isNodeRunning = response.isNodeRunning;
      totalPoints = response.totalPoints;
      pointsRate = response.pointsRate || 0;
      updateUI();
    }
  });
}

function connectWallet() {
  // For testing purposes, generate a random wallet address
  const randomWallet = '0x' + Math.random().toString(16).substr(2, 40);
  walletAddress = randomWallet;
  
  // Save the wallet address to storage
  chrome.storage.local.set({ walletAddress });
  
  // Notify the dashboard of the connection
  notifyDashboard('WALLET_CONNECTED', { walletAddress });
  
  // Update the UI
  updateUI();
}

function disconnectWallet() {
  // Clear the wallet address
  walletAddress = null;
  
  // If the node is running, stop it
  if (isNodeRunning) {
    isNodeRunning = false;
    chrome.storage.local.set({ isNodeRunning });
    
    // Send a message to the background script to toggle the node
    chrome.runtime.sendMessage({ type: 'TOGGLE_NODE' });
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
  chrome.runtime.sendMessage({ type: 'TOGGLE_NODE' }, (response) => {
    if (response && response.success) {
      isNodeRunning = response.isNodeRunning;
      
      // Notify the dashboard of the node status change
      notifyDashboard(isNodeRunning ? 'NODE_STARTED' : 'NODE_STOPPED');
      
      // Update the UI
      updateUI();
    }
  });
}

function goToDashboard() {
  // Open the dashboard in a new tab with the wallet address as a parameter
  chrome.tabs.create({ url: `https://node.topayfoundation.com/dashboard?wallet=${walletAddress}` });
}

function notifyDashboard(event, data = {}) {
  // Send a message to the content script to notify the dashboard of an event
  chrome.tabs.query({ url: ["http://localhost:3000/*", "https://node.topayfoundation.com/*"] }, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'EXTENSION_EVENT',
        event,
        data: {
          ...data,
          walletAddress,
          isNodeRunning,
          totalPoints
        }
      });
    });
  });
}

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
    startButton.classList.add('running');
    nodeStatusIndicator.classList.remove('status-stopped');
    nodeStatusIndicator.classList.add('status-running');
    startButton.querySelector('.button-text').textContent = 'Stop Node';
  } else {
    // Show stopped UI
    startButton.classList.remove('running');
    nodeStatusIndicator.classList.remove('status-running');
    nodeStatusIndicator.classList.add('status-stopped');
    startButton.querySelector('.button-text').textContent = 'Start Node';
  }
  
  // Update rewards display
  totalRewardsElement.textContent = totalPoints.toFixed(2) + ' pt';
  rewardRateElement.textContent = pointsRate.toFixed(3) + ' pt/s';
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'STATE_UPDATED') {
    // Update local state
    if (message.walletAddress !== undefined) walletAddress = message.walletAddress;
    if (message.isNodeRunning !== undefined) isNodeRunning = message.isNodeRunning;
    if (message.totalPoints !== undefined) totalPoints = message.totalPoints;
    if (message.pointsRate !== undefined) pointsRate = message.pointsRate;
    
    // Update the UI
    updateUI();
  }
  
  // Always return true to indicate async response
  return true;
});

// Initialize the popup when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);