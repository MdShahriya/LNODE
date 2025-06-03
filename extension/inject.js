// inject.js - Injected into the dashboard page to detect the extension

// Set a flag to indicate that the extension is installed
window.topayNodeExtensionDetected = true;

// Create a custom event to notify the dashboard that the extension is installed
const event = new CustomEvent('topayNodeExtensionInstalled');
document.dispatchEvent(event);

// Define the extension API that will be available to the dashboard
window.topayNodeExtension = {
  // Get the current node status
  getNodeStatus: () => {
    return new Promise((resolve, reject) => {
      // Send a message to the extension to get the node status
      window.postMessage({
        type: 'FROM_DASHBOARD',
        action: 'SYNC_REQUEST'
      }, '*');
      
      // Set up a listener for the response
      const listener = (event) => {
        if (event.data.type === 'FROM_EXTENSION' && event.data.action === 'SYNC_RESPONSE') {
          window.removeEventListener('message', listener);
          resolve(event.data.data || {});
        }
      };
      
      window.addEventListener('message', listener);
      
      // Set a timeout to reject the promise if no response is received
      setTimeout(() => {
        window.removeEventListener('message', listener);
        reject(new Error('Timeout waiting for node status'));
      }, 5000);
    });
  },
  
  // Toggle the node (start/stop)
  toggleNode: () => {
    return new Promise((resolve, reject) => {
      // Send a message to the extension to toggle the node
      window.postMessage({
        type: 'FROM_DASHBOARD',
        action: 'TOGGLE_NODE'
      }, '*');
      
      // Set up a listener for the response
      const listener = (event) => {
        if (event.data.type === 'FROM_EXTENSION' && event.data.action === 'TOGGLE_NODE_RESPONSE') {
          window.removeEventListener('message', listener);
          resolve(event.data.data || {});
        }
      };
      
      window.addEventListener('message', listener);
      
      // Set a timeout to reject the promise if no response is received
      setTimeout(() => {
        window.removeEventListener('message', listener);
        reject(new Error('Timeout waiting for toggle node response'));
      }, 5000);
    });
  },
  
  // Get the connection history
  getConnectionHistory: () => {
    return new Promise((resolve, reject) => {
      // Send a message to the extension to get the connection history
      window.postMessage({
        type: 'FROM_DASHBOARD',
        action: 'GET_CONNECTION_HISTORY'
      }, '*');
      
      // Set up a listener for the response
      const listener = (event) => {
        if (event.data.type === 'FROM_EXTENSION' && event.data.action === 'CONNECTION_HISTORY_RESPONSE') {
          window.removeEventListener('message', listener);
          resolve(event.data.data || []);
        }
      };
      
      window.addEventListener('message', listener);
      
      // Set a timeout to reject the promise if no response is received
      setTimeout(() => {
        window.removeEventListener('message', listener);
        reject(new Error('Timeout waiting for connection history'));
      }, 5000);
    });
  }
};

console.log('TOPAY Node Extension detected and API injected');