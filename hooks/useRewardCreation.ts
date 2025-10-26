import { useState, useCallback } from 'react';
import { useQuizContract } from './useViemContract';
import { Address } from 'viem';

interface RewardConfig {
  enabled: boolean;
  type: 'LINEAR' | 'QUADRATIC';
  tokenAddress: string;
  chainId: number;
  totalWinners?: number;
  rewardAmounts?: number[];
  totalRewardPool?: string;
  minParticipants?: number;
  pointsWeight?: number;
}

interface CreationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  error?: string;
}

interface UseRewardCreationReturn {
  steps: CreationStep[];
  currentStep: number;
  isCreating: boolean;
  error: string | null;
  createRewardSession: (snarkelId: string, rewardConfig: RewardConfig) => Promise<{ success: boolean; sessionId?: string; error?: string }>;
  resetCreation: () => void;
}

export const useRewardCreation = (): UseRewardCreationReturn => {
  const [steps, setSteps] = useState<CreationStep[]>([
    {
      id: 'create-quiz',
      title: 'Create Quiz',
      description: 'Creating quiz in database',
      status: 'pending',
    },
    {
      id: 'validate-token',
      title: 'Validate Token',
      description: 'Validating reward token on blockchain',
      status: 'pending',
    },
    {
      id: 'deploy-session',
      title: 'Deploy Session',
      description: 'Creating smart contract session',
      status: 'pending',
    },
    {
      id: 'update-database',
      title: 'Update Database',
      description: 'Storing onchain reference',
      status: 'pending',
    },
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createSnarkelSession, contractState } = useQuizContract();

  const updateStep = useCallback((stepIndex: number, updates: Partial<CreationStep>) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, ...updates } : step
    ));
  }, []);

  const createRewardSession = useCallback(async (
    snarkelId: string, 
    rewardConfig: RewardConfig
  ): Promise<{ success: boolean; sessionId?: string; error?: string }> => {
    setIsCreating(true);
    setError(null);
    setCurrentStep(0);

    try {
      // Step 1: Create quiz in database (already done, just mark as completed)
      updateStep(0, { status: 'loading' });
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for UX
      updateStep(0, { status: 'completed' });
      setCurrentStep(1);

      // Step 2: Validate token on blockchain
      updateStep(1, { status: 'loading' });
      try {
        const tokenResponse = await fetch('/api/token/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenAddress: rewardConfig.tokenAddress,
            chainId: rewardConfig.chainId,
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error('Token validation request failed');
        }

        const tokenData = await tokenResponse.json();
        if (!tokenData.isValid) {
          throw new Error(tokenData.error || 'Invalid token address');
        }

        updateStep(1, { status: 'completed' });
        setCurrentStep(2);
      } catch (error: any) {
        updateStep(1, { status: 'error', error: error.message });
        throw error;
      }

      // Step 3: Deploy smart contract session
      updateStep(2, { status: 'loading' });
      try {
        // Calculate entry fee based on reward type
        let entryFeeWei = '0';
        
        if (rewardConfig.type === 'LINEAR') {
          // For linear rewards, sum up all reward amounts
          const totalReward = rewardConfig.rewardAmounts?.reduce((sum, amount) => sum + amount, 0) || 0;
          entryFeeWei = (totalReward * 1e18).toString();
        } else if (rewardConfig.type === 'QUADRATIC') {
          // For quadratic rewards, use the total reward pool
          entryFeeWei = rewardConfig.totalRewardPool 
            ? (parseFloat(rewardConfig.totalRewardPool) * 1e18).toString()
            : '0';
        }

        // Create session with proper parameters
        const sessionResult = await createSnarkelSession({
          snarkelCode: snarkelId,
          entryFeeWei: entryFeeWei,
          platformFeePercentage: 5,
          maxParticipants: 100,
          expectedRewardToken: rewardConfig.tokenAddress as `0x${string}`,
          expectedRewardAmount: entryFeeWei // Use the calculated amount as expected reward
        });

        if (contractState.error) {
          throw new Error(contractState.error);
        }

        updateStep(2, { status: 'completed' });
        setCurrentStep(3);
      } catch (error: any) {
        updateStep(2, { status: 'error', error: error.message });
        throw error;
      }

      // Step 4: Update database with onchain reference
      updateStep(3, { status: 'loading' });
      try {
        const updateResponse = await fetch('/api/snarkel/update-rewards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            snarkelId,
            rewardConfig,
            onchainSessionId: contractState.success ? 'session_id' : null, // Get from contract
          }),
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to update database');
        }

        updateStep(3, { status: 'completed' });
        setCurrentStep(4);

        return { success: true, sessionId: 'session_id' };
      } catch (error: any) {
        updateStep(3, { status: 'error', error: error.message });
        throw error;
      }

    } catch (error: any) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsCreating(false);
    }
  }, [updateStep, createSnarkelSession, contractState]);

  const resetCreation = useCallback(() => {
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending', error: undefined })));
    setCurrentStep(0);
    setIsCreating(false);
    setError(null);
  }, []);

  return {
    steps,
    currentStep,
    isCreating,
    error,
    createRewardSession,
    resetCreation,
  };
}; 