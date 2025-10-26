import React, { useState, useEffect } from 'react';
import { useQuizContract } from '../hooks/useViemContract';
import { useAccount } from 'wagmi';
import { TokenConfig, NetworkConfig } from '../lib/tokens-config';
import { 
  Trophy, 
  Coins, 
  Network, 
  Settings, 
  Plus, 
  Minus, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Loader2,
  Wallet,
  Zap,
  Gift,
  Users,
  DollarSign,
  Shield
} from 'lucide-react';

interface QuizRewardsProps {
  sessionId: number;
  isAdmin: boolean;
  onClose: () => void;
}

export default function QuizRewards({ sessionId, isAdmin, onClose }: QuizRewardsProps) {
  const { address: userAddress, isConnected } = useAccount();
  const {
    contractState,
    addReward,
    adminDistributeReward,
    areRewardsDistributed,
    getExpectedRewardToken,
    getExpectedRewardAmount,
    resetState
  } = useQuizContract();

  const [showAddRewardModal, setShowAddRewardModal] = useState(false);
  const [showCustomTokenInput, setShowCustomTokenInput] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<TokenConfig[]>([]);

  const handleAddReward = async (tokenAddress: string, amount: string) => {
    const result = await addReward({
      sessionId,
      tokenAddress: tokenAddress as `0x${string}`,
      amount
    });
    if (result.success) {
      setShowAddRewardModal(false);
      resetState();
    }
  };

  const handleDistributeRewards = async (tokenAddress: string, amount: string) => {
    const result = await adminDistributeReward({
      sessionId,
      tokenAddress: tokenAddress as `0x${string}`,
      amount
    });
    if (result.success) {
      resetState();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <h2 className="text-2xl font-handwriting font-bold text-gray-800">
            Quiz Rewards
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <XCircle className="w-6 h-6 text-gray-500" />
        </button>
      </div>

      {/* Error Display */}
      {contractState.error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{contractState.error}</span>
          </div>
        </div>
      )}

      {/* Success Display */}
      {contractState.success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-700">Transaction successful!</span>
          </div>
        </div>
      )}

      {/* Admin Controls */}
      {isAdmin && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Admin Controls
          </h3>
          
          <div className="grid gap-4">
            {/* Add Reward */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">Add Reward</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Token Address"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Amount (in wei)"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={() => handleAddReward("0x...", "1000000000000000000")}
                  disabled={contractState.isLoading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {contractState.isLoading ? 'Adding...' : 'Add Reward'}
                </button>
              </div>
            </div>

            {/* Distribute Reward */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">Distribute Reward</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Recipient Address"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Amount (in wei)"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={() => handleDistributeRewards("0x...", "1000000000000000000")}
                  disabled={contractState.isLoading}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  {contractState.isLoading ? 'Distributing...' : 'Distribute Reward'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Checks */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Security Checks
        </h3>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Expected Reward Token:</span>
            <span className="font-mono text-sm">Loading...</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Expected Reward Amount:</span>
            <span className="font-mono text-sm">Loading...</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Rewards Distributed:</span>
            <span className="font-mono text-sm">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  );
} 