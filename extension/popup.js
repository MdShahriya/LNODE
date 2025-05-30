// DOM Elements
const notConnectedSection = document.getElementById('not-connected');
const connectedSection = document.getElementById('connected');
const connectWalletButton = document.getElementById('connect-wallet');
const toggleNodeButton = document.getElementById('toggle-node');
const nodeStatusElement = document.getElementById('node-status');
const walletAddressElement = document.getElementById('wallet-address');

// Helper functions
function formatWalletAddress(address) {
  if (!address) return 'Not connected';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Connect wallet handler
async function connectWalletHandler() {
  try {
    // Check if dashboard is open
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const isDashboardOpen = tabs[0] && tabs[0].url && tabs[0].url.includes('/dashboard');
    
    if (!isDashboardOpen) {
      // Open dashboard in new tab
      await chrome.tabs.create({ url: 'https://node.topayfoundation.com/dashboard' });
      notConnectedSection.innerHTML = '<p>Please connect your wallet on the dashboard page</p>';
      return;
    }
    
    // Request wallet connection from background script
    const response = await chrome.runtime.sendMessage({ action: 'connectWallet' });
    
    if (response.success) {
      updateUI(response.data);
    } else {
      console.error('Error connecting wallet:', response.error);
      notConnectedSection.innerHTML = `<p>${response.error}</p><button class="button primary-button" id="connect-wallet">Connect Wallet</button>`;
      // Re-attach event listener to new button
      document.getElementById('connect-wallet').addEventListener('click', connectWalletHandler);
    }
  } catch (error) {
    console.error('Error communicating with background script:', error);
    notConnectedSection.innerHTML = '<p>Failed to connect wallet. Please try again.</p><button class="button primary-button" id="connect-wallet">Connect Wallet</button>';
    // Re-attach event listener to new button
    document.getElementById('connect-wallet').addEventListener('click', connectWalletHandler);
  }
}

// Attach connect wallet handler
connectWalletButton.addEventListener('click', connectWalletHandler);

// Go to dashboard handler
document.getElementById('go-to-dashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://node.topayfoundation.com/dashboard' });
});

// Toggle node status
toggleNodeButton.addEventListener('click', async () => {
  toggleNodeButton.disabled = true;
  toggleNodeButton.classList.add('loading');
  
  // Add a 1-second delay for the loading animation
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'toggleNode' });
    
    if (response.success) {
      updateUI(response.data);
    } else {
      console.error('Error toggling node:', response.error);
      toggleNodeButton.disabled = false;
      toggleNodeButton.classList.remove('loading');
    }
  } catch (error) {
    console.error('Error communicating with background script:', error);
    toggleNodeButton.disabled = false;
    toggleNodeButton.classList.remove('loading');
  }
});

// Update UI based on state
function updateUI(data) {
  const { isConnected, walletAddress, isNodeRunning } = data;
  
  if (!isConnected) {
    notConnectedSection.classList.remove('hidden');
    connectedSection.classList.add('hidden');
    return;
  }
  
  // User is connected
  notConnectedSection.classList.add('hidden');
  connectedSection.classList.remove('hidden');
  
  // Update wallet address
  walletAddressElement.textContent = formatWalletAddress(walletAddress);
  
  // Update node status
  if (isNodeRunning) {
    nodeStatusElement.textContent = 'Running';
    nodeStatusElement.className = 'status-running';
    toggleNodeButton.className = 'control-button stop-button';
    toggleNodeButton.setAttribute('aria-label', 'Stop Node');
  } else {
    nodeStatusElement.textContent = 'Stopped';
    nodeStatusElement.className = 'status-stopped';
    toggleNodeButton.className = 'control-button start-button';
    toggleNodeButton.setAttribute('aria-label', 'Start Node');
  }
  
  toggleNodeButton.disabled = false;
  toggleNodeButton.classList.remove('loading');
}

// Initialize popup
async function initPopup() {
  try {
    const data = await chrome.runtime.sendMessage({ action: 'getState' });
    updateUI(data);
    
    // Listen for state updates
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'stateUpdate') {
        updateUI(message.data);
      }
    });
  } catch (error) {
    console.error('Error initializing popup:', error);
  }
}

// Start the popup
document.addEventListener('DOMContentLoaded', initPopup);