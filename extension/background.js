// background.js - Service worker for the TOPAY Node Dashboard extension

// Initialize state
let isNodeRunning = false;
let walletAddress = null;
let totalPoints = 0;
let deviceIP = null;
let connectionHistory = [];
// Updated points rate to 0.2 points per second
const POINTS_PER_SECOND = 0.2;

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

// Listen for messages from the popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'GET_STATE') {
      // Send the current state to the popup
      sendResponse({
        walletAddress,
        isNodeRunning,
        totalPoints,
        pointsRate: isNodeRunning ? POINTS_PER_SECOND : 0
      });
    } else if (message.type === 'TOGGLE_NODE') {
      // Toggle the node state
      toggleNode(sendResponse);
      // Return true to indicate that we will send a response asynchronously
      return true;
    } else if (message.type === 'SET_WALLET_ADDRESS') {
      // Set the wallet address
      setWalletAddress(message.walletAddress, sendResponse);
      // Return true to indicate that we will send a response asynchronously
      return true;
    } else if (message.type === 'GET_CONNECTION_HISTORY') {
      // Get the connection history
      getConnectionHistory(sendResponse);
      // Return true to indicate that we will send a response asynchronously
      return true;
    } else if (message.type === 'CONNECT_WALLET') {
      // Connect the wallet
      connectWallet(message.walletAddress, sendResponse);
      // Return true to indicate that we will send a response asynchronously
      return true;
    }
  } catch (error) {
    console.error('Error handling message in background:', error);
    // Try to send a response even if there was an error
    try {
      if (sendResponse) {
        sendResponse({ success: false, error: error.message });
      }
    } catch (responseError) {
      console.error('Error sending response:', responseError);
    }
  }
  
  // Return true for messages that don't have a specific handler but might need async response
  return true;
});

// Set up alarms for periodic tasks
chrome.alarms.create('updatePoints', { periodInMinutes: 1 });
chrome.alarms.create('refreshIP', { periodInMinutes: 0.25 });
chrome.alarms.create('syncPointsWithServer', { periodInMinutes: 1 }); // New alarm for syncing points with server

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updatePoints') {
    // Save the current points to storage
    chrome.storage.local.set({ totalPoints, lastPointsUpdate: Date.now() });
  } else if (alarm.name === 'refreshIP') {
    // Refresh the device IP
    fetchDeviceIP();
  } else if (alarm.name === 'syncPointsWithServer') {
    // Sync points with the server if node is running
    if (isNodeRunning && walletAddress) {
      syncPointsWithServer();
    }
  }
});

// Function to sync points with the server
async function syncPointsWithServer() {
  try {
    // Only sync if we have a wallet address and the node is running
    if (!walletAddress || !isNodeRunning) {
      console.log('Cannot sync points: Node not running or wallet not connected');
      return;
    }
    
    // Prepare the request data
    const data = {
      walletAddress,
      deviceIp: deviceIP
    };
    
    // Determine the API URL based on the environment
    // First try to get the current tab URL to determine the base URL
    let apiBaseUrl = 'http://localhost:3000';
    
    try {
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      if (tabs && tabs.length > 0 && tabs[0].url) {
        const tabUrl = new URL(tabs[0].url);
        // If the tab is on a domain that matches our app, use that domain for API calls
        if (tabUrl.hostname.includes('topay') || tabUrl.hostname === 'localhost') {
          apiBaseUrl = `${tabUrl.protocol}//${tabUrl.host}`;
        }
      }
    } catch (error) {
      console.log('Error determining API URL from tabs, using default:', error);
    }
    
    // Add a custom header to identify this as an extension request
    const response = await fetch(`${apiBaseUrl}/api/user/update-node-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'extension'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      // Try to get more detailed error information from the response
      try {
        const errorData = await response.json();
        throw new Error(`Server responded with status: ${response.status}, message: ${errorData.message || errorData.error || 'Unknown error'}`);
      } catch (jsonError) {
        // If we can't parse the error response, just use the status code
        console.error('Error parsing error response:', jsonError);
        throw new Error(`Server responded with status: ${response.status}`);
      }
    }
    
    // Safely parse the response body
    let result;
    try {
      result = await response.json();
    } catch (jsonError) {
      console.error('Error parsing response JSON:', jsonError);
      throw new Error(`Failed to parse server response: ${jsonError.message}`);
    }
    
    if (result.success) {
      // Update local points with the server value
      totalPoints = result.user.points;
      
      // Save to storage
      chrome.storage.local.set({ 
        totalPoints,
        lastPointsUpdate: Date.now(),
        lastServerSync: Date.now()
      });
      
      console.log(`Points synced with server. New balance: ${totalPoints}`);
      
      // Notify all tabs about the updated points
      notifyTabsAboutStateUpdate();
    } else {
      console.error('Failed to sync points with server:', result.error);
    }
  } catch (error) {
    console.error('Error syncing points with server:', error);
  }
}

// Function to notify all tabs about state updates
function notifyTabsAboutStateUpdate() {
  try {
    // Determine the URL pattern based on the current tab
    let urlPatterns = ["http://localhost:3000/*", "https://*.topay.io/*", "https://*.topay.com/*"];
    
    // Query tabs that match our content script URL patterns
    chrome.tabs.query({
      url: urlPatterns
    }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error('Error querying tabs:', chrome.runtime.lastError);
        return;
      }
      
      // Add a small delay to ensure content scripts are fully loaded
      setTimeout(() => {
        tabs.forEach(tab => {
          try {
            chrome.tabs.sendMessage(tab.id, { 
              type: 'STATE_UPDATED', 
              state: {
                walletAddress,
                isNodeRunning,
                totalPoints,
                pointsRate: isNodeRunning ? POINTS_PER_SECOND : 0,
                isConnected: !!walletAddress
              }
            }, () => {
              if (chrome.runtime.lastError) {
                // This is expected for tabs that don't have content script
                console.log(`Could not send STATE_UPDATED to tab ${tab.id}: ${chrome.runtime.lastError.message}`);
              }
              // Even if there's no response, we need to handle it to prevent "Receiving end does not exist" errors
            });
          } catch (error) {
            console.error(`Error sending message to tab ${tab.id}:`, error);
          }
        });
      }, 500); // 500ms delay to ensure content scripts are loaded
    });
  } catch (error) {
    console.error('Error notifying tabs:', error);
  }
}

// Function to toggle the node state
async function toggleNode(sendResponse) {
  try {
    // Check if wallet is connected
    if (!walletAddress) {
      if (sendResponse) sendResponse({ success: false, error: 'Wallet not connected' });
      return;
    }
    
    // Toggle the state
    isNodeRunning = !isNodeRunning;
    
    // Record the current time
    const currentTime = Date.now();
    
    // If starting the node, record the start time
    if (isNodeRunning) {
      chrome.storage.local.set({ 
        isNodeRunning, 
        lastPointsUpdate: currentTime,
        nodeStartTime: currentTime
      });
      startPointsAccumulation();
      addConnectionRecord('NODE_STARTED');
    } else {
      // If stopping the node, calculate uptime and points earned
      const startTime = await new Promise(resolve => {
        chrome.storage.local.get(['nodeStartTime'], (result) => {
          resolve(result.nodeStartTime || currentTime);
        });
      });
      
      const uptime = (currentTime - startTime) / 1000; // in seconds
      const pointsEarned = uptime * POINTS_PER_SECOND;
      
      chrome.storage.local.set({ 
        isNodeRunning, 
        lastPointsUpdate: currentTime,
        nodeStartTime: null,
        lastSessionUptime: uptime,
        lastSessionPointsEarned: pointsEarned
      });
      
      stopPointsAccumulation();
      addConnectionRecord('NODE_STOPPED');
    }
    
    // Update the server
    await updateNodeStatusOnServer(isNodeRunning);
    
    // Notify all tabs about the state update
    notifyTabsAboutStateUpdate();
    
    // Send response
    if (sendResponse) sendResponse({ 
      success: true, 
      isNodeRunning,
      totalPoints,
      pointsRate: isNodeRunning ? POINTS_PER_SECOND : 0
    });
  } catch (error) {
    console.error('Error toggling node:', error);
    if (sendResponse) sendResponse({ success: false, error: error.message });
  }
}

// Function to generate a random 6-character ID (letters and numbers)
function generateRandomSessionId() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Function to update node status on the server
async function updateNodeStatusOnServer(isRunning) {
  try {
    // Only update if we have a wallet address
    if (!walletAddress) {
      console.log('Cannot update node status: Wallet not connected');
      return;
    }
    
    // Calculate session data
    const sessionId = generateRandomSessionId();
    let uptime = 0;
    let pointsEarned = 0;
    
    // If stopping the node, get the stored values
    if (!isRunning) {
      const result = await new Promise(resolve => {
        chrome.storage.local.get(['lastSessionUptime', 'lastSessionPointsEarned'], resolve);
      });
      uptime = result.lastSessionUptime || 0;
      pointsEarned = result.lastSessionPointsEarned || 0;
    }
    
    // Prepare the request data
    const data = {
      walletAddress,
      isRunning,
      sessionData: {
        sessionId,
        pointsPerSecond: POINTS_PER_SECOND,
        uptime,
        pointsEarned,
        deviceIP
      }
    };
    
    // Determine the API URL based on the environment
    // First try to get the current tab URL to determine the base URL
    let apiBaseUrl = 'http://localhost:3000';
    
    try {
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      if (tabs && tabs.length > 0 && tabs[0].url) {
        const tabUrl = new URL(tabs[0].url);
        // If the tab is on a domain that matches our app, use that domain for API calls
        if (tabUrl.hostname.includes('topay') || tabUrl.hostname === 'localhost') {
          apiBaseUrl = `${tabUrl.protocol}//${tabUrl.host}`;
        }
      }
    } catch (error) {
      console.log('Error determining API URL from tabs, using default:', error);
    }
    
    // Add a custom header to identify this as an extension request
    const response = await fetch(`${apiBaseUrl}/api/user/update-node-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'extension'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      // Try to get more detailed error information from the response
      try {
        const errorData = await response.json();
        throw new Error(`Server responded with status: ${response.status}, message: ${errorData.message || errorData.error || 'Unknown error'}`);
      } catch (jsonError) {
        // If we can't parse the error response, just use the status code
        console.error('Error parsing error response:', jsonError);
        throw new Error(`Server responded with status: ${response.status}`);
      }
    }
    
    // Safely parse the response body
    let result;
    try {
      result = await response.json();
    } catch (jsonError) {
      console.error('Error parsing response JSON:', jsonError);
      throw new Error(`Failed to parse server response: ${jsonError.message}`);
    }
    
    if (result.success) {
      console.log(`Node status updated on server: ${isRunning ? 'Running' : 'Stopped'}`);
      
      // If the server returned updated points, update our local value
      if (result.user && result.user.points !== undefined) {
        totalPoints = result.user.points;
        
        // Save to storage
        chrome.storage.local.set({ 
          totalPoints,
          lastPointsUpdate: Date.now(),
          lastServerSync: Date.now()
        });
        
        // Notify all tabs about the updated points
        notifyTabsAboutStateUpdate();
      }
    } else {
      console.error('Failed to update node status on server:', result.error);
    }
  } catch (error) {
    console.error('Error updating node status on server:', error);
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


// Function to set the wallet address
// Set wallet address and notify all tabs
function setWalletAddress(address, sendResponse) {
  try {
    // Update state
    walletAddress = address;
    const isConnected = !!address;
    
    // Save to storage
    chrome.storage.local.set({ walletAddress: address, isConnected }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving wallet address:', chrome.runtime.lastError);
        if (sendResponse) sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      
      // Add connection record
      addConnectionRecord(isConnected ? 'WALLET_CONNECTED' : 'WALLET_DISCONNECTED');
      
      // Notify all tabs about state update
      try {
        // Determine the URL pattern based on the current tab
        let urlPatterns = ["http://localhost:3000/*", "https://*.topay.io/*", "https://*.topay.com/*"];
        
        // Query tabs that match our content script URL patterns
        chrome.tabs.query({
          url: urlPatterns
        }, (tabs) => {
          if (chrome.runtime.lastError) {
            console.error('Error querying tabs:', chrome.runtime.lastError);
            return;
          }
          
          // Add a small delay to ensure content scripts are fully loaded
          setTimeout(() => {
            tabs.forEach(tab => {
              try {
                chrome.tabs.sendMessage(tab.id, { 
                  type: 'STATE_UPDATED', 
                  state: {
                    walletAddress: address,
                    isNodeRunning,
                    totalPoints,
                    isConnected
                  }
                }, () => {
                  if (chrome.runtime.lastError) {
                    // This is expected for tabs that don't have content script
                    console.log(`Could not send STATE_UPDATED to tab ${tab.id}: ${chrome.runtime.lastError.message}`);
                  }
                  // Even if there's no response, we need to handle it to prevent "Receiving end does not exist" errors
                });
                
                chrome.tabs.sendMessage(tab.id, { 
                  type: 'WALLET_ADDRESS_UPDATED', 
                  walletAddress: address, 
                  isConnected 
                }, () => {
                  if (chrome.runtime.lastError) {
                    // This is expected for tabs that don't have content script
                    console.log(`Could not send WALLET_ADDRESS_UPDATED to tab ${tab.id}: ${chrome.runtime.lastError.message}`);
                  }
                  // Even if there's no response, we need to handle it to prevent "Receiving end does not exist" errors
                });
              } catch (error) {
                console.error(`Error sending message to tab ${tab.id}:`, error);
              }
            });
          }, 500); // 500ms delay to ensure content scripts are loaded
        });
      } catch (error) {
        console.error('Error notifying tabs:', error);
      }
      
      // Send response if callback provided
      if (sendResponse) sendResponse({ success: true });
    });
  } catch (error) {
    console.error('Error in setWalletAddress:', error);
    if (sendResponse) sendResponse({ success: false, error: error.message });
  }
  
  // Return true to indicate we'll send response asynchronously
  return true;
}

// Connect wallet (wrapper for setWalletAddress)
function connectWallet(walletAddress, sendResponse) {
  try {
    return setWalletAddress(walletAddress, (response) => {
      // After setting the wallet address, sync with the server if node is running
      if (response && response.success && isNodeRunning) {
        updateNodeStatusOnServer(true);
      }
      
      // Forward the response to the original callback
      if (sendResponse) {
        sendResponse(response);
      }
    });
  } catch (error) {
    console.error('Error in connectWallet:', error);
    if (sendResponse) sendResponse({ success: false, error: error.message });
    return true; // Return true to indicate we'll send response asynchronously
  }
}

// Function to get the connection history
function getConnectionHistory(sendResponse) {
  try {
    if (sendResponse) {
      sendResponse({ success: true, history: connectionHistory });
    }
  } catch (error) {
    console.error('Error in getConnectionHistory:', error);
    if (sendResponse) {
      sendResponse({ success: false, error: error.message });
    }
  }
}