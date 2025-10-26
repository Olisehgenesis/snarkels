'use client';

import React, { useState, useEffect } from 'react';
import { X, Trophy, Target, Zap, Plus, Trash2, Coins, Users, Award, Info, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { TokenSelector } from './TokenSelector';
import { ChainSelector } from './ChainSelector';
import { EnhancedTokenSelector } from './EnhancedTokenSelector'

interface QuizRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  snarkelCode?: string;
}

interface RewardConfig {
  enabled: boolean;
  type: 'LINEAR' | 'QUADRATIC' | 'CUSTOM';
  tokenAddress: string;
  chainId: number;
  tokenSymbol?: string;
  tokenName?: string;
  tokenDecimals?: number;
  network?: string;
  totalWinners?: number;
  rewardAmounts?: number[];
  totalRewardPool?: string;
  minParticipants?: number;
  pointsWeight?: number;
  rewardAllParticipants?: boolean;
}

interface BlockchainStatus {
  isOnBlockchain: boolean;
  currentChain?: number;
  sessionId?: string;
  hasRewards: boolean;
}

export const QuizRewardsModal: React.FC<QuizRewardsModalProps> = ({
  isOpen,
  onClose,
  snarkelCode
}) => {
  const [quizCode, setQuizCode] = useState(snarkelCode || '');
  const [blockchainStatus, setBlockchainStatus] = useState<BlockchainStatus | null>(null);
  const [isCheckingBlockchain, setIsCheckingBlockchain] = useState(false);
  const [rewardConfig, setRewardConfig] = useState<RewardConfig>({
    enabled: false,
    type: 'QUADRATIC',
    tokenAddress: '',
    chainId: 8453, // Default to Base
    tokenSymbol: 'USDC',
    tokenName: 'USD Coin',
    tokenDecimals: 6,
    network: 'Base',
    totalWinners: 5,
    rewardAmounts: [35, 25, 20, 15, 5],
    totalRewardPool: '1000',
    minParticipants: 3,
    pointsWeight: 0.7,
    rewardAllParticipants: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Popular token presets
  const TOKEN_PRESETS = {
    42220: { // Celo Mainnet
      'USDC': '0x765DE816845861e75A25fCA122bb6898B8B1282a',
      'cUSD': '0x765DE816845861e75A25fCA122bb6898B8B1282a',
      'CELO': '0x471EcE3750Da237f93B8E339c536989b8978a438',
    },
    8453: { // Base
      'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      'ETH': '0x0000000000000000000000000000000000000000',
    }
  };

  // Default reward amounts for different winner counts
  const DEFAULT_REWARDS = {
    1: [100],
    2: [60, 40],
    3: [50, 30, 20],
    4: [40, 25, 20, 15],
    5: [35, 25, 20, 15, 5],
  };

  useEffect(() => {
    if (snarkelCode) {
      setQuizCode(snarkelCode);
      checkBlockchainStatus(snarkelCode);
    }
  }, [snarkelCode]);

  const checkBlockchainStatus = async (code: string) => {
    if (!code.trim()) return;
    
    setIsCheckingBlockchain(true);
    setError(null);
    
    try {
      // Check if quiz exists and has blockchain status
      const response = await fetch('/api/snarkel/blockchain-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snarkelCode: code })
      });
      
      if (response.ok) {
        const data = await response.json();
        setBlockchainStatus(data.status);
        
        // If already has rewards, populate the form
        if (data.status.hasRewards && data.rewardConfig) {
          setRewardConfig(data.rewardConfig);
        }
      } else {
        setBlockchainStatus({
          isOnBlockchain: false,
          hasRewards: false
        });
      }
    } catch (error) {
      console.error('Error checking blockchain status:', error);
      setError('Failed to check blockchain status');
      setBlockchainStatus({
        isOnBlockchain: false,
        hasRewards: false
      });
    } finally {
      setIsCheckingBlockchain(false);
    }
  };

  const handleQuizCodeChange = (code: string) => {
    setQuizCode(code);
    if (code.trim()) {
      checkBlockchainStatus(code);
    } else {
      setBlockchainStatus(null);
    }
  };

  const updateRewardConfig = (updates: Partial<RewardConfig>) => {
    setRewardConfig(prev => ({ ...prev, ...updates }));
  };

  const handleRewardsToggle = (enabled: boolean) => {
    if (enabled) {
      updateRewardConfig({ 
        enabled,
        type: 'QUADRATIC',
        totalWinners: 5,
        totalRewardPool: '1000',
        minParticipants: 3,
        pointsWeight: 0.7,
        rewardAllParticipants: false
      });
    } else {
      updateRewardConfig({ enabled });
    }
  };

  const handleChainChange = (chainId: number) => {
    updateRewardConfig({ 
      chainId,
      tokenAddress: '' // Reset token when chain changes
    });
  };

  const handlePresetToken = (tokenName: string) => {
    const presets = TOKEN_PRESETS[rewardConfig.chainId as keyof typeof TOKEN_PRESETS];
    if (presets && presets[tokenName as keyof typeof presets]) {
      updateRewardConfig({ tokenAddress: presets[tokenName as keyof typeof presets] });
    }
  };

  const handleWinnersChange = (totalWinners: number) => {
    updateRewardConfig({ 
      totalWinners,
      rewardAmounts: DEFAULT_REWARDS[totalWinners as keyof typeof DEFAULT_REWARDS] || [100]
    });
  };

  const handleRewardAmountChange = (index: number, value: number) => {
    const newAmounts = [...(rewardConfig.rewardAmounts || [])];
    newAmounts[index] = value;
    updateRewardConfig({ rewardAmounts: newAmounts });
  };

  const handleSubmit = async () => {
    if (!quizCode.trim()) {
      setError('Please enter a quiz code');
      return;
    }

    if (!rewardConfig.enabled) {
      setError('Please enable rewards');
      return;
    }

    if (!rewardConfig.tokenAddress.trim()) {
      setError('Please select a reward token');
      return;
    }

    if (!rewardConfig.totalRewardPool || rewardConfig.totalRewardPool === '0') {
      setError('Please enter a total reward pool amount');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/snarkel/add-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snarkelCode: quizCode,
          rewardConfig,
          blockchainStatus
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Rewards added successfully!');
        setTimeout(() => {
          onClose();
          setSuccess(null);
        }, 2000);
      } else {
        setError(data.error || 'Failed to add rewards');
      }
    } catch (error) {
      console.error('Error adding rewards:', error);
      setError('Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6" />
              <div>
                <h3 className="font-handwriting text-xl font-bold">Add Quiz Rewards</h3>
                <p className="text-purple-100 text-sm">Configure rewards for existing quizzes</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quiz Code Input */}
          <div>
            <label className="block font-handwriting text-sm font-medium text-gray-700 mb-2">
              🎯 Quiz Code
            </label>
            <input
              type="text"
              value={quizCode}
              onChange={(e) => handleQuizCodeChange(e.target.value)}
              placeholder="Enter quiz code to check..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-handwriting"
            />
          </div>

          {/* Blockchain Status */}
          {isCheckingBlockchain && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-handwriting text-sm">Checking blockchain status...</span>
            </div>
          )}

          {blockchainStatus && (
            <div className={`p-4 rounded-lg border ${
              blockchainStatus.isOnBlockchain 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start gap-3">
                {blockchainStatus.isOnBlockchain ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 className="font-handwriting font-medium text-gray-900 mb-1">
                    {blockchainStatus.isOnBlockchain ? 'Quiz Found on Blockchain' : 'Quiz Not on Blockchain'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {blockchainStatus.isOnBlockchain 
                      ? `Chain ID: ${blockchainStatus.currentChain} | Session ID: ${blockchainStatus.sessionId}`
                      : 'This quiz needs to be transferred to blockchain before adding rewards'
                    }
                  </p>
                  {blockchainStatus.hasRewards && (
                    <p className="text-sm text-blue-600 mt-1">
                      ⚠️ This quiz already has rewards configured
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rewards Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="checkbox"
                id="enableRewards"
                checked={rewardConfig.enabled}
                onChange={(e) => handleRewardsToggle(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="enableRewards" className="font-handwriting text-sm font-medium text-gray-700">
                💰 Enable rewards for this quiz
              </label>
            </div>

            {rewardConfig.enabled && (
              <div className="space-y-6 p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                {/* Network Selection */}
                <ChainSelector
                  value={rewardConfig.chainId}
                  onChange={handleChainChange}
                  disabled={isSubmitting}
                />

                {/* Token Selection */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block font-handwriting text-sm font-medium text-gray-700 mb-2">
                      💰 Reward Token Address
                    </label>
                    
                    {/* Token Presets */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {TOKEN_PRESETS[rewardConfig.chainId as keyof typeof TOKEN_PRESETS] && 
                        Object.keys(TOKEN_PRESETS[rewardConfig.chainId as keyof typeof TOKEN_PRESETS]).map((tokenName) => (
                          <button
                            key={tokenName}
                            onClick={() => handlePresetToken(tokenName)}
                            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-handwriting text-sm flex items-center gap-1"
                          >
                            <Coins className="w-3 h-3" />
                            {tokenName}
                          </button>
                        ))
                      }
                    </div>
                    
                    <EnhancedTokenSelector
                      value={rewardConfig.tokenAddress}
                      onChange={(address, tokenInfo) => {
                        if (tokenInfo) {
                          updateRewardConfig({ 
                            tokenAddress: address,
                            tokenSymbol: tokenInfo.symbol,
                            tokenName: tokenInfo.name,
                            tokenDecimals: tokenInfo.decimals
                          });
                        } else {
                          updateRewardConfig({ tokenAddress: address });
                        }
                      }}
                      chainId={rewardConfig.chainId}
                      disabled={isSubmitting}
                      showBalance={true}
                    />
                  </div>
                </div>

                {/* Reward Distribution Strategy */}
                <div className="space-y-3">
                  <label className="block font-handwriting text-sm font-medium text-gray-700 mb-2">
                    🎁 Reward Distribution Strategy
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(['LINEAR', 'QUADRATIC', 'CUSTOM'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => updateRewardConfig({ type })}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 font-handwriting ${
                          rewardConfig.type === type
                            ? 'border-purple-500 bg-purple-50 shadow-md scale-105'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            rewardConfig.type === type ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {type === 'LINEAR' && <Target className="w-4 h-4" />}
                            {type === 'QUADRATIC' && <Zap className="w-4 h-4" />}
                            {type === 'CUSTOM' && <Award className="w-4 h-4" />}
                          </div>
                          <div className="text-left">
                            <h4 className="font-handwriting font-bold text-gray-900">{type}</h4>
                            <p className="font-handwriting text-xs text-gray-500">
                              {type === 'LINEAR' && 'Equal distribution'}
                              {type === 'QUADRATIC' && 'Performance-based'}
                              {type === 'CUSTOM' && 'Manual amounts'}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reward All Participants Option */}
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <input
                    type="checkbox"
                    id="rewardAllParticipants"
                    checked={rewardConfig.rewardAllParticipants}
                    onChange={(e) => updateRewardConfig({ rewardAllParticipants: e.target.checked })}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="rewardAllParticipants" className="font-handwriting text-sm font-medium text-gray-700">
                    👥 Reward all participants (not just winners)
                  </label>
                </div>

                {/* Top Winners Configuration */}
                {!rewardConfig.rewardAllParticipants && (
                  <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                    <h4 className="font-handwriting font-bold text-gray-900 flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Top Winners Configuration
                    </h4>
                    
                    <div className="space-y-4">
                      {/* Winner Count Selection */}
                      <div>
                        <label className="block font-handwriting text-sm font-medium text-gray-700 mb-2">
                          🏆 Number of Winners
                        </label>
                        <select
                          value={rewardConfig.totalWinners}
                          onChange={(e) => handleWinnersChange(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-handwriting"
                        >
                          {[1, 2, 3, 4, 5].map(num => (
                            <option key={num} value={num}>{num} winner{num > 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </div>

                      {/* Reward Amounts */}
                      {rewardConfig.type === 'LINEAR' && (
                        <div>
                          <label className="block font-handwriting text-sm font-medium text-gray-700 mb-2">
                            💰 Equal Reward Amount (per winner)
                          </label>
                          <input
                            type="number"
                            value={rewardConfig.rewardAmounts?.[0] || 0}
                            onChange={(e) => {
                              const amount = parseInt(e.target.value) || 0;
                              const winners = rewardConfig.totalWinners || 1;
                              updateRewardConfig({ 
                                rewardAmounts: Array(winners).fill(amount),
                                totalRewardPool: (amount * winners).toString()
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-handwriting"
                            min="1"
                          />
                        </div>
                      )}

                      {rewardConfig.type === 'CUSTOM' && (
                        <div>
                          <label className="block font-handwriting text-sm font-medium text-gray-700 mb-2">
                            💰 Custom Reward Amounts (%)
                          </label>
                          <div className="space-y-2">
                            {rewardConfig.rewardAmounts?.map((amount, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 w-8">#{index + 1}:</span>
                                <input
                                  type="number"
                                  value={amount}
                                  onChange={(e) => handleRewardAmountChange(index, parseInt(e.target.value) || 0)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-handwriting text-sm"
                                  min="0"
                                  max="100"
                                />
                                <span className="text-sm text-gray-500">%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Total Reward Pool */}
                <div>
                  <label className="block font-handwriting text-sm font-medium text-gray-700 mb-2">
                    💰 Total Reward Pool
                  </label>
                  <input
                    type="text"
                    value={rewardConfig.totalRewardPool}
                    onChange={(e) => updateRewardConfig({ totalRewardPool: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-handwriting"
                    placeholder="Enter total reward amount"
                  />
                </div>

                {/* Minimum Participants */}
                <div>
                  <label className="block font-handwriting text-sm font-medium text-gray-700 mb-2">
                    👥 Minimum Participants
                  </label>
                  <input
                    type="number"
                    value={rewardConfig.minParticipants}
                    onChange={(e) => updateRewardConfig({ minParticipants: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-handwriting"
                    min="1"
                  />
                </div>

                {/* Points Weight (for quadratic) */}
                {rewardConfig.type === 'QUADRATIC' && (
                  <div>
                    <label className="block font-handwriting text-sm font-medium text-gray-700 mb-2">
                      ⚖️ Points Weight (0.0 - 1.0)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={rewardConfig.pointsWeight}
                      onChange={(e) => updateRewardConfig({ pointsWeight: parseFloat(e.target.value) || 0.7 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-handwriting"
                      min="0"
                      max="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Higher weight = more emphasis on quiz performance vs. speed
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="font-handwriting text-red-700">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-handwriting text-green-700">{success}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-handwriting font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !rewardConfig.enabled}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 font-handwriting font-bold shadow-md"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Adding Rewards...
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4" />
                Add Rewards
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizRewardsModal;
