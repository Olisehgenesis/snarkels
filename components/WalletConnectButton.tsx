'use client';

import React from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { Wallet, LogOut, Sparkles } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';

interface WalletConnectButtonProps {
  compact?: boolean;
}

export default function WalletConnectButton({ compact = false }: WalletConnectButtonProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-2 ${compact ? 'px-2 py-1.5' : 'px-4 py-2.5'} bg-white/90 backdrop-blur-md rounded-xl text-gray-800 font-semibold shadow-lg border border-white/50`}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <Sparkles className={compact ? 'w-3 h-3' : 'w-4 h-4 text-blue-600'} />
            <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium`}>{formatAddress(address)}</span>
          </div>
        </div>
        <button
          onClick={() => disconnect()}
          className={`${compact ? 'p-1.5' : 'p-2.5'} bg-white/90 backdrop-blur-md rounded-xl text-gray-800 transition-all hover:bg-gray-100 shadow-lg border border-white/50`}
          title="Disconnect Wallet"
        >
          <LogOut className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => open()}
      className={`flex items-center gap-2 ${compact ? 'px-2 py-1.5' : 'px-4 py-2.5'} bg-white/90 backdrop-blur-md rounded-xl text-gray-800 font-semibold transition-all hover:bg-white shadow-lg border border-white/50`}
    >
      <Wallet className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
      <span className={`${compact ? 'text-xs' : 'text-sm'}`}>
        {compact ? 'Connect' : 'Connect Wallet'}
      </span>
    </button>
  );
} 