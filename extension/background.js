// Constants
const MAX_NODE_RUNTIME_SECONDS = 24 * 60 * 60; // 24 hours in seconds
const API_BASE_URL = 'http://localhost:3000/api';

// State management
let state = {
  isConnected: false,
  walletAddress: null,
  nodeStats: {
    uptime: 0,
    points: 0,
    tasksCompleted: 0
  },
  isNodeRunning: false,
  startTime: null,
  localPoints: 0,
  secondsElapsed: 0,
  remainingTime: '0h 0m',
  isProcessingSignature: false
};

// Helper functions
function secondsToHours(seconds) {
  return Math.floor(seconds / 3600);
}

function secondsToMinutes(seconds) {
  return seconds / 60;
}

function formatRemainingTime(seconds) {
  if (seconds <= 0) return '0h 0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  return `${hours}h ${minutes}m`;
}

// Save state to storage
async function saveState() {
  await chrome.storage.local.set({ state });
}

// Load state from storage
async function loadState() {
  const data = await chrome.storage.local.get('state');
  if (data.state) {
    state = data.state;
  }
}

// Update state and notify popup
async function updateState(newState) {
  state = { ...state, ...newState };
  await saveState();
  
  // Notify any open popups
  chrome.runtime.sendMessage({
    type: 'stateUpdate',
    data: state
  }).catch(() => {
    // Ignore errors when no popup is open
  });
}

// Fetch user data from API
async function fetchUserData() {
  if (!state.walletAddress) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/user?walletAddress=${state.walletAddress}`);
    
    if (response.ok) {
      const data = await response.json();
      
      // Update state with user data
      updateState({
        isConnected: true,
        nodeStats: {
          uptime: secondsToHours(data.user.uptime),
          points: data.user.points,
          tasksCompleted: data.user.tasksCompleted
        },
        isNodeRunning: data.user.nodeStatus,
        startTime: data.user.nodeStartTime ? new Date(data.user.nodeStartTime).getTime() : null
      });
      
      // If node is running, start the timer
      if (data.user.nodeStatus && data.user.nodeStartTime) {
        startTimer();
      }
    } else if (response.status === 404) {
      // User not found
      updateState({
        isConnected: false,
        walletAddress: null
      });
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
}

// Toggle node status
async function toggleNode() {
  if (!state.walletAddress || state.isProcessingSignature) return { success: false, error: 'Cannot toggle node' };
  
  try {
    updateState({ isProcessingSignature: true });
    
    const response = await fetch(`${API_BASE_URL}/user/update-node-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: state.walletAddress,
        isRunning: !state.isNodeRunning
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (!state.isNodeRunning) {
        // Node was started
        const serverStartTime = new Date(data.user.nodeStartTime).getTime();
        
        updateState({
          isNodeRunning: true,
          startTime: serverStartTime,
          localPoints: 0,
          secondsElapsed: 0,
          nodeStats: {
            uptime: secondsToHours(data.user.uptime),
            points: data.user.points,
            tasksCompleted: data.user.tasksCompleted
          }
        });
        
        // Start the timer
        startTimer();
      } else {
        // Node was stopped
        updateState({
          isNodeRunning: false,
          startTime: null,
          localPoints: 0,
          secondsElapsed: 0,
          remainingTime: '0h 0m',
          nodeStats: {
            uptime: secondsToHours(data.user.uptime),
            points: data.user.points,
            tasksCompleted: data.user.tasksCompleted
          }
        });
        
        // Stop the timer
        stopTimer();
      }
      
      updateState({ isProcessingSignature: false });
      return { success: true, data: state };
    } else {
      updateState({ isProcessingSignature: false });
      return { success: false, error: 'Failed to update node status' };
    }
  } catch (error) {
    console.error('Error toggling node:', error);
    updateState({ isProcessingSignature: false });
    return { success: false, error: error.message };
  }
}

// Timer variables
let timer = null;
let statusTimer = null;

// Start timer for node running
function startTimer() {
  // Clear any existing timers
  stopTimer();
  
  // Start a new timer
  timer = setInterval(() => {
    if (!state.startTime) return;
    
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - state.startTime) / 1000);
    const remainingSeconds = MAX_NODE_RUNTIME_SECONDS - elapsedSeconds;
    
    // Update remaining time
    const remainingTime = formatRemainingTime(remainingSeconds);
    
    // Check if node has been running for more than 24 hours
    if (elapsedSeconds >= MAX_NODE_RUNTIME_SECONDS) {
      // Auto-stop the node after 24 hours
      console.log('Node has been running for 24 hours - auto stopping');
      toggleNode();
      return;
    }
    
    // Calculate points
    const elapsedMinutes = secondsToMinutes(elapsedSeconds);
    const potentialPoints = elapsedMinutes * 12;
    
    // Update state
    updateState({
      secondsElapsed: elapsedSeconds,
      localPoints: potentialPoints,
      remainingTime,
      nodeStats: {
        ...state.nodeStats,
        points: state.nodeStats.points + (potentialPoints - state.localPoints),
        uptime: secondsToHours(elapsedSeconds) + state.nodeStats.uptime
      }
    });
  }, 1000);
  
  // Set up a heartbeat to check node status from server
  statusTimer = setInterval(fetchUserData, 300000); // Every 5 minutes
}

// Stop timer
function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  
  if (statusTimer) {
    clearInterval(statusTimer);
    statusTimer = null;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getState') {
    sendResponse(state);
  } else if (message.action === 'toggleNode') {
    toggleNode().then(sendResponse);
    return true; // Indicates we'll respond asynchronously
  } else if (message.action === 'updateWallet') {
    updateState({ walletAddress: message.walletAddress });
    fetchUserData().then(() => sendResponse(state));
    return true; // Indicates we'll respond asynchronously
  } else if (message.action === 'connectWallet') {
    // Try to get wallet address from the dashboard API
    chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('/dashboard')) {
        try {
          // First try to get from localStorage via content script
          const results = await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: () => localStorage.getItem('walletAddress')
          });
          
          if (results && results[0] && results[0].result) {
            const walletAddress = results[0].result;
            
            // Verify with API
            try {
              const apiResponse = await fetch(`http://localhost:3000/api/extension/wallet?walletAddress=${walletAddress}`);
              if (apiResponse.ok) {
                const apiData = await apiResponse.json();
                if (apiData.success) {
                  updateState({ walletAddress, isConnected: true });
                  await fetchUserData();
                  sendResponse({ success: true, data: state });
                  return;
                }
              }
            } catch (apiError) {
              console.log('API verification failed, using localStorage value:', apiError);
            }
            
            // Fallback to localStorage value
            updateState({ walletAddress, isConnected: true });
            await fetchUserData();
            sendResponse({ success: true, data: state });
          } else {
            sendResponse({ success: false, error: 'No wallet connected. Please connect your wallet on the dashboard.' });
          }
        } catch (error) {
          console.error('Error getting wallet:', error);
          sendResponse({ success: false, error: 'Failed to connect wallet' });
        }
      } else {
        sendResponse({ success: false, error: 'Please open the dashboard first' });
      }
    });
    return true; // Indicates we'll respond asynchronously
  } else if (message.type === 'walletChanged') {
    // Handle wallet change notification from content script
    if (message.walletAddress) {
      updateState({ walletAddress: message.walletAddress, isConnected: true });
      fetchUserData();
    } else {
      updateState({ walletAddress: null, isConnected: false });
    }
  } else if (message.type === 'contentScriptReady') {
    console.log('Content script ready on:', message.url);
  }
});

// Listen for tab updates to detect wallet connection
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check if this is our dashboard page and it has completed loading
  if (tab.url && tab.url.includes('/dashboard') && changeInfo.status === 'complete') {
    // Inject a content script to get wallet address
    chrome.scripting.executeScript({
      target: { tabId },
      function: () => {
        // Try to get wallet address from localStorage or other storage
        const walletAddress = localStorage.getItem('walletAddress');
        return walletAddress;
      }
    }).then(results => {
      if (results && results[0] && results[0].result) {
        const walletAddress = results[0].result;
        updateState({ walletAddress });
        fetchUserData();
      }
    }).catch(error => {
      console.error('Error injecting script:', error);
    });
  }
});

// Initialize extension
async function init() {
  await loadState();
  fetchUserData();
  
  // If node is running, start the timer
  if (state.isNodeRunning && state.startTime) {
    startTimer();
  }
}

// Start the extension
init();