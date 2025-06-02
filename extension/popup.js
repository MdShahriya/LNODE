document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const connectWalletBtn = document.getElementById('connect-wallet');
  const disconnectWalletBtn = document.getElementById('disconnect-wallet');
  const notConnectedDiv = document.getElementById('not-connected');
  const connectedDiv = document.getElementById('connected');
  const toggleNodeBtn = document.getElementById('toggle-node');
  const nodeStatusSpan = document.getElementById('node-status');
  const walletAddressP = document.getElementById('wallet-address');
  const dashboardBtn = document.getElementById('go-to-dashboard');
  
  // State variables
  let isNodeRunning = false;
  let walletAddress = '';
  let deviceIp = '';
  let totalRewards = 0;
  let rewardsPerSecond = 0;
  
  // Get device IP address
  fetchIpAddress();
  
  // Check if wallet is already connected
  chrome.storage.local.get(['walletAddress', 'nodeStatus', 'totalRewards', 'rewardsPerSecond', 'deviceIp'], function(result) {
    if (result.walletAddress) {
      walletAddress = result.walletAddress;
      showConnectedState();
      
      if (result.nodeStatus === 'running') {
        isNodeRunning = true;
        updateNodeUI(true);
        simulateRewards();
      }
      
      // Update rewards if available
      if (result.totalRewards) {
        totalRewards = result.totalRewards;
        updateRewardsDisplay();
      }
      
      if (result.rewardsPerSecond) {
        rewardsPerSecond = result.rewardsPerSecond;
        updateRewardsDisplay();
      }

      // Update device IP if available
      if (result.deviceIp) {
        deviceIp = result.deviceIp;
      }
    }
  });
  
  // Event Listeners
  connectWalletBtn.addEventListener('click', connectWallet);
  disconnectWalletBtn.addEventListener('click', disconnectWallet);
  toggleNodeBtn.addEventListener('click', toggleNode);
  dashboardBtn.addEventListener('click', openDashboard);
  
  // Functions
  function fetchIpAddress() {
    fetch('https://api.ipify.org?format=json')
      .then(response => response.json())
      .then(data => {
        deviceIp = data.ip;
        console.log('Device IP:', deviceIp);
        // Store IP in local storage
        chrome.storage.local.set({ deviceIp: deviceIp });
      })
      .catch(error => {
        console.error('Error fetching IP:', error);
      });
  }
  
  function connectWallet() {
    // Simulate dashboard connection (in a real extension, this would use Web3 or similar)
    connectWalletBtn.classList.add('loading');
    
    // Simulate delay for connection
    setTimeout(() => {
      // Generate a mock wallet address
      walletAddress = '0x' + Array.from({length: 40}, () => 
        Math.floor(Math.random() * 16).toString(16)).join('');
      
      // Save to storage
      chrome.storage.local.set({ 
        walletAddress: walletAddress,
        deviceIp: deviceIp,
        connectionTime: new Date().toISOString(),
        totalRewards: 0,
        rewardsPerSecond: 0
      });
      
      showConnectedState();
      connectWalletBtn.classList.remove('loading');
      
      // Send message to background script
      chrome.runtime.sendMessage({
        action: 'walletConnected',
        walletAddress: walletAddress,
        deviceIp: deviceIp
      });
    }, 1500);
  }
  
  function disconnectWallet() {
    // If node is running, stop it first
    if (isNodeRunning) {
      // Send message to background script to stop the node
      chrome.runtime.sendMessage({
        action: 'nodeStatusChanged',
        status: 'stopped',
        walletAddress: walletAddress,
        deviceIp: deviceIp
      });
    }
    
    // Clear wallet data from storage
    chrome.storage.local.remove(['walletAddress', 'nodeStatus', 'totalRewards', 'rewardsPerSecond', 'connectionTime']);
    
    // Reset state variables
    walletAddress = '';
    isNodeRunning = false;
    totalRewards = 0;
    rewardsPerSecond = 0;
    
    // Record disconnection event
    chrome.runtime.sendMessage({
      action: 'walletDisconnected',
      deviceIp: deviceIp
    });
    
    // Show not connected state
    showNotConnectedState();
  }
  
  function toggleNode() {
    toggleNodeBtn.classList.add('loading');
    
    setTimeout(() => {
      isNodeRunning = !isNodeRunning;
      updateNodeUI(isNodeRunning);
      
      // Save node status
      chrome.storage.local.set({ 
        nodeStatus: isNodeRunning ? 'running' : 'stopped',
        lastToggleTime: new Date().toISOString()
      });
      
      // If node is running, simulate rewards accumulation
      if (isNodeRunning) {
        simulateRewards();
      }
      
      // Send message to background script with current wallet address and device IP
      chrome.runtime.sendMessage({
        action: 'nodeStatusChanged',
        status: isNodeRunning ? 'running' : 'stopped',
        walletAddress: walletAddress,
        deviceIp: deviceIp
      });
      
      toggleNodeBtn.classList.remove('loading');
    }, 1000);
  }
  
  function updateNodeUI(isRunning) {
    if (isRunning) {
      toggleNodeBtn.classList.remove('start-button');
      toggleNodeBtn.classList.add('stop-button');
      toggleNodeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
      `;
      toggleNodeBtn.setAttribute('aria-label', 'Stop Node');
      nodeStatusSpan.classList.remove('status-stopped');
      nodeStatusSpan.classList.add('status-running');
    } else {
      toggleNodeBtn.classList.remove('stop-button');
      toggleNodeBtn.classList.add('start-button');
      toggleNodeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
          <line x1="12" y1="2" x2="12" y2="12"></line>
        </svg>
      `;
      toggleNodeBtn.setAttribute('aria-label', 'Start Node');
      nodeStatusSpan.classList.remove('status-running');
      nodeStatusSpan.classList.add('status-stopped');
    }
  }
  
  function showConnectedState() {
    notConnectedDiv.classList.add('hidden');
    connectedDiv.classList.remove('hidden');
    // Display truncated wallet address
    const displayAddress = '0×' + walletAddress.substring(2, 6) + '...' + walletAddress.substring(walletAddress.length - 3);
    walletAddressP.textContent = displayAddress;
  }
  
  function showNotConnectedState() {
    connectedDiv.classList.add('hidden');
    notConnectedDiv.classList.remove('hidden');
  }
  
  function updateRewardsDisplay() {
    // Update the rewards display in the UI
    const rewardElements = document.querySelectorAll('.reward-value');
    if (rewardElements.length >= 2) {
      rewardElements[0].textContent = totalRewards.toFixed(2) + ' pt';
      rewardElements[1].textContent = rewardsPerSecond.toFixed(3) + ' pt';
    }
  }
  
  function simulateRewards() {
    // Simulate rewards accumulation (in a real extension, this would be based on actual node performance)
    rewardsPerSecond = Math.random() * 0.01;
    
    // Save to storage
    chrome.storage.local.set({ rewardsPerSecond: rewardsPerSecond });
    
    // Update display
    updateRewardsDisplay();
    
    // Set up interval to accumulate rewards
    const rewardsInterval = setInterval(() => {
      if (!isNodeRunning) {
        clearInterval(rewardsInterval);
        return;
      }
      
      totalRewards += rewardsPerSecond;
      chrome.storage.local.set({ totalRewards: totalRewards });
      updateRewardsDisplay();
    }, 1000);
  }
  
  function openDashboard() {
    // Open dashboard in a new tab
    chrome.tabs.create({ url: 'https://node.topayfoundation.com/dashboard' });
  }
});