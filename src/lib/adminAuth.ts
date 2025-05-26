// Admin authentication utility functions

// List of admin wallet addresses (should be moved to environment variables in production)
export const ADMIN_WALLETS = [
  '0x9841adF197F21fE9a299312da8EF2C47f83c4e89', // Replace with actual admin wallet addresses
  // Add more admin wallet addresses as needed
];

// Secret key for bypassing admin check (should be a secure environment variable in production)
export const ADMIN_BYPASS_KEY = 'topay-admin-bypass-key';

/**
 * Check if a wallet address belongs to an admin
 * @param walletAddress The wallet address to check
 * @returns boolean indicating if the wallet is an admin
 */
export function isAdmin(walletAddress: string | undefined | null): boolean {
  if (!walletAddress) return false;
  return ADMIN_WALLETS.includes(walletAddress.toLowerCase());
}

/**
 * Check if a bypass key is valid
 * @param key The bypass key to check
 * @returns boolean indicating if the key is valid
 */
export function isValidBypassKey(key: string | undefined | null): boolean {
  if (!key) return false;
  return key === ADMIN_BYPASS_KEY;
}

/**
 * Get the current admin status based on wallet address and/or bypass key
 * @param walletAddress The connected wallet address
 * @param bypassKey Optional bypass key
 * @returns boolean indicating if admin access should be granted
 */
export function getAdminStatus(walletAddress: string | undefined | null, bypassKey?: string | null): boolean {
  return isAdmin(walletAddress) || isValidBypassKey(bypassKey);
}