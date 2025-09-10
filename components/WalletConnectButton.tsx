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
        <div className={`flex items-center gap-2 ${compact ? 'px-2 py-1.5' : 'px-4 py-2'} rounded-lg text-gray-700 font-semibold`}>
          <Sparkles className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
          <span className={compact ? 'text-xs' : ''}>{formatAddress(address)}</span>
        </div>
        <button
          onClick={() => disconnect()}
          className={`${compact ? 'p-1.5' : 'p-2'} text-gray-700 rounded-lg transition-colors`}
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
      className={`flex items-center gap-2 ${compact ? 'px-2 py-1.5' : 'px-4 py-2'} text-gray-700 rounded-lg font-semibold transition-all`}
    >
      <Wallet className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
      <span className={compact ? 'text-xs' : ''}>
        {compact ? 'Connect' : 'Connect Wallet'}
      </span>
    </button>
  );
} 