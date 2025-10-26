import { useState, useCallback, useEffect } from 'react';
import { 
  useAccount, 
  useSwitchChain, 
  useWriteContract, 
  useWaitForTransactionReceipt,
  useReadContract,
  useSimulateContract
} from 'wagmi';
import { 
  parseEther, 
  formatEther,
  type Address,
  type TransactionReceipt,
  createPublicClient,
  http
} from 'viem';
import type { Hex } from 'viem'
import { getReferralDataSuffix, submitDivviReferral } from '@/lib/divvi'
import { base } from 'viem/chains';
import { SNARKEL_ABI } from '../contracts/abi';
import { ERC20_ABI } from '../contracts/erc20-abi';
import { readContract } from 'viem/actions';
import { readTokenBalance, readTokenAllowance } from '../utils/contract-reader';

// Contract addresses for different networks
const getContractAddress = (chainId?: number): Address => {
  if (chainId === 8453) { // Base Mainnet
    return (process.env.NEXT_PUBLIC_SNARKEL_CONTRACT_ADDRESS_BASE || '0x17170f6ea9b5bbb5c1c2426d864c872e6fa627b7') as Address;
  } else if (chainId === 42220) { // Celo Mainnet
    return (process.env.NEXT_PUBLIC_SNARKEL_CONTRACT_ADDRESS_CELO || '0x1c89220ebf296804f1cafc51ff6ee3d5998f4e6f') as Address;
  } else {
    // Default to Base if no chainId specified
    return (process.env.NEXT_PUBLIC_SNARKEL_CONTRACT_ADDRESS_BASE || '0x17170f6ea9b5bbb5c1c2426d864c872e6fa627b7') as Address;
  }
};

interface ContractState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
  transactionHash?: string;
  receipt?: TransactionReceipt;
}

interface QuizResult {
  participant: Address;
  score: bigint;
  rewardAmount: bigint;
}

interface QuizSession {
  sessionId: bigint;
  quizCode: string;
  entryFee: bigint;
  platformFeePercentage: bigint;
  maxParticipants: bigint;
  currentParticipants: bigint;
  isActive: boolean;
  isCompleted: boolean;
  resultsSubmitted: boolean;
  createdAt: bigint;
  completedAt: bigint;
  rewardToken: Address;
  totalRewardPool: bigint;
  maxPossibleScore: bigint;
  rewardPerPoint: bigint;
}

interface QuizStats {
  totalSessions: bigint;
  totalRewardsDistributed: bigint;
  sessionId: bigint;
}

interface SessionRewardStats {
  totalDistributed: bigint;
  participantsRewarded: bigint;
  totalParticipants: bigint;
  rewardPoolRemaining: bigint;
}

interface UseQuizContractReturn {
  contractState: ContractState;
  // Quiz session management
  createSnarkelSession: (params: {
    snarkelCode: string;
    entryFeeWei: string;
    platformFeePercentage: number;
    maxParticipants: number;
    expectedRewardToken: Address;
    expectedRewardAmount: string;
  }) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  finalizeSessionRewards: (params: {
    sessionId: number;
    winners: Address[];
    amounts: string[]; // raw token units
  }) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  claimUserReward: (params: { sessionId: number; tokenAddress: Address }) => Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }>;
  addReward: (params: {
    sessionId: number;
    tokenAddress: Address;
    amount: string;
  }) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  distributeRewards: (params: {
    sessionId: number;
    tokenAddress: Address;
  }) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  fallbackDistributeRewards: (params: {
    sessionId: number;
    tokenAddress: Address;
    winners: Address[];
    amounts: string[];
  }) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  adminDistributeReward: (params: {
    sessionId: number;
    tokenAddress: Address;
    amount: string;
  }) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  // Participant management
  addParticipant: (params: {
    sessionId: number;
    participant: Address;
  }) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  batchAddParticipants: (params: {
    sessionId: number;
    participants: Address[];
  }) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  removeParticipant: (params: {
    sessionId: number;
    participant: Address;
  }) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  // Token operations
  approveToken: (params: {
    tokenAddress: Address;
    spenderAddress: Address;
    amount: string;
  }) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  transferToken: (params: {
    tokenAddress: Address;
    toAddress: Address;
    amount: string;
  }) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  // Read functions
  getTokenBalance: (tokenAddress: Address, userAddress: Address, tokenChainId?: number) => Promise<string>;
  getTokenAllowance: (tokenAddress: Address, ownerAddress: Address, spenderAddress: Address, tokenChainId?: number) => Promise<string>;
  // Security check functions
  areRewardsDistributed: (snarkelCode: string) => Promise<boolean>;
  getExpectedRewardToken: (sessionId: number) => Promise<Address>;
  getExpectedRewardAmount: (sessionId: number) => Promise<string>;
  getCurrentSessionId: () => Promise<number>;
  canStartNewSession: (snarkelCode: string) => Promise<{ canStart: boolean; lastSessionId: string; lastIsActive: boolean }>;
  getUserClaimable: (sessionId: number, user: Address) => Promise<string>;
  getUserWins: (sessionId: number, user: Address) => Promise<string>;
  resetState: () => void;
  switchToChain: (chainId: number) => Promise<boolean>;
}

export function useQuizContract(selectedChainId?: number): UseQuizContractReturn {
  const { address: userAddress, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  
  const [fallbackChainId, setFallbackChainId] = useState<number | undefined>(undefined);
  
  const [contractState, setContractState] = useState<ContractState>({
    isLoading: false,
    error: null,
    success: false
  });

  console.log('User address:', userAddress);
  console.log('Current chain ID:', chainId);
  console.log('Selected chain ID:', selectedChainId);
  console.log('Fallback chain ID:', fallbackChainId);

  useEffect(() => {
    if (chainId) {
      setFallbackChainId(chainId);
      console.log('Updated fallback chain ID to:', chainId);
    }
  }, [chainId]);

  const updateState = useCallback((updates: Partial<ContractState>) => {
    setContractState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetState = useCallback(() => {
    setContractState({
      isLoading: false,
      error: null,
      success: false
    });
  }, []);

  const ensureCorrectChain = useCallback(async (targetChainId?: number): Promise<void> => {
    try {
      const currentChainId = chainId || fallbackChainId;
      const desiredChainId = targetChainId || selectedChainId || base.id;
      
      if (!currentChainId || currentChainId !== desiredChainId) {
        console.log(`Switching to chain ${desiredChainId}. Current chain: ${currentChainId || 'undefined'}`);
        await switchChain({ chainId: desiredChainId });
        await new Promise(resolve => setTimeout(resolve, 1000));
        setFallbackChainId(desiredChainId);
      }
    } catch (error) {
      console.error('Chain switching failed:', error);
      console.warn('Chain switching failed, but continuing with operation. Please ensure you are on the correct network.');
    }
  }, [chainId, fallbackChainId, switchChain, selectedChainId]);

  // Function to manually switch to a specific chain
  const switchToChain = useCallback(async (targetChainId: number): Promise<boolean> => {
    try {
      await switchChain({ chainId: targetChainId });
      await new Promise(resolve => setTimeout(resolve, 1000));
      setFallbackChainId(targetChainId);
      return true;
    } catch (error) {
      console.error('Chain switching failed:', error);
      return false;
    }
  }, [switchChain]);

  // Create quiz session (updated function signature)
  const createSnarkelSession = useCallback(async (params: {
    snarkelCode: string;
    entryFeeWei: string;
    platformFeePercentage: number;
    maxParticipants: number;
    expectedRewardToken: Address;
    expectedRewardAmount: string;
  }): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
    try {
      resetState();
      updateState({ isLoading: true, error: null });

      if (!isConnected || !userAddress) {
        throw new Error('Wallet not connected - please connect your wallet first');
      }

      // Ensure we're on the correct chain for the operation
      await ensureCorrectChain();
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('Wallet connected:', { userAddress, chainId });
      console.log('Creating quiz session with params:', params);

      if (!params.expectedRewardToken || params.expectedRewardToken === '0x0000000000000000000000000000000000000000') {
        throw new Error('Invalid expected reward token address');
      }

      if (params.maxParticipants <= 0) {
        throw new Error('Max participants must be greater than 0');
      }

      if (params.expectedRewardAmount === '0') {
        throw new Error('Expected reward amount must be greater than 0');
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const hash = await writeContractAsync({
        address: getContractAddress(chainId),
        abi: SNARKEL_ABI,
        functionName: 'createSnarkelSession',
        args: [
          params.snarkelCode,
          BigInt(params.entryFeeWei),
          BigInt(params.platformFeePercentage),
          BigInt(params.maxParticipants),
          params.expectedRewardToken,
          BigInt(params.expectedRewardAmount)
        ],
        // @ts-ignore dataSuffix not in wagmi types yet
        dataSuffix: getReferralDataSuffix()
      });

      console.log('Transaction hash:', hash);
      updateState({ transactionHash: hash });
      updateState({ isLoading: false, success: true });

      // Submit referral asynchronously
      const finalChainId = chainId || fallbackChainId || base.id
      submitDivviReferral(hash as Hex, finalChainId).catch(() => {})

      return { success: true, transactionHash: hash };
    } catch (error: any) {
      console.error('Create quiz session error:', error);
      
      let errorMessage = error.message || 'Failed to create quiz session';
      
      if (error.message?.includes('getChainId is not a function')) {
        errorMessage = 'Wallet connection issue detected. Please try disconnecting and reconnecting your wallet.';
      } else if (error.message?.includes('Invalid expected reward token address')) {
        errorMessage = 'Invalid expected reward token address provided.';
      }
      
      updateState({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [updateState, resetState, isConnected, userAddress, writeContractAsync, ensureCorrectChain, chainId, fallbackChainId]);

  // Add reward to session
  const addReward = useCallback(async (params: {
    sessionId: number;
    tokenAddress: Address;
    amount: string;
  }): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
    try {
      resetState();
      updateState({ isLoading: true, error: null });

      if (!isConnected || !userAddress) {
        throw new Error('Wallet not connected - please connect your wallet first');
      }

      await ensureCorrectChain();
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('Adding reward to session:', params);

      const hash = await writeContractAsync({
        address: getContractAddress(chainId),
        abi: SNARKEL_ABI,
        functionName: 'addReward',
        args: [
          BigInt(params.sessionId),
          params.tokenAddress,
          BigInt(params.amount)
        ],
        // @ts-ignore dataSuffix not in wagmi types yet
        dataSuffix: getReferralDataSuffix()
      });

      console.log('Add reward transaction hash:', hash);
      updateState({ transactionHash: hash });
      updateState({ isLoading: false, success: true });

      return { success: true, transactionHash: hash };
    } catch (error: any) {
      console.error('Add reward error:', error);
      
      let errorMessage = error.message || 'Failed to add reward';
      
      if (error.message?.includes('Reward already added')) {
        errorMessage = 'Reward has already been added to this session.';
      } else if (error.message?.includes('Reward amount must be greater than 0')) {
        errorMessage = 'Reward amount must be greater than 0.';
      } else if (error.message?.includes('Token transfer failed')) {
        errorMessage = 'Token transfer failed. Please ensure you have approved the contract to spend your tokens.';
      }
      
      updateState({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [updateState, resetState, isConnected, userAddress, ensureCorrectChain, writeContractAsync, chainId, fallbackChainId]);

  // Finalize session rewards (set per-user claimables)
  const finalizeSessionRewards = useCallback(async (params: {
    sessionId: number;
    winners: Address[];
    amounts: string[];
  }): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
    try {
      resetState();
      updateState({ isLoading: true, error: null });

      if (!isConnected || !userAddress) {
        throw new Error('Wallet not connected - please connect your wallet first');
      }

      await ensureCorrectChain();
      await new Promise(resolve => setTimeout(resolve, 500));

      if (params.winners.length !== params.amounts.length) {
        throw new Error('Winners and amounts length mismatch');
      }

      const hash = await writeContractAsync({
        address: getContractAddress(chainId),
        abi: SNARKEL_ABI,
        functionName: 'finalizeSessionRewards',
        args: [BigInt(params.sessionId), params.winners, params.amounts.map(a => BigInt(a))],
        // @ts-ignore dataSuffix not in wagmi types yet
        dataSuffix: getReferralDataSuffix()
      });

      updateState({ transactionHash: hash });
      updateState({ isLoading: false, success: true });

      const finalChainId = chainId || fallbackChainId || base.id
      submitDivviReferral(hash as Hex, finalChainId).catch(() => {})

      return { success: true, transactionHash: hash };
    } catch (error: any) {
      console.error('Finalize session rewards error:', error);
      updateState({ isLoading: false, error: error.message || 'Failed to finalize rewards' });
      return { success: false, error: error.message || 'Failed to finalize rewards' };
    }
  }, [updateState, resetState, isConnected, userAddress, ensureCorrectChain, writeContractAsync, chainId, fallbackChainId]);

  // Claim user's reward for a session
  const claimUserReward = useCallback(async (params: { sessionId: number; tokenAddress: Address }): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
    try {
      resetState();
      updateState({ isLoading: true, error: null });

      if (!isConnected || !userAddress) {
        throw new Error('Wallet not connected - please connect your wallet first');
      }

      await ensureCorrectChain();
      await new Promise(resolve => setTimeout(resolve, 500));

      const hash = await writeContractAsync({
        address: getContractAddress(chainId),
        abi: SNARKEL_ABI,
        functionName: 'claimUserReward',
        args: [BigInt(params.sessionId), params.tokenAddress],
        // @ts-ignore dataSuffix not in wagmi types yet
        dataSuffix: getReferralDataSuffix()
      });

      updateState({ transactionHash: hash });
      updateState({ isLoading: false, success: true });

      const finalChainId = chainId || fallbackChainId || base.id
      submitDivviReferral(hash as Hex, finalChainId).catch(() => {})

      return { success: true, transactionHash: hash };
    } catch (error: any) {
      console.error('Claim user reward error:', error);
      updateState({ isLoading: false, error: error.message || 'Failed to claim reward' });
      return { success: false, error: error.message || 'Failed to claim reward' };
    }
  }, [updateState, resetState, isConnected, userAddress, ensureCorrectChain, writeContractAsync, chainId, fallbackChainId]);

  // Distribute rewards for a session
  const distributeRewards = useCallback(async (params: {
    sessionId: number;
    tokenAddress: Address;
  }): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
    try {
      resetState();
      updateState({ isLoading: true, error: null });

      if (!isConnected || !userAddress) {
        throw new Error('Wallet not connected - please connect your wallet first');
      }

      await ensureCorrectChain();
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('Distributing rewards for session:', params.sessionId);

      const hash = await writeContractAsync({
        address: getContractAddress(chainId),
        abi: SNARKEL_ABI,
        functionName: 'distributeRewards',
        args: [
          BigInt(params.sessionId),
          params.tokenAddress
        ],
        // @ts-ignore dataSuffix not in wagmi types yet
        dataSuffix: getReferralDataSuffix()
      });

      console.log('Distribute rewards transaction hash:', hash);
      updateState({ transactionHash: hash });
      updateState({ isLoading: false, success: true });

      const finalChainId = chainId || fallbackChainId || base.id
      submitDivviReferral(hash as Hex, finalChainId).catch(() => {})

      return { success: true, transactionHash: hash };
    } catch (error: any) {
      console.error('Distribute rewards error:', error);
      
      let errorMessage = error.message || 'Failed to distribute rewards';
      
      if (error.message?.includes('Rewards already distributed')) {
        errorMessage = 'Rewards have already been distributed for this session.';
      } else if (error.message?.includes('Session not active')) {
        errorMessage = 'Session is not active.';
      }
      
      updateState({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [updateState, resetState, isConnected, userAddress, ensureCorrectChain, writeContractAsync, chainId, fallbackChainId]);

  // Fallback distribute rewards for a session
  const fallbackDistributeRewards = useCallback(async (params: {
    sessionId: number;
    tokenAddress: Address;
    winners: Address[];
    amounts: string[];
  }): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
    try {
      resetState();
      updateState({ isLoading: true, error: null });

      if (!isConnected || !userAddress) {
        throw new Error('Wallet not connected - please connect your wallet first');
      }

      await ensureCorrectChain();
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('Fallback distributing rewards for session:', params.sessionId);

      const hash = await writeContractAsync({
        address: getContractAddress(chainId),
        abi: SNARKEL_ABI,
        functionName: 'fallbackDistributeRewards',
        args: [
          BigInt(params.sessionId),
          params.tokenAddress,
          params.winners,
          params.amounts.map(amount => BigInt(amount))
        ],
        // @ts-ignore dataSuffix not in wagmi types yet
        dataSuffix: getReferralDataSuffix()
      });

      console.log('Fallback distribute rewards transaction hash:', hash);
      updateState({ transactionHash: hash });
      updateState({ isLoading: false, success: true });

      const finalChainId = chainId || fallbackChainId || base.id
      submitDivviReferral(hash as Hex, finalChainId).catch(() => {})

      return { success: true, transactionHash: hash };
    } catch (error: any) {
      console.error('Fallback distribute rewards error:', error);
      
      let errorMessage = error.message || 'Failed to distribute rewards';
      
      if (error.message?.includes('Rewards already distributed')) {
        errorMessage = 'Rewards have already been distributed for this session.';
      } else if (error.message?.includes('Session not active')) {
        errorMessage = 'Session is not active.';
      }
      
      updateState({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [updateState, resetState, isConnected, userAddress, ensureCorrectChain, writeContractAsync, chainId, fallbackChainId]);

  // Admin distribute remaining reward
  const adminDistributeReward = useCallback(async (params: {
    sessionId: number;
    tokenAddress: Address;
    amount: string;
  }): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
    try {
      resetState();
      updateState({ isLoading: true, error: null });

      if (!isConnected || !userAddress) {
        throw new Error('Wallet not connected - please connect your wallet first');
      }

      await ensureCorrectChain();
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('Admin distributing remaining reward for session:', params.sessionId);

      const hash = await writeContractAsync({
        address: getContractAddress(chainId),
        abi: SNARKEL_ABI,
        functionName: 'adminDistributeReward',
        args: [
          BigInt(params.sessionId),
          params.tokenAddress,
          BigInt(params.amount)
        ],
        // @ts-ignore dataSuffix not in wagmi types yet
        dataSuffix: getReferralDataSuffix()
      });

      console.log('Admin distribute remaining reward transaction hash:', hash);
      updateState({ transactionHash: hash });
      updateState({ isLoading: false, success: true });

      const finalChainId = chainId || fallbackChainId || base.id
      submitDivviReferral(hash as Hex, finalChainId).catch(() => {})

      return { success: true, transactionHash: hash };
    } catch (error: any) {
      console.error('Admin distribute remaining reward error:', error);
      updateState({ isLoading: false, error: error.message || 'Failed to distribute remaining reward' });
      return { success: false, error: error.message || 'Failed to distribute remaining reward' };
    }
  }, [updateState, resetState, isConnected, userAddress, ensureCorrectChain, writeContractAsync, chainId, fallbackChainId]);

  // Add participant (admin function)
  const addParticipant = useCallback(async (params: {
    sessionId: number;
    participant: Address;
  }): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
    try {
      resetState();
      updateState({ isLoading: true, error: null });

      if (!isConnected || !userAddress) {
        throw new Error('Wallet not connected');
      }

      await ensureCorrectChain();
      await new Promise(resolve => setTimeout(resolve, 500));

      const hash = await writeContractAsync({
        address: getContractAddress(chainId),
        abi: SNARKEL_ABI,
        functionName: 'addParticipant',
        args: [BigInt(params.sessionId), params.participant],
        // @ts-ignore dataSuffix not in wagmi types yet
        dataSuffix: getReferralDataSuffix()
      });

      updateState({ transactionHash: hash });
      updateState({ isLoading: false, success: true });

      const finalChainId = chainId || fallbackChainId || base.id
      submitDivviReferral(hash as Hex, finalChainId).catch(() => {})

      return { success: true, transactionHash: hash };
    } catch (error: any) {
      console.error('Add participant error:', error);
      updateState({ isLoading: false, error: error.message || 'Failed to add participant' });
      return { success: false, error: error.message || 'Failed to add participant' };
    }
  }, [updateState, resetState, isConnected, userAddress, ensureCorrectChain, writeContractAsync, chainId, fallbackChainId]);

  // Batch add participants (admin function)
  const batchAddParticipants = useCallback(async (params: {
    sessionId: number;
    participants: Address[];
  }): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
    try {
      resetState();
      updateState({ isLoading: true, error: null });

      if (!isConnected || !userAddress) {
        throw new Error('Wallet not connected');
      }

      await ensureCorrectChain();
      await new Promise(resolve => setTimeout(resolve, 500));

      const hash = await writeContractAsync({
        address: getContractAddress(chainId),
        abi: SNARKEL_ABI,
        functionName: 'batchAddParticipants',
        args: [BigInt(params.sessionId), params.participants],
        // @ts-ignore dataSuffix not in wagmi types yet
        dataSuffix: getReferralDataSuffix()
      });

      updateState({ transactionHash: hash });
      updateState({ isLoading: false, success: true });

      const finalChainId = chainId || fallbackChainId || base.id
      submitDivviReferral(hash as Hex, finalChainId).catch(() => {})

      return { success: true, transactionHash: hash };
    } catch (error: any) {
      console.error('Batch add participants error:', error);
      updateState({ isLoading: false, error: error.message || 'Failed to add participants' });
      return { success: false, error: error.message || 'Failed to add participants' };
    }
  }, [updateState, resetState, isConnected, userAddress, ensureCorrectChain, writeContractAsync, chainId, fallbackChainId]);

  // Remove participant (admin function)
  const removeParticipant = useCallback(async (params: {
    sessionId: number;
    participant: Address;
  }): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
    try {
      resetState();
      updateState({ isLoading: true, error: null });

      if (!isConnected || !userAddress) {
        throw new Error('Wallet not connected');
      }

      await ensureCorrectChain();
      await new Promise(resolve => setTimeout(resolve, 500));

      const hash = await writeContractAsync({
        address: getContractAddress(chainId),
        abi: SNARKEL_ABI,
        functionName: 'removeParticipant',
        args: [BigInt(params.sessionId), params.participant],
        // @ts-ignore dataSuffix not in wagmi types yet
        dataSuffix: getReferralDataSuffix()
      });

      updateState({ transactionHash: hash });
      updateState({ isLoading: false, success: true });

      const finalChainId = chainId || fallbackChainId || base.id
      submitDivviReferral(hash as Hex, finalChainId).catch(() => {})

      return { success: true, transactionHash: hash };
    } catch (error: any) {
      console.error('Remove participant error:', error);
      updateState({ isLoading: false, error: error.message || 'Failed to remove participant' });
      return { success: false, error: error.message || 'Failed to remove participant' };
    }
  }, [updateState, resetState, isConnected, userAddress, ensureCorrectChain, writeContractAsync, chainId, fallbackChainId]);

  // Token operations (keeping existing implementations)
  const approveToken = useCallback(async (params: {
    tokenAddress: Address;
    spenderAddress: Address;
    amount: string;
  }): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
    try {
      resetState();
      updateState({ isLoading: true, error: null });

      if (!isConnected || !userAddress) {
        throw new Error('Wallet not connected - please connect your wallet first');
      }

      await ensureCorrectChain();
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('Approving token:', params);

      const hash = await writeContractAsync({
        address: params.tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [params.spenderAddress, BigInt(params.amount)],
        // @ts-ignore dataSuffix not in wagmi types yet
        dataSuffix: getReferralDataSuffix()
      });

      console.log('Approve transaction hash:', hash);
      updateState({ transactionHash: hash });
      updateState({ isLoading: false, success: true });

      const finalChainId = chainId || fallbackChainId || base.id
      submitDivviReferral(hash as Hex, finalChainId).catch(() => {})

      return { success: true, transactionHash: hash };
    } catch (error: any) {
      console.error('Approve token error:', error);
      
      let errorMessage = error.message || 'Failed to approve token';
      
      if (error.message?.includes('getChainId is not a function')) {
        errorMessage = 'Wallet connection issue detected. Please try disconnecting and reconnecting your wallet.';
      }
      
      updateState({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [updateState, resetState, isConnected, userAddress, ensureCorrectChain, writeContractAsync, chainId, fallbackChainId]);

  const transferToken = useCallback(async (params: {
    tokenAddress: Address;
    toAddress: Address;
    amount: string;
  }): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
    try {
      resetState();
      updateState({ isLoading: true, error: null });

      if (!isConnected || !userAddress) {
        throw new Error('Wallet not connected - please connect your wallet first');
      }

      await ensureCorrectChain();
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('Transferring token:', params);

      const hash = await writeContractAsync({
        address: params.tokenAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [params.toAddress, BigInt(params.amount)],
        // @ts-ignore dataSuffix not in wagmi types yet
        dataSuffix: getReferralDataSuffix()
      });

      console.log('Transfer transaction hash:', hash);
      updateState({ transactionHash: hash });
      updateState({ isLoading: false, success: true });

      const finalChainId = chainId || fallbackChainId || base.id
      submitDivviReferral(hash as Hex, finalChainId).catch(() => {})

      return { success: true, transactionHash: hash };
    } catch (error: any) {
      console.error('Transfer token error:', error);
      
      let errorMessage = error.message || 'Failed to transfer token';
      
      if (error.message?.includes('getChainId is not a function')) {
        errorMessage = 'Wallet connection issue detected. Please try disconnecting and reconnecting your wallet.';
      }
      
      updateState({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [updateState, resetState, isConnected, userAddress, ensureCorrectChain, writeContractAsync, chainId, fallbackChainId]);

  // Read functions using createPublicClient
  const getTokenBalance = useCallback(async (tokenAddress: Address, userAddress: Address, tokenChainId?: number): Promise<string> => {
    try {
      const targetChainId = tokenChainId || base.id;
      console.log(`Checking token balance on chain ${targetChainId} for token ${tokenAddress}`);
      
      const balance = await readTokenBalance(tokenAddress, userAddress, targetChainId);
      const formattedBalance = formatEther(BigInt(balance));
      console.log(`Token balance: ${formattedBalance}`);
      return formattedBalance;
    } catch (error: any) {
      console.error('Get token balance error:', error);
      return '0';
    }
  }, []);

  const getTokenAllowance = useCallback(async (
    tokenAddress: Address, 
    ownerAddress: Address, 
    spenderAddress: Address,
    tokenChainId?: number
  ): Promise<string> => {
    try {
      const targetChainId = tokenChainId || base.id;
      console.log(`Checking token allowance on chain ${targetChainId} for token ${tokenAddress}`);
      
      const allowance = await readTokenAllowance(tokenAddress, ownerAddress, spenderAddress, targetChainId);
      const formattedAllowance = formatEther(BigInt(allowance));
      console.log(`Token allowance: ${formattedAllowance}`);
      return formattedAllowance;
    } catch (error: any) {
      console.error('Get token allowance error:', error);
      return '0';
    }
  }, []);

  // Security check functions
  const areRewardsDistributed = useCallback(async (snarkelCode: string): Promise<boolean> => {
    try {
      const client = createPublicClient({
        chain: base,
        transport: http()
      });

      const result = await readContract(client, {
        address: getContractAddress(chainId),
        abi: SNARKEL_ABI,
        functionName: 'areRewardsDistributed',
        args: [snarkelCode]
      }) as boolean;

      return result;
    } catch (error: any) {
      console.error('Are rewards distributed error:', error);
      return false;
    }
  }, [chainId]);

  const getExpectedRewardToken = useCallback(async (sessionId: number): Promise<Address> => {
    try {
      const client = createPublicClient({
        chain: base,
        transport: http()
      });

      const result = await readContract(client, {
        address: getContractAddress(chainId),
        abi: SNARKEL_ABI,
        functionName: 'getRewardTokenAddress',
        args: [BigInt(sessionId)]
      }) as Address;

      return result;
    } catch (error: any) {
      console.error('Get expected reward token error:', error);
      return '0x0000000000000000000000000000000000000000' as Address;
    }
  }, [chainId]);

  const getExpectedRewardAmount = useCallback(async (sessionId: number): Promise<string> => {
    try {
      const client = createPublicClient({
        chain: base,
        transport: http()
      });

      const result = await readContract(client, {
        address: getContractAddress(chainId),
        abi: SNARKEL_ABI,
        functionName: 'getExpectedRewardAmount',
        args: [BigInt(sessionId)]
      }) as bigint;

      return result.toString();
    } catch (error: any) {
      console.error('Get expected reward amount error:', error);
      return '0';
    }
  }, [chainId]);

  const getCurrentSessionId = useCallback(async (): Promise<number> => {
    try {
      const client = createPublicClient({
        chain: base,
        transport: http()
      });

      const result = await readContract(client, {
        address: getContractAddress(chainId),
        abi: SNARKEL_ABI,
        functionName: 'getCurrentSessionId',
        args: []
      }) as bigint;

      return Number(result);
    } catch (error: any) {
      console.error('Get current session ID error:', error);
      return 0;
    }
  }, [chainId]);

  const canStartNewSession = useCallback(async (snarkelCode: string): Promise<{ canStart: boolean; lastSessionId: string; lastIsActive: boolean }> => {
    try {
      const client = createPublicClient({
        chain: base,
        transport: http()
      });

      const result = await readContract(client, {
        address: getContractAddress(chainId),
        abi: SNARKEL_ABI,
        functionName: 'canStartNewSession',
        args: [snarkelCode]
      }) as readonly [boolean, bigint, boolean];

      const [canStart, lastSessionId, lastIsActive] = result;
      return { canStart, lastSessionId: lastSessionId.toString(), lastIsActive };
    } catch (error: any) {
      console.error('canStartNewSession error:', error);
      return { canStart: true, lastSessionId: '0', lastIsActive: false };
    }
  }, [chainId]);

  const getUserClaimable = useCallback(async (sessionId: number, user: Address): Promise<string> => {
    try {
      const client = createPublicClient({
        chain: base,
        transport: http()
      });

      const result = await readContract(client, {
        address: getContractAddress(chainId),
        abi: SNARKEL_ABI,
        functionName: 'getUserClaimable',
        args: [BigInt(sessionId), user]
      }) as bigint;

      return result.toString();
    } catch (error: any) {
      console.error('getUserClaimable error:', error);
      return '0';
    }
  }, [chainId]);

  const getUserWins = useCallback(async (sessionId: number, user: Address): Promise<string> => {
    try {
      const client = createPublicClient({
        chain: base,
        transport: http()
      });

      const result = await readContract(client, {
        address: getContractAddress(chainId),
        abi: SNARKEL_ABI,
        functionName: 'getUserWins',
        args: [BigInt(sessionId), user]
      }) as bigint;

      return result.toString();
    } catch (error: any) {
      console.error('getUserWins error:', error);
      return '0';
    }
  }, [chainId]);

  return {
    contractState,
    // Quiz session management
    createSnarkelSession,
    addReward,
    distributeRewards,
    fallbackDistributeRewards,
    finalizeSessionRewards,
    claimUserReward,
    adminDistributeReward,
    // Participant management
    addParticipant,
    batchAddParticipants,
    removeParticipant,
    // Token operations
    approveToken,
    transferToken,
    // Read functions
    getTokenBalance,
    getTokenAllowance,
    // Security check functions
    areRewardsDistributed,
    getExpectedRewardToken,
    getExpectedRewardAmount,
    getCurrentSessionId,
    canStartNewSession,
    getUserClaimable,
    getUserWins,
    resetState,
    switchToChain
  };
}