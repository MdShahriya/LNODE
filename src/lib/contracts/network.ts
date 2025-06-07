import { Address } from 'viem';

// Define the NetworkConfig interface with proper types
export interface NetworkConfig {
  website: string | undefined;
  id: number;
  name: string;
  explorer: string;
  rpcUrl: string;
  usdtAddress: Address;
  fundCollectionPoolAddress: Address;
  nftGeneratorAddress: Address;
}

// Define networks with all required properties
export const NETWORKS: Record<string, NetworkConfig> = {
  bscTestnet: {
    id: 97,
    name: 'BSC Testnet',
    explorer: 'https://testnet.bscscan.com',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    usdtAddress: '0x26eD23Dc51993AbB0944E4ff24d23a84BB7C46f8' as Address,
    fundCollectionPoolAddress: '0x286cE17ebD5910a963B083985DCC543E971A22eE' as Address,
    nftGeneratorAddress: '0x1B5a3e714bDCE14b933A65f6a498766896499782' as Address,
    website: 'https://node.topayfoundation.com'
  },
  bscMainnet: {
    id: 56,
    name: 'BSC Mainnet',
    explorer: 'https://bscscan.com',
    rpcUrl: 'https://bsc-dataseed1.binance.org/',
    usdtAddress: '0x55d398326f99059fF775485246999027B3197955' as Address, // Actual USDT address on BSC mainnet
    fundCollectionPoolAddress: '0x0000000000000000000000000000000000000000' as Address, // TODO: Add actual fund pool address
    nftGeneratorAddress: '0x0000000000000000000000000000000000000000' as Address, // TODO: Add actual NFT contract address after deployment
    website: 'https://node.topayfoundation.com'
  }
};

// Set the active network (replace with your actual active network)
export const ACTIVE_NETWORK = NETWORKS.bscTestnet;

// Export contract addresses for convenience
export const USDT_CONTRACT_ADDRESS = ACTIVE_NETWORK.usdtAddress;
export const FUND_COLLECTION_POOL_CONTRACT_ADDRESS = ACTIVE_NETWORK.fundCollectionPoolAddress;
export const NFT_GENERATOR_CONTRACT_ADDRESS = ACTIVE_NETWORK.nftGeneratorAddress;

// Export network utilities
export const getNetworkById = (chainId: number): NetworkConfig | undefined => {
  return Object.values(NETWORKS).find(network => network.id === chainId);
};

export const isTestnet = (): boolean => {
  return ACTIVE_NETWORK.id === 97; // BSC Testnet
};

export const getExplorerUrl = (txHash?: string, address?: string): string => {
  const baseUrl = ACTIVE_NETWORK.explorer;
  if (txHash) {
    return `${baseUrl}/tx/${txHash}`;
  }
  if (address) {
    return `${baseUrl}/address/${address}`;
  }
  return baseUrl;
};