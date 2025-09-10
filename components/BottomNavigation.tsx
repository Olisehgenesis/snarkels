'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Plus, 
  User, 
  Home,
  LogOut
} from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import { useAccount, useDisconnect } from 'wagmi';
import { useFarcaster } from '@/components/FarcasterProvider';
import { useMiniApp } from '@/hooks/useMiniApp';

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { isInFarcasterContext, getUserDisplayName, getUserEmoji, context } = useFarcaster();
  const { isMiniApp, userFid, username, displayName, pfpUrl } = useMiniApp();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl md:left-1/2 md:transform md:-translate-x-1/2 md:w-4/5 lg:w-3/5" style={{ bottom: '3%' }}>
      
      <div className="relative z-10 p-4 sm:p-5 mb-2">
        <div className="flex items-center justify-center gap-3 sm:gap-4 lg:gap-6">
          {/* Home */}
          <div className="relative flex-1 min-w-0">
            <Link href="/">
              <div className={`group rounded-2xl p-3 sm:p-4 transform hover:scale-105 transition-all duration-300 relative overflow-hidden ${
                isActive('/') 
                  ? 'text-white' 
                  : 'text-gray-700'
              }`}>
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                  isActive('/') ? 'bg-white/20' : 'bg-gray-100/50'
                }`}></div>
                <span className={`font-handwriting text-xs sm:text-base lg:text-lg text-center block transition-all duration-300 cursor-pointer flex items-center justify-center gap-1 sm:gap-3 relative z-10 truncate font-semibold ${
                  isActive('/') ? 'text-white' : 'text-slate-700'
                }`}>
                  <Home className={`w-3 h-3 sm:w-5 sm:h-5 lg:w-6 lg:h-6 ${isActive('/') ? 'text-white' : 'text-slate-600'}`} />
                  <span className="hidden sm:inline">Home</span>
                  <span className="sm:hidden">Home</span>
                </span>
              </div>
            </Link>
          </div>


          
          {/* Profile - Show user PFP and Farcaster name when in Farcaster context, otherwise show profile icon */}
          <div className={`relative flex-1 min-w-0 ${!isConnected ? 'hidden md:block' : ''}`}>
            <Link href="/profile">
              <div className={`group rounded-2xl p-3 sm:p-4 transform hover:scale-105 transition-all duration-300 relative overflow-hidden ${
                isActive('/profile') 
                  ? 'text-white' 
                  : 'text-gray-700'
              }`}>
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                  isActive('/profile') ? 'bg-white/20' : 'bg-gray-100/50'
                }`}></div>
                <div className="flex items-center justify-center gap-2 relative z-10">
                  {(isInFarcasterContext() || isMiniApp) ? (
                    <>
                      {/* User PFP */}
                      <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full border-2 border-slate-300 overflow-hidden">
                        {(context?.user?.pfpUrl || pfpUrl) ? (
                          <img 
                            src={context?.user?.pfpUrl || pfpUrl} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <User className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                      {/* Farcaster Name */}
                      <span className={`font-handwriting text-xs sm:text-sm lg:text-base font-semibold truncate ${
                        isActive('/profile') ? 'text-white' : 'text-slate-700'
                      }`}>
                        {getUserDisplayName() || displayName || username || `FID: ${userFid}`}
                      </span>
                    </>
                  ) : (
                    <>
                      <User className={`w-3 h-3 sm:w-5 sm:h-5 lg:w-6 lg:h-6 ${isActive('/profile') ? 'text-white' : 'text-slate-600'}`} />
                      <span className={`hidden sm:inline font-handwriting text-xs sm:text-base lg:text-lg font-semibold ${
                        isActive('/profile') ? 'text-white' : 'text-slate-700'
                      }`}>Profile</span>
                      <span className={`sm:hidden font-handwriting text-xs font-semibold ${
                        isActive('/profile') ? 'text-white' : 'text-slate-700'
                      }`}>Profile</span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          </div>
          
          {/* Wallet Connect - Only visible when not connected */}
          {!isConnected && (
            <div className="flex-shrink-0">
              <WalletConnectButton />
            </div>
          )}
          
          {/* Logout Button - Only visible when connected */}
          {isConnected && (
            <div className="flex-shrink-0">
              <button
                onClick={() => disconnect()}
                className="p-3 rounded-xl transition-all duration-300 text-gray-700 hover:scale-105 transform"
                title="Disconnect Wallet"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
