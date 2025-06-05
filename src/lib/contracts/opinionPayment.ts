import { parseEther } from 'viem';

// ABI for a simple payment contract
export const OPINION_PAYMENT_ABI = [
  // Function to pay for an opinion
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "opinionId",
        "type": "string"
      }
    ],
    "name": "payForOpinion",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  // Event emitted when payment is received
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "payer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "string",
        "name": "opinionId",
        "type": "string"
      }
    ],
    "name": "OpinionPayment",
    "type": "event"
  }
];

// Contract address - this would be set after deployment
// For now, using a placeholder
export const OPINION_PAYMENT_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';

// Function to convert USD to ETH (simplified version)
// In a real app, you would use an oracle or price feed
export function usdToEth(usdAmount: number): bigint {
  // Assuming 1 ETH = $2000 (this would be dynamic in a real app)
  const ethPrice = 2000;
  const ethAmount = usdAmount / ethPrice;
  return parseEther(ethAmount.toString());
}

// Types for opinion payment
export interface OpinionPaymentParams {
  opinionId: string;
  amount: number; // in USD
}

// Function to prepare the transaction parameters
export function prepareOpinionPayment(params: OpinionPaymentParams) {
  const { opinionId, amount } = params;
  
  // Convert USD amount to ETH
  const ethAmount = usdToEth(amount);
  
  return {
    address: OPINION_PAYMENT_CONTRACT_ADDRESS as `0x${string}`,
    abi: OPINION_PAYMENT_ABI,
    functionName: 'payForOpinion',
    args: [opinionId],
    value: ethAmount
  };
}