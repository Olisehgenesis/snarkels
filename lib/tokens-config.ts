export interface TokenConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  network: string;
  chainId: number;
  logoUrl?: string;
  isStablecoin?: boolean;
  isNative?: boolean;
}

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// Supported networks
export const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
  celo: {
    name: 'Celo',
    chainId: 42220,
    rpcUrl: 'https://forno.celo.org',
    blockExplorer: 'https://celoscan.io',
    nativeCurrency: {
      name: 'Celo',
      symbol: 'CELO',
      decimals: 18,
    },
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  }
};

// Entry fee tokens (spam control)
export const ENTRY_FEE_TOKENS: TokenConfig[] = [
  // SNARKEL tokens (moved to top for priority)
  {
    address: '0xe75a890ad702b14b7935bc1ba81067f2b93f35d0',
    symbol: 'SNARKEL',
    name: 'Snarkel Token (Base)',
    decimals: 18,
    network: 'Base',
    chainId: 8453,
  },
  {
    address: '0xf18e87167db07da9160d790d87dc9d39e8147e4d',
    symbol: 'SNARKEL',
    name: 'Snarkel Token (Celo)',
    decimals: 18,
    network: 'Celo',
    chainId: 42220,
  },
  
  // Base Network
  {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    name: 'USD Coin (Base)',
    decimals: 6,
    network: 'Base',
    chainId: 8453,
    isStablecoin: true,
  },
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ether (Base)',
    decimals: 18,
    network: 'Base',
    chainId: 8453,
    isNative: true,
  },
  
  // Celo Network
  {
    address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    symbol: 'cUSD',
    name: 'Celo Dollar',
    decimals: 18,
    network: 'Celo',
    chainId: 42220,
    isStablecoin: true,
  },
  {
    address: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
    symbol: 'cEUR',
    name: 'Celo Euro',
    decimals: 18,
    network: 'Celo',
    chainId: 42220,
    isStablecoin: true,
  },
  {
    address: '0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787',
    symbol: 'cREAL',
    name: 'Celo Real',
    decimals: 18,
    network: 'Celo',
    chainId: 42220,
    isStablecoin: true,
  },
];

// Reward tokens (more comprehensive list including native tokens and popular tokens)
export const REWARD_TOKENS: TokenConfig[] = [
  // SNARKEL tokens (moved to top for priority)
  {
    address: '0xe75a890ad702b14b7935bc1ba81067f2b93f35d0',
    symbol: 'SNARKEL',
    name: 'Snarkel Token (Base)',
    decimals: 18,
    network: 'Base',
    chainId: 8453,
  },
  {
    address: '0xf18e87167db07da9160d790d87dc9d39e8147e4d',
    symbol: 'SNARKEL',
    name: 'Snarkel Token (Celo)',
    decimals: 18,
    network: 'Celo',
    chainId: 42220,
  },
  
  // Base Network tokens
  {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    name: 'USD Coin (Base)',
    decimals: 6,
    network: 'Base',
    chainId: 8453,
    isStablecoin: true,
  },
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ether (Base)',
    decimals: 18,
    network: 'Base',
    chainId: 8453,
    isNative: true,
  },
  
  // Celo Network tokens
  {
    address: '0x471EcE3750Da237f93B8E339c536989b8978a438',
    symbol: 'CELO',
    name: 'Celo Native Token',
    decimals: 18,
    network: 'Celo',
    chainId: 42220,
    isNative: true,
  },
  {
    address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    symbol: 'cUSD',
    name: 'Celo Dollar',
    decimals: 18,
    network: 'Celo',
    chainId: 42220,
    isStablecoin: true,
  },
  {
    address: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
    symbol: 'cEUR',
    name: 'Celo Euro',
    decimals: 18,
    network: 'Celo',
    chainId: 42220,
    isStablecoin: true,
  },
  {
    address: '0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787',
    symbol: 'cREAL',
    name: 'Celo Real',
    decimals: 18,
    network: 'Celo',
    chainId: 42220,
    isStablecoin: true,
  },
  
  // Popular DeFi tokens on Celo
  {
    address: '0x00Be915B9dCf56a3CBE739D9B9c202ca692409EC',
    symbol: 'UBE',
    name: 'Ubeswap Token',
    decimals: 18,
    network: 'Celo',
    chainId: 42220,
  },
  {
    address: '0x32A9FE697a32135BFd313a6Ac28792DaE4D9979d',
    symbol: 'cMCO2',
    name: 'Celo Moss Carbon Credit',
    decimals: 18,
    network: 'Celo',
    chainId: 42220,
  },
  
  // Custom token option
  {
    address: 'custom',
    symbol: 'CUSTOM',
    name: 'Custom Token',
    decimals: 18,
    network: 'Custom',
    chainId: 0,
  },
];

// Helper functions
export function getTokensByNetwork(network: string): TokenConfig[] {
  return REWARD_TOKENS.filter(token => token.network === network);
}

export function getEntryFeeTokensByNetwork(network: string): TokenConfig[] {
  return ENTRY_FEE_TOKENS.filter(token => token.network === network);
}

export function findToken(address: string, network: string): TokenConfig | undefined {
  return REWARD_TOKENS.find(token => 
    token.address.toLowerCase() === address.toLowerCase() && 
    token.network === network
  );
}

export function getNetworkByChainId(chainId: number): NetworkConfig | undefined {
  return Object.values(SUPPORTED_NETWORKS).find(network => network.chainId === chainId);
}

export function isStablecoin(tokenSymbol: string): boolean {
  const stablecoins = ['USDC', 'USDT', 'DAI', 'cUSD', 'cEUR', 'cREAL', 'BUSD', 'FRAX'];
  return stablecoins.includes(tokenSymbol.toUpperCase());
}

// Default entry fee configurations
export const DEFAULT_ENTRY_FEES = {
  'Base': {
    amount: '0.5',
    token: ENTRY_FEE_TOKENS.find(t => t.symbol === 'USDC' && t.network === 'Base')!
  },
  'Celo': {
    amount: '0.5',
    token: ENTRY_FEE_TOKENS.find(t => t.symbol === 'cUSD' && t.network === 'Celo')!
  },
};

// SNARKEL token configurations for each network
export const SNARKEL_TOKENS = {
  'Celo': {
    address: '0xf18e87167db07da9160d790d87dc9d39e8147e4d',
    symbol: 'SNARKEL',
    name: 'Snarkel Token (Celo)',
    decimals: 18,
    chainId: 42220,
  },
  'Base': {
    address: '0xe75a890ad702b14b7935bc1ba81067f2b93f35d0',
    symbol: 'SNARKEL',
    name: 'Snarkel Token (Base)',
    decimals: 18,
    chainId: 8453,
  },
}; 