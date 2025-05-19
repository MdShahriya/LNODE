import User from '../models/user.js';
import Task from '../models/task.js';

// Admin wallet addresses
const ADMIN_ADDRESSES = ["0x9841adF197F21fE9a299312da8EF2C47f83c4e89",
];

// Middleware to check if the user is an admin
export const isAdmin = async (req, res, next) => {
  try {
    // Get admin wallet address from headers (support both formats)
    const adminWalletAddress = req.headers['x-wallet-address'] || req.headers.adminwalletaddress;
    
    if (!adminWalletAddress) {
      return res.status(401).json({ error: 'Admin wallet address is required' });
    }
    
    // Check if the wallet address is in the admin list
    const isAdminWallet = ADMIN_ADDRESSES.some(
      admin => admin.toLowerCase() === adminWalletAddress.toLowerCase()
    );
    
    if (!isAdminWallet) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }
    
    // If admin, proceed to the next middleware/route handler
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Middleware to verify user wallet address
export const verifyUser = async (req, res, next) => {
  try {
    // Get wallet address from params or body
    const walletAddress = req.params.walletAddress || req.body.walletAddress;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    // Check if user exists
    const user = await User.findOne({ walletAddress });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Attach user to request object for use in route handlers
    req.user = user;
    next();
  } catch (error) {
    console.error('User verification error:', error);
    res.status(500).json({ error: 'User verification failed' });
  }
};

// Middleware to check if a task exists
export const verifyTask = async (req, res, next) => {
  try {
    const taskId = req.params.taskId || req.body.taskId;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    const task = await Task.findById(taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Attach task to request object for use in route handlers
    req.task = task;
    next();
  } catch (error) {
    console.error('Task verification error:', error);
    res.status(500).json({ error: 'Task verification failed' });
  }
};