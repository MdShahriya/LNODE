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
chrome.alarms.create('updatePoints', { periodInMinutes: 1/6 }); // Changed to 10 seconds (1/6 minute)
chrome.alarms.create('refreshIP', { periodInMinutes: 0.25 });
chrome.alarms.create('syncPointsWithServer', { periodInMinutes: 1/6 }); // Changed to 10 seconds (1/6 minute)

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
    
    // First, try to register the user if they don't exist
     try {
       await registerUserIfNeeded(walletAddress, apiBaseUrl);
       
       // Then sync points with the server
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
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(`Server responded with status: ${response.status}, message: ${errorData.message || errorData.error || 'Unknown error'}`);
        } else {
          // Handle non-JSON responses
          const textResponse = await response.text();
          console.log('Non-JSON error response:', textResponse.substring(0, 100) + '...');
          throw new Error(`Server responded with status: ${response.status}`);
        }
      } catch (jsonError) {
        // If we can't parse the error response, just use the status code
        console.error('Error parsing error response:', jsonError);
        throw new Error(`Server responded with status: ${response.status}`);
      }
    }
    
    // Safely parse the response body
    let result;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const textResponse = await response.text();
        console.log('Unexpected non-JSON response:', textResponse.substring(0, 100) + '...');
        throw new Error('Server responded with non-JSON content');
      }
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
      } catch (innerError) {
        console.error('Error in sync points process:', innerError);
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
        lastSessionPointsEarned: pointsEarned,
        doNotUpdatePointsOnNextSync: true // Add flag to prevent points update when stopping
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
    
    // First, try to register the user if they don't exist
     try {
       await registerUserIfNeeded(walletAddress, apiBaseUrl);
       
       // Then update the node status
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
      
      // Check if we should update points
      chrome.storage.local.get(['doNotUpdatePointsOnNextSync'], (storageResult) => {
        const doNotUpdatePoints = storageResult.doNotUpdatePointsOnNextSync;
        
        // Only update points if the node is running or if the flag is not set
        if ((isRunning || !doNotUpdatePoints) && result.user && result.user.points !== undefined) {
          totalPoints = result.user.points;
          
          // Save to storage and clear the flag
          chrome.storage.local.set({ 
            totalPoints,
            lastPointsUpdate: Date.now(),
            lastServerSync: Date.now(),
            doNotUpdatePointsOnNextSync: false // Clear the flag
          });
          
          // Notify all tabs about the updated points
          notifyTabsAboutStateUpdate();
        } else if (doNotUpdatePoints) {
          // Clear the flag if it was set
          chrome.storage.local.set({ doNotUpdatePointsOnNextSync: false });
        }
      });
        } else {
          console.error('Failed to update node status on server:', result.error);
        }
      } catch (innerError) {
        console.error('Error in update node status process:', innerError);
      }
    } catch (error) {
      console.error('Error updating node status on server:', error);
    }
}

// Function to start accumulating points
let pointsInterval = null;
function startPointsAccumulation() {
  // Clear any existing interval
  stopPointsAccumulation();
  
  // Only start accumulating points if both conditions are met
  if (isNodeRunning && walletAddress) {
    // Start a new interval to accumulate points
    pointsInterval = setInterval(() => {
      // Double-check conditions are still met before adding points
      if (isNodeRunning && walletAddress) {
        totalPoints += POINTS_PER_SECOND;
      } else {
        // If conditions are no longer met, stop accumulation
        stopPointsAccumulation();
      }
    }, 1000);
  }
}

// Function to stop accumulating points
function stopPointsAccumulation() {
  if (pointsInterval) {
    clearInterval(pointsInterval);
    pointsInterval = null;
  }
}

// Function to fetch the device's public IP address
async function fetchDeviceIP() {
  // Try multiple IP services in case one fails
  const ipServices = [
    'https://api.ipify.org?format=json',
    'https://api.ipify.org',  // Plain text fallback
    'https://api64.ipify.org?format=json',
    'https://icanhazip.com',  // Plain text fallback
  ];
  
  let success = false;
  
  for (const service of ipServices) {
    if (success) break;
    
    try {
      const response = await fetch(service, { timeout: 5000 });
      
      if (!response.ok) {
        console.warn(`IP service ${service} responded with status: ${response.status}`);
        continue;
      }
      
      // Check if the response is JSON or plain text
      const contentType = response.headers.get('content-type');
      let ip;
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        ip = data.ip;
      } else {
        // Handle plain text response
        const text = await response.text();
        ip = text.trim();
      }
      
      if (ip) {
        deviceIP = ip;
        chrome.storage.local.set({ deviceIP });
        console.log(`Successfully fetched IP: ${ip} from ${service}`);
        success = true;
      }
    } catch (error) {
      console.warn(`Error fetching IP from ${service}:`, error);
    }
  }
  
  if (!success) {
    console.error('Failed to fetch IP from all services');
  }
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
    
    // We'll no longer add connection records for wallet connections here
    // This ensures sessions are only created when the node starts
  }
});


// Function to set the wallet address
// Set wallet address and notify all tabs
function setWalletAddress(address, sendResponse) {
  try {
    // Get the previous wallet address for comparison
    const previousWalletAddress = walletAddress;
    
    // Update state
    walletAddress = address;
    const isConnected = !!address;
    
    // If wallet is being disconnected, stop the node and points accumulation
    if (previousWalletAddress && !address && isNodeRunning) {
      isNodeRunning = false;
      stopPointsAccumulation();
      chrome.storage.local.set({ isNodeRunning });
    }
    
    // Save to storage
    chrome.storage.local.set({ walletAddress: address, isConnected }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving wallet address:', chrome.runtime.lastError);
        if (sendResponse) sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      
      // If a new wallet is connected, fetch the balance from the server
      if (address && (!previousWalletAddress || previousWalletAddress !== address)) {
        fetchUserBalanceFromServer(address);
      }
      
      // No longer add connection records for wallet connections
      // Only notify server about disconnection
      if (previousWalletAddress && !address) {
        notifyServerAboutWalletDisconnection(previousWalletAddress);
        
        // When disconnecting wallet, don't update points from server response
        // We'll just keep the current points in local storage
        chrome.storage.local.set({
          doNotUpdatePointsOnNextSync: true
        });
      }
      
      // Notify all tabs about state update
      notifyTabsAboutStateUpdate();
      
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

// Function to fetch user balance from server
async function fetchUserBalanceFromServer(address) {
  try {
    if (!address) {
      console.log('Cannot fetch balance: Wallet not connected');
      return;
    }
    
    // Determine the API URL based on the environment
    let apiBaseUrl = 'http://localhost:3000';
    
    try {
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      if (tabs && tabs.length > 0 && tabs[0].url) {
        const tabUrl = new URL(tabs[0].url);
        if (tabUrl.hostname.includes('topay') || tabUrl.hostname === 'localhost') {
          apiBaseUrl = `${tabUrl.protocol}//${tabUrl.host}`;
        }
      }
    } catch (error) {
      console.log('Error determining API URL from tabs, using default:', error);
    }
    
    console.log(`Fetching balance for wallet ${address}`);
    
    try {
      // First, try to register the user if they don't exist
      await registerUserIfNeeded(address, apiBaseUrl);
      
      // Then fetch the balance
      const response = await fetch(`${apiBaseUrl}/api/user/get-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'extension'
        },
        body: JSON.stringify({ walletAddress: address })
      });
      
      if (!response.ok) {
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(`Server responded with status: ${response.status}, message: ${errorData.message || errorData.error || 'Unknown error'}`);
        } else {
          const textResponse = await response.text();
          console.log('Non-JSON error response:', textResponse.substring(0, 100) + '...');
          throw new Error(`Server responded with status: ${response.status}`);
        }
      } catch (jsonError) {
        console.error('Error parsing error response:', jsonError);
        throw new Error(`Server responded with status: ${response.status}`);
      }
    }
    
    // Safely parse the response body
    let result;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const textResponse = await response.text();
        console.log('Unexpected non-JSON response:', textResponse.substring(0, 100) + '...');
        throw new Error('Server responded with non-JSON content');
      }
    } catch (jsonError) {
      console.error('Error parsing response JSON:', jsonError);
      throw new Error(`Failed to parse server response: ${jsonError.message}`);
    }
    
    if (result.success && result.user) {
        // Update local points with the server value
        totalPoints = result.user.points || 0;
        
        // Save to storage
        chrome.storage.local.set({ 
          totalPoints,
          lastPointsUpdate: Date.now(),
          lastServerSync: Date.now()
        });
        
        console.log(`Balance fetched from server. Current balance: ${totalPoints}`);
        
        // Notify all tabs about the updated points
        notifyTabsAboutStateUpdate();
      } else {
        console.error('Failed to fetch balance from server:', result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error in fetch balance process:', error);
    }
  } catch (error) {
    console.error('Error fetching balance from server:', error);
  }
}

// Function to register user if they don't exist
async function registerUserIfNeeded(address, apiBaseUrl) {
  try {
    console.log(`Checking if user ${address} needs to be registered`);
    
    // Try to get the user first
    const checkResponse = await fetch(`${apiBaseUrl}/api/user?walletAddress=${address}`, {
      method: 'GET',
      headers: {
        'X-Source': 'extension'
      }
    });
    
    // If user doesn't exist (404), register them
    if (checkResponse.status === 404) {
      console.log(`User ${address} not found, registering...`);
      
      const registerResponse = await fetch(`${apiBaseUrl}/api/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'extension'
        },
        body: JSON.stringify({ 
          walletAddress: address,
          preferences: {
            notifications: true,
            theme: 'dark',
            language: 'en'
          }
        })
      });
      
      if (!registerResponse.ok) {
        const errorText = await registerResponse.text();
        console.error(`Failed to register user: ${registerResponse.status}`, errorText);
        throw new Error(`Failed to register user: ${registerResponse.status}`);
      }
      
      const result = await registerResponse.json();
      console.log('User registration successful:', result.success);
      return result;
    } else if (!checkResponse.ok) {
      console.error(`Error checking user existence: ${checkResponse.status}`);
    } else {
      console.log(`User ${address} already exists`);
    }
    
    return null;
  } catch (error) {
    console.error('Error in registerUserIfNeeded:', error);
    throw error;
  }
}

// Connect wallet (wrapper for setWalletAddress)
function connectWallet(walletAddress, sendResponse) {
  try {
    return setWalletAddress(walletAddress, (response) => {
      // After setting the wallet address, sync with the server if node is running
      if (response && response.success) {
        // Always fetch the balance when connecting a wallet
        fetchUserBalanceFromServer(walletAddress);
        
        // Update node status on server if node is running
        if (isNodeRunning) {
          updateNodeStatusOnServer(true);
        }
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

// Function to notify the server about wallet disconnection
async function notifyServerAboutWalletDisconnection(walletAddressToDisconnect) {
  try {
    // Only update if we have a wallet address
    if (!walletAddressToDisconnect) {
      console.log('Cannot notify server about wallet disconnection: No wallet address provided');
      return;
    }
    
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
    
    // Prepare the request data
    const data = {
      walletAddress: walletAddressToDisconnect,
      deviceIp: deviceIP
    };
    
    // Add a custom header to identify this as an extension request
    const response = await fetch(`${apiBaseUrl}/api/user/disconnect-wallet`, {
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
      console.log(`Wallet disconnection notified to server: ${walletAddressToDisconnect}`);
      
      // Don't update points when disconnecting wallet
      // We'll just keep the current points in local storage
    } else {
      console.error('Failed to notify server about wallet disconnection:', result.error);
    }
  } catch (error) {
    console.error('Error notifying server about wallet disconnection:', error);
  }
}