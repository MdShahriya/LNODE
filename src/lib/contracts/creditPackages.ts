import { parseUnits } from 'viem';
import FundCollectionPoolABI from '@/abi/FundCollectionPool.json';
import { 
  USDT_CONTRACT_ADDRESS, 
  FUND_COLLECTION_POOL_CONTRACT_ADDRESS,
  ACTIVE_NETWORK
} from './network';

// Import the ABI from the compiled contract
export const FUND_COLLECTION_POOL_ABI = FundCollectionPoolABI.abi;

// ERC20 ABI for USDT token (only the approve function)
export const USDT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Export contract addresses from network configuration
export { USDT_CONTRACT_ADDRESS, FUND_COLLECTION_POOL_CONTRACT_ADDRESS };

// Export network utility
export { ACTIVE_NETWORK };

// Function to convert USD to USDT (USDT is pegged to USD, so 1:1 conversion)
// We just need to handle the decimals (USDT has 18 decimals on BSC)
export function usdToUsdt(usdAmount: number): bigint {
  return parseUnits(usdAmount.toString(), 18);
}

// Types for credit package purchase
export interface CreditPackageParams {
  packageId: string;
  price: number; // in USD
  credits: number;
}

// Function to prepare the USDT approval transaction parameters
export function prepareUsdtApproval(amount: number) {
  // Convert USD amount to USDT
  const usdtAmount = usdToUsdt(amount);
  
  return {
    address: USDT_CONTRACT_ADDRESS as `0x${string}`,
    abi: USDT_ABI,
    functionName: 'approve',
    args: [FUND_COLLECTION_POOL_CONTRACT_ADDRESS, usdtAmount]
  };
}

// Function to prepare the deposit transaction parameters for the FundCollectionPool
export function prepareCreditPackagePurchase(params: CreditPackageParams) {
  const { price } = params;
  
  // Convert USD amount to USDT
  const usdtAmount = usdToUsdt(price);
  
  return {
    address: FUND_COLLECTION_POOL_CONTRACT_ADDRESS as `0x${string}`,
    abi: FUND_COLLECTION_POOL_ABI,
    functionName: 'deposit',
    args: [usdtAmount]
  };
}

// Function to prepare transaction for adding a package (admin only)
export function prepareAddPackage(packageId: string, price: number, credits: number) {
  const usdtAmount = usdToUsdt(price);
  
  return {
    address: FUND_COLLECTION_POOL_CONTRACT_ADDRESS as `0x${string}`,
    abi: FUND_COLLECTION_POOL_ABI,
    functionName: 'addPackage',
    args: [packageId, usdtAmount, BigInt(credits)]
  };
}

// Function to prepare transaction for updating a package (admin only)
export function prepareUpdatePackage(packageId: string, price: number, credits: number, isActive: boolean) {
  const usdtAmount = usdToUsdt(price);
  
  return {
    address: FUND_COLLECTION_POOL_CONTRACT_ADDRESS as `0x${string}`,
    abi: FUND_COLLECTION_POOL_ABI,
    functionName: 'updatePackage',
    args: [packageId, usdtAmount, BigInt(credits), isActive]
  };
}

// Function to prepare transaction for withdrawing funds (admin only)
export function prepareWithdrawFunds(amount: number, recipient: string) {
  const usdtAmount = usdToUsdt(amount);
  
  return {
    address: FUND_COLLECTION_POOL_CONTRACT_ADDRESS as `0x${string}`,
    abi: FUND_COLLECTION_POOL_ABI,
    functionName: 'withdrawFunds',
    args: [usdtAmount, recipient]
  };
}