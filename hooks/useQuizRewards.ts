import { useState, useEffect, useCallback } from 'react';
import { useAccount, useContractRead, useContractWrite, useTransaction } from 'wagmi';
import { parseEther, formatEther, Address } from 'viem';
import { SNARKEL_ABI } from '../contracts/abi';
import { REWARD_TOKENS, SUPPORTED_NETWORKS, TokenConfig, NetworkConfig } from '../lib/tokens-config';

// Contract address - Replace with your deployed contract address
const SNARKEL_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SNARKEL_CONTRACT_ADDRESS as Address || '0x...';

interface QuizReward {
  tokenAddress: Address;
  tokenSymbol: string;
  tokenName: string;
  amount: bigint;
  network: string;
  chainId: number;
  isDistributed: boolean;
}

interface QuizRewardState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
  selectedToken: TokenConfig | null;
  selectedNetwork: NetworkConfig | null;
  rewardAmount: string;
  customTokenAddress: string;
}

export function useQuizRewards(contractAddress?: Address) {
  const { address: userAddress, isConnected } = useAccount();
  const [rewardState, setRewardState] = useState<QuizRewardState>({
    isLoading: false,
    error: null,
    success: false,
    selectedToken: null,
    selectedNetwork: null,
    rewardAmount: '',
    customTokenAddress: ''
  });

  const contractAddr = contractAddress || SNARKEL_CONTRACT_ADDRESS;

  // Helper function to handle reward state
  const updateRewardState = useCallback((updates: Partial<QuizRewardState>) => {
    setRewardState(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset reward state
  const resetRewardState = useCallback(() => {
    setRewardState(prev => ({
      ...prev,
      isLoading: false,
      error: null,
      success: false
    }));
  }, []);

  // Get available tokens for selected network
  const getAvailableTokens = useCallback((network: string): TokenConfig[] => {
    return REWARD_TOKENS.filter(token => token.network === network);
  }, []);

  // Get available networks
  const getAvailableNetworks = useCallback((): NetworkConfig[] => {
    return Object.values(SUPPORTED_NETWORKS);
  }, []);

  // Set selected network
  const setSelectedNetwork = useCallback((network: NetworkConfig) => {
    updateRewardState({ 
      selectedNetwork: network,
      selectedToken: null // Reset token when network changes
    });
  }, [updateRewardState]);

  // Set selected token
  const setSelectedToken = useCallback((token: TokenConfig) => {
    updateRewardState({ selectedToken: token });
  }, [updateRewardState]);

  // Set reward amount
  const setRewardAmount = useCallback((amount: string) => {
    updateRewardState({ rewardAmount: amount });
  }, [updateRewardState]);

  // Set custom token address
  const setCustomTokenAddress = useCallback((address: string) => {
    updateRewardState({ customTokenAddress: address });
  }, [updateRewardState]);

  // Validate reward configuration
  const validateRewardConfig = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!rewardState.selectedNetwork) {
      errors.push('Please select a network');
    }

    if (!rewardState.selectedToken && !rewardState.customTokenAddress) {
      errors.push('Please select a token or enter a custom token address');
    }

    if (rewardState.customTokenAddress && !rewardState.customTokenAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      errors.push('Invalid custom token address format');
    }

    if (!rewardState.rewardAmount || parseFloat(rewardState.rewardAmount) <= 0) {
      errors.push('Please enter a valid reward amount');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [rewardState]);

  // WRITE FUNCTIONS

  // Add reward to session
  const {
    writeContract: addRewardWrite,
    data: addRewardData,
    isPending: addRewardLoading
  } = useContractWrite();

  const { isLoading: addRewardTxLoading } = useTransaction({
    hash: addRewardData
  });

  const addRewardToSession = useCallback(async (sessionId: number) => {
    if (!addRewardWrite) return;
    
    const validation = validateRewardConfig();
    if (!validation.isValid) {
      updateRewardState({ error: validation.errors.join(', ') });
      return;
    }

    resetRewardState();
    updateRewardState({ isLoading: true });
    
    try {
      const tokenAddress = rewardState.selectedToken?.address || rewardState.customTokenAddress;
      const amount = parseEther(rewardState.rewardAmount);
      
      addRewardWrite({
        address: contractAddr,
        abi: SNARKEL_ABI,
        functionName: 'addReward',
        args: [BigInt(sessionId), tokenAddress as Address, amount]
      });
    } catch (error: any) {
      updateRewardState({ error: error.message, isLoading: false });
    }
  }, [addRewardWrite, resetRewardState, updateRewardState, contractAddr, rewardState, validateRewardConfig]);

  // Distribute rewards
  const {
    writeContract: distributeRewardsWrite,
    data: distributeRewardsData,
    isPending: distributeRewardsLoading
  } = useContractWrite();

  const { isLoading: distributeRewardsTxLoading } = useTransaction({
    hash: distributeRewardsData
  });

  const distributeRewards = useCallback(async (sessionId: number, tokenAddress: Address) => {
    if (!distributeRewardsWrite) return;
    
    resetRewardState();
    updateRewardState({ isLoading: true });
    
    try {
      distributeRewardsWrite({
        address: contractAddr,
        abi: SNARKEL_ABI,
        functionName: 'distributeRewards',
        args: [BigInt(sessionId), tokenAddress]
      });
    } catch (error: any) {
      updateRewardState({ error: error.message, isLoading: false });
    }
  }, [distributeRewardsWrite, resetRewardState, updateRewardState, contractAddr]);

  // Claim reward
  const {
    writeContract: claimRewardWrite,
    data: claimRewardData,
    isPending: claimRewardLoading
  } = useContractWrite();

  const { isLoading: claimRewardTxLoading } = useTransaction({
    hash: claimRewardData
  });

  const claimReward = useCallback(async (sessionId: number, tokenAddress: Address) => {
    if (!claimRewardWrite) return;
    
    resetRewardState();
    updateRewardState({ isLoading: true });
    
    try {
      claimRewardWrite({
        address: contractAddr,
        abi: SNARKEL_ABI,
        functionName: 'claimReward',
        args: [BigInt(sessionId), tokenAddress]
      });
    } catch (error: any) {
      updateRewardState({ error: error.message, isLoading: false });
    }
  }, [claimRewardWrite, resetRewardState, updateRewardState, contractAddr]);

  // READ FUNCTIONS

  // Get session rewards
  const useSessionRewards = (sessionId: number | undefined) => {
    const { data, ...rest } = useContractRead({
      address: contractAddr,
      abi: SNARKEL_ABI,
      functionName: 'getSessionRewards',
      args: sessionId ? [BigInt(sessionId)] : undefined,
      query: {
        enabled: !!contractAddr && !!sessionId
      }
    });

    const processedData = data ? data.map((reward: any) => ({
      tokenAddress: reward.tokenAddress,
      tokenSymbol: REWARD_TOKENS.find(t => t.address === reward.tokenAddress)?.symbol || 'UNKNOWN',
      tokenName: REWARD_TOKENS.find(t => t.address === reward.tokenAddress)?.name || 'Unknown Token',
      amount: reward.amount,
      network: REWARD_TOKENS.find(t => t.address === reward.tokenAddress)?.network || 'Unknown',
      chainId: REWARD_TOKENS.find(t => t.address === reward.tokenAddress)?.chainId || 0,
      isDistributed: reward.isDistributed
    })) : [];

    return { data: processedData, ...rest };
  };

  // Check if user has claimed reward
  const useHasClaimedReward = (sessionId: number | undefined, participantAddress?: Address) => {
    const participant = participantAddress || userAddress;
    return useContractRead({
      address: contractAddr,
      abi: SNARKEL_ABI,
      functionName: 'hasClaimedReward',
      args: sessionId && participant ? [BigInt(sessionId), participant] : undefined,
      query: {
        enabled: !!contractAddr && !!sessionId && !!participant
      }
    });
  };

  // Check if user is admin
  const useIsAdmin = (adminAddress?: Address) => {
    const admin = adminAddress || userAddress;
    return useContractRead({
      address: contractAddr,
      abi: SNARKEL_ABI,
      functionName: 'isAdmin',
      args: admin ? [admin] : undefined,
      query: {
        enabled: !!contractAddr && !!admin
      }
    });
  };

  // Helper functions
  const formatRewardAmount = useCallback((amount: bigint) => {
    return formatEther(amount);
  }, []);

  const isAnyTransactionLoading = 
    addRewardLoading || addRewardTxLoading ||
    distributeRewardsLoading || distributeRewardsTxLoading ||
    claimRewardLoading || claimRewardTxLoading;

  useEffect(() => {
    updateRewardState({ isLoading: isAnyTransactionLoading });
  }, [isAnyTransactionLoading, updateRewardState]);

  return {
    // Reward state
    rewardState: {
      ...rewardState,
      isLoading: rewardState.isLoading || isAnyTransactionLoading
    },
    resetRewardState,
    
    // Contract info
    contractAddress: contractAddr,
    isConnected,
    userAddress,

    // Network and token management
    getAvailableNetworks,
    getAvailableTokens,
    setSelectedNetwork,
    setSelectedToken,
    setRewardAmount,
    setCustomTokenAddress,
    validateRewardConfig,

    // Read hooks
    useSessionRewards,
    useHasClaimedReward,
    useIsAdmin,

    // Write functions
    addRewardToSession,
    distributeRewards,
    claimReward,

    // Helpers
    formatRewardAmount,
    
    // Transaction hashes for tracking
    transactions: {
      addReward: addRewardData,
      distributeRewards: distributeRewardsData,
      claimReward: claimRewardData
    }
  };
} 