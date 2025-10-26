'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  Trophy, 
  Crown, 
  Award, 
  Star, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader,
  Coins,
  ExternalLink,
  TrendingUp,
  Users,
  Target
} from 'lucide-react';

interface Participant {
  userId: string;
  walletAddress: string;
  name: string;
  score: number;
  position: number;
  timeBonus?: number;
  finalPoints?: number;
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
    error?: string;
  }>;
  totalDistributed: string;
  failedTransactions: number;
}

interface EnhancedLeaderboardProps {
  snarkelId: string;
  isQuizEnded: boolean;
  participants: Participant[];
  currentUser?: { address: string; name: string };
  rewardsEnabled: boolean;
  onDistributionComplete?: () => void;
}

export default function EnhancedLeaderboard({
  snarkelId,
  isQuizEnded,
  participants,
  currentUser,
  rewardsEnabled,
  onDistributionComplete
}: EnhancedLeaderboardProps) {
  const { address } = useAccount();
  const [distributionStatus, setDistributionStatus] = useState<DistributionStatus | null>(null);
  const [userReward, setUserReward] = useState<any>(null);
  const [isLoadingRewards, setIsLoadingRewards] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Poll for distribution status when quiz ends and rewards are enabled
  useEffect(() => {
    if (isQuizEnded && rewardsEnabled) {
      setIsLoadingRewards(true);
      fetchDistributionStatus();
      
      // Start polling every 5 seconds
      const interval = setInterval(fetchDistributionStatus, 5000);
      setPollingInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [isQuizEnded, rewardsEnabled, snarkelId]);

  // Fetch user's personal reward if available
  useEffect(() => {
    if (isQuizEnded && rewardsEnabled && address) {
      fetchUserReward();
    }
  }, [isQuizEnded, rewardsEnabled, address, snarkelId]);

  const fetchDistributionStatus = async () => {
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
            setIsLoadingRewards(false);
            onDistributionComplete?.();
          }
        }
      }
    } catch (error) {
      console.error('Error fetching distribution status:', error);
    }
  };

  const fetchUserReward = async () => {
    try {
      const response = await fetch(`/api/rewards/user/${address}/${snarkelId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserReward(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching user reward:', error);
    }
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2: return <Award className="w-5 h-5 text-gray-400" />;
      case 3: return <Trophy className="w-5 h-5 text-orange-500" />;
      default: return <Star className="w-5 h-5 text-blue-500" />;
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-400 text-white';
      case 3: return 'bg-gradient-to-r from-orange-400 to-red-500 text-white';
      default: return 'bg-white text-gray-800';
    }
  };

  const formatRewardAmount = (amount: string, symbol: string) => {
    const num = parseFloat(amount);
    return `${num.toFixed(2)} ${symbol}`;
  };

  const isCurrentUser = (participant: Participant) => {
    return currentUser && participant.walletAddress.toLowerCase() === currentUser.address.toLowerCase();
  };

  return (
    <div className="space-y-6">
      {/* Quiz Status Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-handwriting font-bold text-gray-800 mb-2">
              {isQuizEnded ? '🏆 Final Results' : '📊 Live Leaderboard'}
            </h2>
            <p className="text-gray-600">
              {isQuizEnded 
                ? 'Quiz completed! Here are the final standings.'
                : 'Real-time rankings as participants answer questions.'
              }
            </p>
          </div>
          
          {rewardsEnabled && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 rounded-lg">
              <Coins className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">Rewards Enabled</span>
            </div>
          )}
        </div>
      </div>

      {/* Distribution Status */}
      {isQuizEnded && rewardsEnabled && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          {isLoadingRewards ? (
            <div className="flex items-center gap-3">
              <Loader className="w-6 h-6 animate-spin text-green-600" />
              <div>
                <h3 className="font-handwriting font-bold text-green-800">
                  Distributing Rewards...
                </h3>
                <p className="text-green-600 text-sm">
                  Please wait while we process your rewards
                </p>
              </div>
            </div>
          ) : distributionStatus?.distributionComplete ? (
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-handwriting font-bold text-green-800">
                  Rewards Distributed Successfully!
                </h3>
                <p className="text-green-600 text-sm">
                  {distributionStatus.totalDistributed} tokens distributed to winners
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-yellow-600" />
              <div>
                <h3 className="font-handwriting font-bold text-yellow-800">
                  Preparing Rewards...
                </h3>
                <p className="text-yellow-600 text-sm">
                  Setting up reward distribution
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Personal Reward Card */}
      {userReward && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-handwriting font-bold text-gray-800 mb-2">
                🎉 Your Reward
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Position:</span>
                  <span className="font-bold text-purple-600">#{userReward.position}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Reward:</span>
                  <span className="font-bold text-green-600">
                    {formatRewardAmount(userReward.rewardAmount, userReward.tokenSymbol)}
                  </span>
                </div>
                {userReward.transactionHash && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Transaction:</span>
                    <a
                      href={`https://basescan.org/tx/${userReward.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-mono flex items-center gap-1"
                    >
                      {userReward.transactionHash.slice(0, 8)}...{userReward.transactionHash.slice(-6)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                userReward.status === 'success' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {userReward.status === 'success' ? 'Claimed' : 'Pending'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500">
          <h3 className="text-xl font-handwriting font-bold text-white">
            {isQuizEnded ? 'Final Standings' : 'Live Rankings'}
          </h3>
        </div>
        
        <div className="divide-y divide-gray-100">
          {participants.map((participant, index) => (
            <div
              key={participant.userId}
              className={`p-4 transition-all duration-300 ${
                isCurrentUser(participant) 
                  ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-500' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    getPositionColor(participant.position)
                  }`}>
                    {getPositionIcon(participant.position)}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-handwriting font-bold text-gray-800">
                        {participant.name}
                      </span>
                      {isCurrentUser(participant) && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 font-mono">
                      {participant.walletAddress.slice(0, 6)}...{participant.walletAddress.slice(-4)}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-500" />
                    <span className="text-2xl font-bold text-purple-600">
                      {participant.score}
                    </span>
                    <span className="text-gray-500">pts</span>
                  </div>
                  
                  {participant.timeBonus && (
                    <div className="text-sm text-green-600">
                      +{participant.timeBonus} time bonus
                    </div>
                  )}
                </div>
              </div>
              
              {/* Distribution Status for Winners */}
              {isQuizEnded && rewardsEnabled && distributionStatus && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {(() => {
                    const distribution = distributionStatus.distributionList.find(
                      d => d.walletAddress.toLowerCase() === participant.walletAddress.toLowerCase()
                    );
                    
                    if (distribution) {
                      return (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-medium">
                              {formatRewardAmount(distribution.rewardAmount, 'CELO')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {distribution.status === 'success' ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : distribution.status === 'failed' ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <Loader className="w-4 h-4 animate-spin text-yellow-500" />
                            )}
                            <span className={`text-xs font-medium ${
                              distribution.status === 'success' ? 'text-green-600' :
                              distribution.status === 'failed' ? 'text-red-600' :
                              'text-yellow-600'
                            }`}>
                              {distribution.status === 'success' ? 'Sent' :
                               distribution.status === 'failed' ? 'Failed' :
                               'Processing'}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Distribution Progress */}
      {isQuizEnded && rewardsEnabled && distributionStatus && (
        <div className="bg-gray-50 rounded-xl p-6">
          <h4 className="font-handwriting font-bold text-gray-800 mb-4">
            Distribution Progress
          </h4>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Successful Transactions</span>
              <span className="font-bold text-green-600">
                {distributionStatus.distributionList.filter(d => d.status === 'success').length}
              </span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Failed Transactions</span>
              <span className="font-bold text-red-600">
                {distributionStatus.distributionList.filter(d => d.status === 'failed').length}
              </span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Total Distributed</span>
              <span className="font-bold text-purple-600">
                {formatRewardAmount(distributionStatus.totalDistributed, 'CELO')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 