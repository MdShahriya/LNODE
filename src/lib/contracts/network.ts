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
    website: 'https://topay.foundation'
  },
  bscMainnet: {
    id: 56,
    name: 'BSC Mainnet',
    explorer: 'https://bscscan.com',
    rpcUrl: 'https://bsc-dataseed1.binance.org/',
    usdtAddress: '0x0000000000000000000000000000' as Address,
    fundCollectionPoolAddress: '0x0000000000000000000000000000000000000000' as Address,
    website: 'https://topay.foundation'
  }
};

// Set the active network (replace with your actual active network)
export const ACTIVE_NETWORK = NETWORKS.bscTestnet;

// Export contract addresses for convenience
export const USDT_CONTRACT_ADDRESS = ACTIVE_NETWORK.usdtAddress;
export const FUND_COLLECTION_POOL_CONTRACT_ADDRESS = ACTIVE_NETWORK.fundCollectionPoolAddress;