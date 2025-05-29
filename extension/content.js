// Content script to interact with the dashboard page

// Function to extract wallet address from the page
function extractWalletAddress() {
  // Try to find wallet address in the DOM
  // This depends on how the wallet address is displayed in the dashboard
  const walletElements = document.querySelectorAll('*');
  let walletAddress = null;
  
  // Look for elements that might contain wallet address
  for (const element of walletElements) {
    const text = element.textContent || '';
    // Look for Ethereum address pattern (0x followed by 40 hex characters)
    const match = text.match(/0x[a-fA-F0-9]{40}/);
    if (match) {
      walletAddress = match[0];
      break;
    }
  }
  
  return walletAddress;
}

// Function to observe node status changes
function observeNodeStatus() {
  // Look for node status element
  const nodeStatusElement = document.querySelector('.status-running, .status-stopped');
  
  if (nodeStatusElement) {
    // Create a mutation observer to watch for changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' || mutation.type === 'childList') {
          // Node status has changed, send message to background script
          const isRunning = nodeStatusElement.classList.contains('status-running');
          chrome.runtime.sendMessage({
            action: 'nodeStatusChanged',
            isRunning
          });
        }
      }
    });
    
    // Start observing
    observer.observe(nodeStatusElement, { attributes: true, childList: true });
  }
}

// Function to extract node stats
function extractNodeStats() {
  const stats = {
    uptime: 0,
    points: 0,
    tasksCompleted: 0
  };
  
  // Try to find stats in the DOM
  const uptimeElement = document.querySelector('.stats-card:nth-child(1) .stats-value');
  const pointsElement = document.querySelector('.stats-card:nth-child(2) .stats-value');
  const tasksElement = document.querySelector('.stats-card:nth-child(3) .stats-value');
  
  if (uptimeElement) {
    const uptimeText = uptimeElement.textContent || '';
    const uptimeMatch = uptimeText.match(/\d+/);
    if (uptimeMatch) {
      stats.uptime = parseInt(uptimeMatch[0], 10);
    }
  }
  
  if (pointsElement) {
    const pointsText = pointsElement.textContent || '';
    const pointsMatch = pointsText.match(/[\d.]+/);
    if (pointsMatch) {
      stats.points = parseFloat(pointsMatch[0]);
    }
  }
  
  if (tasksElement) {
    const tasksText = tasksElement.textContent || '';
    const tasksMatch = tasksText.match(/\d+/);
    if (tasksMatch) {
      stats.tasksCompleted = parseInt(tasksMatch[0], 10);
    }
  }
  
  return stats;
}

// Function to check if node is running
function isNodeRunning() {
  const nodeStatusElement = document.querySelector('.status-running, .status-stopped');
  return nodeStatusElement && nodeStatusElement.classList.contains('status-running');
}

// Function to extract all dashboard data
function extractDashboardData() {
  const walletAddress = extractWalletAddress();
  const nodeStats = extractNodeStats();
  const isRunning = isNodeRunning();
  
  // Send data to background script
  chrome.runtime.sendMessage({
    action: 'dashboardData',
    data: {
      walletAddress,
      nodeStats,
      isRunning
    }
  });
}

// Initialize content script
function init() {
  // Wait for page to fully load
  setTimeout(() => {
    // Extract initial data
    extractDashboardData();
    
    // Set up observers
    observeNodeStatus();
    
    // Set up periodic data extraction
    setInterval(extractDashboardData, 5000); // Every 5 seconds
  }, 1000);
}

// Start the content script
init();

// Listen for messages from extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getDashboardData') {
    const data = {
      walletAddress: extractWalletAddress(),
      nodeStats: extractNodeStats(),
      isRunning: isNodeRunning()
    };
    sendResponse(data);
  }
  return true; // Indicates we'll respond asynchronously
});