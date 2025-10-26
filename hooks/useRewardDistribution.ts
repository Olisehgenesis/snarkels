import { useState, useEffect, useCallback } from 'react';

interface LeaderboardEntry {
  userId: string;
  walletAddress: string;
  score: number;
  position: number;
  timeBonus: number;
  finalPoints: number;
}

interface RewardConfig {
  type: 'LINEAR' | 'QUADRATIC';
  tokenAddress: string;
  totalRewardPool?: string;
  rewardAmounts?: number[];
  totalWinners?: number;
}

interface DistributionResult {
  success: boolean;
  message: string;
  distributions: Array<{
    position: number;
    participant: string;
    walletAddress: string;
    rewardAmount: string;
    transactionHash?: string;
    status: 'pending' | 'success' | 'failed';
    error?: string;
  }>;
  totalDistributed: string;
  failedTransactions: number;
}

interface DistributionStatus {
  isDistributing: boolean;
  distributionComplete: boolean;
  distributionList: Array<{
    position: number;
    participant: string;
    walletAddress: string;
    rewardAmount: string;
    transactionHash?: string;
    status: 'pending' | 'success' | 'failed';
  }>;
  totalDistributed: string;
  failedTransactions: number;
}

export function useRewardDistribution(snarkelId: string) {
  const [isDistributing, setIsDistributing] = useState(false);
  const [distributionStatus, setDistributionStatus] = useState<DistributionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Start distribution
  const startDistribution = useCallback(async (
    sessionId: string,
    leaderboard: LeaderboardEntry[],
    rewardConfig: RewardConfig
  ) => {
    try {
      setIsDistributing(true);
      setError(null);

      const response = await fetch('/api/rewards/distribute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snarkelId,
          sessionId,
          leaderboard,
          rewardConfig
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Start polling for status updates
        startPolling();
        return data.result;
      } else {
        setError(data.error || 'Failed to start distribution');
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
      return null;
    } finally {
      setIsDistributing(false);
    }
  }, [snarkelId]);

  // Poll for distribution status
  const startPolling = useCallback(() => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/rewards/status/${snarkelId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setDistributionStatus({
              isDistributing: !data.data.isDistributed,
              distributionComplete: data.data.isDistributed,
              distributionList: data.data.distributions,
              totalDistributed: data.data.totalAmount,
              failedTransactions: data.data.failedDistributions
            });

            // Stop polling if distribution is complete
            if (data.data.isDistributed && pollingInterval) {
              clearInterval(pollingInterval);
              setPollingInterval(null);
            }
          }
        }
      } catch (error) {
        console.error('Error polling distribution status:', error);
      }
    };

    // Poll immediately, then every 5 seconds
    poll();
    const interval = setInterval(poll, 5000);
    setPollingInterval(interval);
  }, [snarkelId, pollingInterval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Get distribution status
  const getDistributionStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/rewards/status/${snarkelId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDistributionStatus({
            isDistributing: !data.data.isDistributed,
            distributionComplete: data.data.isDistributed,
            distributionList: data.data.distributions,
            totalDistributed: data.data.totalAmount,
            failedTransactions: data.data.failedDistributions
          });
          return data.data;
        }
      }
    } catch (error) {
      console.error('Error fetching distribution status:', error);
    }
    return null;
  }, [snarkelId]);

  // Get user's personal reward
  const getUserReward = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/rewards/user/${userId}/${snarkelId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return data.data;
        }
      }
    } catch (error) {
      console.error('Error fetching user reward:', error);
    }
    return null;
  }, [snarkelId]);

  return {
    isDistributing,
    distributionStatus,
    error,
    startDistribution,
    startPolling,
    stopPolling,
    getDistributionStatus,
    getUserReward
  };
} 