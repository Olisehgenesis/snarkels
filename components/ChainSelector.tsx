import React, { useState } from 'react';
import { Network, Globe } from 'lucide-react';
import { useSwitchChain, useAccount } from 'wagmi';
import Image from 'next/image';

interface ChainOption {
  id: number;
  name: string;
  shortName: string;
  icon: string;
  color: string;
}

interface ChainSelectorProps {
  value: number;
  onChange: (chainId: number) => void;
  className?: string;
  disabled?: boolean;
}

const CHAIN_OPTIONS: ChainOption[] = [
  {
    id: 8453,
    name: 'Base',
    shortName: 'Base',
    icon: '/base.png',
    color: 'bg-blue-500',
  },
  {
    id: 42220,
    name: 'Celo Mainnet',
    shortName: 'Celo',
    icon: '/celo.png',
    color: 'bg-green-500',
  },
];

export const ChainSelector: React.FC<ChainSelectorProps> = ({
  value,
  onChange,
  className = '',
  disabled = false,
}) => {
  const { switchChain, isPending } = useSwitchChain();
  const { chain } = useAccount();
  const [isSwitching, setIsSwitching] = useState(false);
  const selectedChain = CHAIN_OPTIONS.find(chain => chain.id === value);

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block font-handwriting text-sm font-medium text-gray-700 mb-2">
        🌐 Network
      </label>
      
      <div className="grid grid-cols-2 gap-3">
        {CHAIN_OPTIONS.map((chainOption) => (
          <button
            key={chainOption.id}
            onClick={async () => {
              // If the user's current chain doesn't match the selected chain, switch to it
              if (chain?.id !== chainOption.id) {
                setIsSwitching(true);
                try {
                  await switchChain({ chainId: chainOption.id });
                } catch (error) {
                  console.error('Failed to switch chain:', error);
                  // Still update the UI even if chain switch fails
                } finally {
                  setIsSwitching(false);
                }
              }
              onChange(chainOption.id);
            }}
            disabled={disabled || isSwitching || isPending}
            className={`relative p-4 rounded-lg border-2 transition-all duration-200 font-handwriting ${
              value === chainOption.id
                ? 'border-purple-500 bg-purple-50 shadow-md scale-105'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {/* Selection indicator */}
            {value === chainOption.id && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${chainOption.color} flex items-center justify-center text-white overflow-hidden`}>
                <Image
                  src={chainOption.icon}
                  alt={chainOption.name}
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain"
                />
              </div>
              
              <div className="text-left">
                <h4 className="font-handwriting font-bold text-gray-900">
                  {chainOption.shortName}
                </h4>
                <p className="font-handwriting text-xs text-gray-500">
                  {chainOption.name}
                </p>
                {(isSwitching || isPending) && chain?.id !== chainOption.id && (
                  <p className="font-handwriting text-xs text-blue-600 mt-1">
                    🔄 Switching...
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Selected chain info */}
      {selectedChain && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            <div>
              <p className="font-handwriting text-sm font-medium text-blue-800">
                Selected: {selectedChain.name}
              </p>
              <p className="font-handwriting text-xs text-blue-600">
                Chain ID: {selectedChain.id}
              </p>
              {chain && chain.id !== selectedChain.id && (
                <p className="font-handwriting text-xs text-orange-600 mt-1">
                  ⚠️ Wallet is on {chain.name} (ID: {chain.id})
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 