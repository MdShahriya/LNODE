// background.js - Service worker for the TOPAY Node Dashboard extension

// Initialize state
let isNodeRunning = false;
let walletAddress = null;
let totalPoints = 0;
let deviceIP = null;
let connectionHistory = [];
// Removed unused global variable and moved it to where it's needed
const POINTS_PER_SECOND = 0.001;

// Load state from storage on startup
chrome.storage.local.get(['isNodeRunning', 'walletAddress', 'totalPoints', 'deviceIP', 'connectionHistory'], (result) => {
  isNodeRunning = result.isNodeRunning || false;
  walletAddress = result.walletAddress || null;
  totalPoints = result.totalPoints || 0;
  deviceIP = result.deviceIP || null;
  connectionHistory = result.connectionHistory || [];
  
  // If the node was running when the extension was closed, update the points
  if (isNodeRunning && walletAddress) {
    const now = Date.now();
    const lastUpdate = result.lastPointsUpdate || now;
    const elapsedSeconds = (now - lastUpdate) / 1000;
    
    // Add points for the time the extension was closed
    if (elapsedSeconds > 0) {
      totalPoints += elapsedSeconds * POINTS_PER_SECOND;
      chrome.storage.local.set({ totalPoints, lastPointsUpdate: now });
    }
  }
  
  // Start the points accumulation interval if the node is running
  if (isNodeRunning) {
    startPointsAccumulation();
  }
  
  // Fetch the device IP if we don't have it yet
  if (!deviceIP) {
    fetchDeviceIP();
  }
});

// Listen for messages from the popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'TOGGLE_NODE':
      toggleNode(sendResponse);
      return true; // Keep the message channel open for the async response
      
    case 'GET_STATE':
      sendResponse({
        isNodeRunning,
        walletAddress,
        totalPoints,
        deviceIP
      });
      break;
      
    case 'GET_CONNECTION_HISTORY':
      sendResponse(connectionHistory);
      break;
  }
});

// Set up alarms for periodic tasks
chrome.alarms.create('updatePoints', { periodInMinutes: 1 });
chrome.alarms.create('refreshIP', { periodInMinutes: 60 });

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updatePoints') {
    // Save the current points to storage
    chrome.storage.local.set({ totalPoints, lastPointsUpdate: Date.now() });
  } else if (alarm.name === 'refreshIP') {
    // Refresh the device IP
    fetchDeviceIP();
  }
});

// Function to toggle the node state
function toggleNode(sendResponse) {
  isNodeRunning = !isNodeRunning;
  
  // Save the state to storage
  chrome.storage.local.set({ isNodeRunning });
  
  // If the node is now running, start accumulating points
  if (isNodeRunning) {
    startPointsAccumulation();
    
    // Add a connection record to the history
    addConnectionRecord('CONNECTED');
  } else {
    // Stop accumulating points
    stopPointsAccumulation();
    
    // Add a disconnection record to the history
    addConnectionRecord('DISCONNECTED');
  }
  
  // Send the response back to the popup
  if (sendResponse) {
    sendResponse({ success: true, isNodeRunning });
  }
}

// Function to start accumulating points
let pointsInterval = null;
function startPointsAccumulation() {
  // Clear unknown existing interval
  if (pointsInterval) {
    clearInterval(pointsInterval);
  }
  
  // Start a new interval to accumulate points
  pointsInterval = setInterval(() => {
    if (isNodeRunning && walletAddress) {
      totalPoints += POINTS_PER_SECOND;
    }
  }, 1000);
}

// Function to stop accumulating points
function stopPointsAccumulation() {
  if (pointsInterval) {
    clearInterval(pointsInterval);
    pointsInterval = null;
  }
}

// Function to fetch the device's public IP address
function fetchDeviceIP() {
  fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(data => {
      deviceIP = data.ip;
      chrome.storage.local.set({ deviceIP });
    })
    .catch(error => {
      console.error('Error fetching IP:', error);
    });
}

// Function to add a connection record to the history
function addConnectionRecord(action) {
  const record = {
    timestamp: Date.now(),
    action,
    walletAddress,
    deviceIP
  };
  
  // Add the record to the beginning of the array
  connectionHistory.unshift(record);
  
  // Limit the history to 100 records
  if (connectionHistory.length > 100) {
    connectionHistory = connectionHistory.slice(0, 100);
  }
  
  // Save the updated history to storage
  chrome.storage.local.set({ connectionHistory });
}

// Listen for changes to the wallet address in storage
chrome.storage.onChanged.addListener((changes) => {
  if (changes.walletAddress) {
    walletAddress = changes.walletAddress.newValue;
    
    // If the wallet was connected, add a record to the history
    if (walletAddress) {
      addConnectionRecord('WALLET_CONNECTED');
    } else {
      addConnectionRecord('WALLET_DISCONNECTED');
    }
  }
});