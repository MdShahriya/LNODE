// Background script for TOPAY Node Extension

// Initialize state
let nodeStatus = 'stopped';
let deviceIp = '';
let walletAddress = '';
let connectionHistory = [];
let ipCheckInterval = null;
let pointsUpdateInterval = null;

// Constants
const IP_CHECK_INTERVAL_MINUTES = 5; // Check IP every 5 minutes
const POINTS_UPDATE_INTERVAL_SECONDS = 60; // Update points every 60 seconds
const API_BASE_URL = 'https://node.topayfoundation.com/api';

// Check for stored data on startup
chrome.storage.local.get(['nodeStatus', 'deviceIp', 'walletAddress', 'connectionHistory'], function(result) {
  if (result.nodeStatus) nodeStatus = result.nodeStatus;
  if (result.deviceIp) deviceIp = result.deviceIp;
  if (result.walletAddress) walletAddress = result.walletAddress;
  if (result.connectionHistory) connectionHistory = result.connectionHistory;
  
  // If node was running before browser closed, restart the services
  if (nodeStatus === 'running' && walletAddress) {
    startPeriodicIpCheck();
    startPeriodicPointsUpdate();
  }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener(function(message) {
  console.log('Background received message:', message);
  
  // Handle wallet connection
  if (message.action === 'walletConnected') {
    walletAddress = message.walletAddress;
    deviceIp = message.deviceIp || deviceIp;
    
    // Record connection event
    const connectionEvent = {
      timestamp: new Date().toISOString(),
      walletAddress: walletAddress,
      deviceIp: deviceIp,
      event: 'wallet_connected'
    };
    
    connectionHistory.push(connectionEvent);
    chrome.storage.local.set({ connectionHistory: connectionHistory });
    
    // Send data to server
    sendDataToServer({
      type: 'wallet_connected',
      walletAddress: walletAddress,
      deviceIp: deviceIp,
      timestamp: new Date().toISOString()
    });
  }
  
  // Handle wallet disconnection
  if (message.action === 'walletDisconnected') {
    // Record disconnection event
    const disconnectionEvent = {
      timestamp: new Date().toISOString(),
      walletAddress: walletAddress, // Use the current wallet address before clearing it
      deviceIp: deviceIp,
      event: 'wallet_disconnected'
    };
    
    connectionHistory.push(disconnectionEvent);
    chrome.storage.local.set({ connectionHistory: connectionHistory });
    
    // Send data to server
    sendDataToServer({
      type: 'wallet_disconnected',
      walletAddress: walletAddress,
      deviceIp: deviceIp,
      timestamp: new Date().toISOString()
    });
    
    // Stop any periodic services
    stopPeriodicIpCheck();
    stopPeriodicPointsUpdate();
    
    // Clear wallet address
    walletAddress = '';
    nodeStatus = 'stopped';
  }
  
  // Handle node status change
  if (message.action === 'nodeStatusChanged') {
    nodeStatus = message.status;
    walletAddress = message.walletAddress || walletAddress;
    deviceIp = message.deviceIp || deviceIp;
    
    // Record status change event
    const statusEvent = {
      timestamp: new Date().toISOString(),
      walletAddress: walletAddress,
      deviceIp: deviceIp,
      event: 'node_status_changed',
      status: nodeStatus
    };
    
    connectionHistory.push(statusEvent);
    chrome.storage.local.set({ connectionHistory: connectionHistory });
    
    // Send data to server
    sendDataToServer({
      type: 'node_status',
      walletAddress: walletAddress,
      deviceIp: deviceIp,
      isRunning: nodeStatus === 'running',
      timestamp: new Date().toISOString()
    });
    
    // Start or stop periodic services based on node status
    if (nodeStatus === 'running') {
      startPeriodicIpCheck();
      startPeriodicPointsUpdate();
    } else {
      stopPeriodicIpCheck();
      stopPeriodicPointsUpdate();
    }
  }
});

function startPeriodicIpCheck() {
  // Clear any existing interval
  if (ipCheckInterval) {
    clearInterval(ipCheckInterval);
  }
  
  // Check IP immediately
  checkDeviceIp();
  
  // Set up interval for periodic checks
  ipCheckInterval = setInterval(checkDeviceIp, IP_CHECK_INTERVAL_MINUTES * 60 * 1000);
}

function stopPeriodicIpCheck() {
  if (ipCheckInterval) {
    clearInterval(ipCheckInterval);
    ipCheckInterval = null;
  }
}

function startPeriodicPointsUpdate() {
  // Clear any existing interval
  if (pointsUpdateInterval) {
    clearInterval(pointsUpdateInterval);
  }
  
  // Update points immediately
  updatePoints();
  
  // Set up interval for periodic updates
  pointsUpdateInterval = setInterval(updatePoints, POINTS_UPDATE_INTERVAL_SECONDS * 1000);
}

function stopPeriodicPointsUpdate() {
  if (pointsUpdateInterval) {
    clearInterval(pointsUpdateInterval);
    pointsUpdateInterval = null;
  }
}

function updatePoints() {
  // Only update points if node is running and wallet is connected
  if (nodeStatus === 'running' && walletAddress) {
    console.log('Sending periodic points update for running node');
    
    // Send heartbeat to server to update points
    sendDataToServer({
      type: 'node_points_update',
      walletAddress: walletAddress,
      deviceIp: deviceIp,
      timestamp: new Date().toISOString()
    });
  }
}

function checkDeviceIp() {
  fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(data => {
      const newIp = data.ip;
      
      // If IP has changed, record the change
      if (deviceIp && newIp !== deviceIp) {
        const ipChangeEvent = {
          timestamp: new Date().toISOString(),
          walletAddress: walletAddress,
          oldIp: deviceIp,
          newIp: newIp,
          event: 'ip_changed'
        };
        
        connectionHistory.push(ipChangeEvent);
        chrome.storage.local.set({ connectionHistory: connectionHistory });
        
        // Send data to server (if needed)
        sendDataToServer({
          type: 'ip_change',
          walletAddress: walletAddress,
          oldIp: deviceIp,
          newIp: newIp,
          timestamp: new Date().toISOString()
        });
      }
      
      // Update stored IP
      deviceIp = newIp;
      chrome.storage.local.set({ deviceIp: deviceIp });
    })
    .catch(error => {
      console.error('Error checking device IP:', error);
    });
}

function sendDataToServer(data) {
  console.log('Sending data to server:', data);
  
  // Handle different types of data
  if (data.type === 'node_status') {
    // Send node status update to the API
    fetch(`${API_BASE_URL}/user/update-node-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: data.walletAddress,
        isRunning: data.isRunning,
        deviceIp: data.deviceIp
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      return response.json();
    })
    .then(result => {
      console.log('Server response for node status update:', result);
    })
    .catch(error => {
      console.error('Error sending node status to server:', error);
    });
  } 
  else if (data.type === 'wallet_connected') {
    // Create or update user in the database
    fetch(`${API_BASE_URL}/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: data.walletAddress,
        deviceIp: data.deviceIp
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      return response.json();
    })
    .then(result => {
      console.log('Server response for wallet connection:', result);
    })
    .catch(error => {
      console.error('Error sending wallet connection to server:', error);
    });
  }
  else if (data.type === 'wallet_disconnected') {
    // Notify server about wallet disconnection
    fetch(`${API_BASE_URL}/user/disconnect-wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: data.walletAddress,
        deviceIp: data.deviceIp
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      return response.json();
    })
    .then(result => {
      console.log('Server response for wallet disconnection:', result);
    })
    .catch(error => {
      console.error('Error sending wallet disconnection to server:', error);
    });
  }
  else if (data.type === 'node_points_update') {
    // Send heartbeat to update points for running node
    fetch(`${API_BASE_URL}/user/update-node-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: data.walletAddress,
        deviceIp: data.deviceIp
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      return response.json();
    })
    .then(result => {
      console.log('Server response for points update:', result);
      
      // Update local rewards display if available
      if (result.success && result.pointsAdded) {
        chrome.storage.local.get(['totalRewards', 'rewardsPerSecond'], function(result) {
          let totalRewards = result.totalRewards || 0;
          totalRewards += result.pointsAdded;
          chrome.storage.local.set({ totalRewards: totalRewards });
        });
      }
    })
    .catch(error => {
      console.error('Error sending points update to server:', error);
    });
  }
  // Additional data types can be handled here as needed
}

// When extension is installed, get the initial device IP
chrome.runtime.onInstalled.addListener(() => {
  checkDeviceIp();
});