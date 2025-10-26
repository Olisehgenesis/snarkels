import React, { useState } from 'react';
import { Trophy, Zap, Coins, Users, Info } from 'lucide-react';
import { TokenSelector } from './TokenSelector';
import { ChainSelector } from './ChainSelector';
import { ProgressModal } from './ProgressModal';
import { useRewardCreation } from '@/hooks/useRewardCreation';
import { EnhancedTokenSelector } from './EnhancedTokenSelector'

interface RewardConfig {
  enabled: boolean;
  type: 'QUADRATIC';
  tokenAddress: string;
  chainId: number;
  tokenSymbol?: string;
  tokenName?: string;
  tokenDecimals?: number;
  network?: string;
  totalRewardPool?: string;
  minParticipants?: number;
  pointsWeight?: number;
  rewardAllParticipants?: boolean;
}

interface RewardConfigurationSectionProps {
  rewardConfig: RewardConfig;
  onRewardConfigChange: (config: RewardConfig) => void;
  validationErrors?: { [key: string]: string };
  className?: string;
}

// Popular token presets with full token information
const TOKEN_PRESETS = {
  8453: { // Base
    'SNARKEL': {
      address: '0xe75a890ad702b14b7935bc1ba81067f2b93f35d0',
      symbol: 'SNARKEL',
      name: 'Snarkel Token (Base)',
      decimals: 18
    },
    'USDC': {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6
    },
    'ETH': {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ether (Base)',
      decimals: 18
    },
  },
  42220: { // Celo Mainnet
    'SNARKEL': {
      address: '0xf18e87167db07da9160d790d87dc9d39e8147e4d',
      symbol: 'SNARKEL',
      name: 'Snarkel Token (Celo)',
      decimals: 18
    },
    'USDC': {
      address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6
    },
    'cUSD': {
      address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
      symbol: 'cUSD',
      name: 'Celo Dollar',
      decimals: 6
    },
    'CELO': {
      address: '0x471EcE3750Da237f93B8E339c536989b8978a438',
      symbol: 'CELO',
      name: 'Celo Native Token',
      decimals: 18
    },
  }
};

export const RewardConfigurationSection: React.FC<RewardConfigurationSectionProps> = ({
  rewardConfig,
  onRewardConfigChange,
  validationErrors = {},
  className = '',
}) => {
  const [showProgressModal, setShowProgressModal] = useState(false);
  const { steps, currentStep, isCreating, error, createRewardSession, resetCreation } = useRewardCreation();

  const updateRewardConfig = (updates: Partial<RewardConfig>) => {
    console.log('=== UPDATE REWARD CONFIG DEBUG ===');
    console.log('Current config:', rewardConfig);
    console.log('Updates:', updates);
    console.log('New config will be:', { ...rewardConfig, ...updates });
    
    onRewardConfigChange({ ...rewardConfig, ...updates });
  };

  const handleRewardsToggle = (enabled: boolean) => {
    if (enabled) {
      // Set default quadratic distribution when enabling rewards
      updateRewardConfig({ 
        enabled,
        type: 'QUADRATIC',
        chainId: 8453, // Default to Base
        totalRewardPool: rewardConfig.totalRewardPool || '10', // Use existing value or default to 10
        minParticipants: 3,
        pointsWeight: 0.7,
        rewardAllParticipants: true // Default to rewarding all participants
      });
    } else {
      updateRewardConfig({ enabled });
    }
  };

  const handleChainChange = (chainId: number) => {
    const networkNames = {
      8453: 'Base',
      42220: 'Celo'
    };
    updateRewardConfig({ 
      chainId,
      network: networkNames[chainId as keyof typeof networkNames] || `Chain ${chainId}`
    });
  };

  const handleTokenAddressChange = (tokenAddress: string, tokenInfo?: { symbol: string; name: string; decimals: number }) => {
    console.log('=== TOKEN ADDRESS CHANGE DEBUG ===');
    console.log('Token address:', tokenAddress);
    console.log('Token info:', tokenInfo);
    
    if (tokenInfo) {
      console.log('Updating with token info:', tokenInfo);
      updateRewardConfig({ 
        tokenAddress,
        tokenSymbol: tokenInfo.symbol,
        tokenName: tokenInfo.name,
        tokenDecimals: tokenInfo.decimals
      });
    } else {
      console.log('Updating without token info');
      updateRewardConfig({ tokenAddress });
    }
  };

  const handlePresetToken = (tokenName: string) => {
    console.log('=== PRESET TOKEN DEBUG ===');
    console.log('Token name:', tokenName);
    console.log('Chain ID:', rewardConfig.chainId);
    console.log('Available presets:', TOKEN_PRESETS[rewardConfig.chainId as keyof typeof TOKEN_PRESETS]);
    
    const presets = TOKEN_PRESETS[rewardConfig.chainId as keyof typeof TOKEN_PRESETS];
    if (presets && presets[tokenName as keyof typeof presets]) {
      const tokenInfo = presets[tokenName as keyof typeof presets];
      console.log('Selected token info:', tokenInfo);
      const networkNames = {
        8453: 'Base',
        42220: 'Celo'
      };
      const networkName = networkNames[rewardConfig.chainId as keyof typeof networkNames] || `Chain ${rewardConfig.chainId}`;
      
      updateRewardConfig({ 
        tokenAddress: tokenInfo.address,
        tokenSymbol: tokenInfo.symbol,
        tokenName: tokenInfo.name,
        tokenDecimals: tokenInfo.decimals,
        network: networkName
      });
    } else {
      console.log('No presets found for chain ID:', rewardConfig.chainId);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Rewards Toggle */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
        <input
          type="checkbox"
          id="rewardsEnabled"
          checked={rewardConfig.enabled}
          onChange={(e) => handleRewardsToggle(e.target.checked)}
          className="w-5 h-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
        />
        <label htmlFor="rewardsEnabled" className="font-handwriting text-lg font-bold text-gray-700 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-600" />
          Enable Rewards
        </label>
        <div className="ml-auto">
          <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
            Optional
          </span>
        </div>
      </div>

      {rewardConfig.enabled && (
        <div className="space-y-6 p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
          {/* Network Selection */}
          <ChainSelector
            value={rewardConfig.chainId}
            onChange={handleChainChange}
            disabled={isCreating}
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
                disabled={isCreating}
                showBalance={true}
              />
            </div>
          </div>

          {/* Quadratic Reward Configuration */}
          <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-handwriting font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Quadratic Distribution Settings
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block font-handwriting text-sm font-medium text-gray-700 mb-1">
                  💰 Total Reward Pool
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rewardConfig.totalRewardPool || ''}
                  onChange={(e) => {
                    console.log('Total reward pool changed to:', e.target.value);
                    updateRewardConfig({ totalRewardPool: e.target.value });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-handwriting ${
                    validationErrors.rewardsPool ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="10"
                />
                {validationErrors.rewardsPool && (
                  <p className="mt-1 text-sm text-red-600 font-handwriting">
                    {validationErrors.rewardsPool}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-handwriting text-sm font-medium text-gray-700 mb-1">
                    👥 Min Participants
                  </label>
                  <input
                    type="number"
                    value={rewardConfig.minParticipants || ''}
                    onChange={(e) => updateRewardConfig({ minParticipants: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-handwriting ${
                      validationErrors.rewardsParticipants ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    min="1"
                  />
                  {validationErrors.rewardsParticipants && (
                    <p className="mt-1 text-sm text-red-600 font-handwriting">
                      {validationErrors.rewardsParticipants}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-handwriting text-sm font-medium text-gray-700 mb-1">
                    ⚖️ Points Weight (0-1)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={rewardConfig.pointsWeight || 0.7}
                    onChange={(e) => updateRewardConfig({ pointsWeight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-handwriting"
                    min="0"
                    max="1"
                  />
                </div>
              </div>

              {/* Distribution Preview */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="font-handwriting text-sm font-medium text-blue-800">
                    How Rewards Work
                  </span>
                </div>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>• All participants receive rewards based on their performance</p>
                  <p>• Rewards are distributed using quadratic funding formula</p>
                  <p>• Higher scores and faster answers get proportionally more rewards</p>
                  <p>• The system automatically calculates fair distribution</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      <ProgressModal
        isOpen={showProgressModal}
        steps={steps}
        currentStep={currentStep}
        onClose={() => setShowProgressModal(false)}
        onRetry={() => {
          resetCreation();
          // Retry logic here
        }}
      />
    </div>
  );
}; 