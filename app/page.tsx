'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ArrowRight, Loader2, Menu, X } from 'lucide-react';
import { FarcasterUI } from '@/components/FarcasterUI';
import WalletConnectButton from '@/components/WalletConnectButton';

export default function HomePage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();

  // Handle URL parameters (e.g., /?code=hhhh)
  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) {
      setCode(urlCode);
    }
  }, [searchParams]);

  const handlePlay = async () => {
    if (!code.trim()) {
      setError('Please enter a snakel code');
      return;
    }

    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call the snakel join API
      const response = await fetch('/api/snarkel/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snarkelCode: code.trim(),
          userAddress: address,
        }),
      });

      const data = await response.json();

      console.log('API Response:', {
        status: response.status,
        ok: response.ok,
        data: data
      });

      if (response.ok && data.success) {
        // Navigate to the correct room
        console.log('Navigating to:', `/quiz/${data.snarkelId}/room/${data.roomId}`);
        router.push(`/quiz/${data.snarkelId}/room/${data.roomId}`);
      } else {
        console.error('API Error:', data);
        setError(data.error || 'Failed to join snakel');
      }
    } catch (err) {
      console.error('Error joining snakel:', err);
      setError('Failed to join snakel. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FarcasterUI>
      {/* Large Logo - Outside Header */}
      <div className="fixed top-2 left-2 sm:top-4 sm:left-4 z-50">
                  <img 
                    src="/logo.png" 
                    alt="Snarkels Logo" 
                    className="h-16 w-auto sm:h-24 md:h-32 lg:h-40 xl:h-48"
                  />
                </div>

      {/* Transparent Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-4">
          {/* Left: Empty space for logo */}
          <div className="flex-shrink-0 w-16 sm:w-24 md:w-32">
            {/* Logo moved outside */}
              </div>
              
          {/* Center: Navigation buttons - Hidden on mobile, visible on tablet+ */}
          <div className="hidden md:flex flex-1 justify-center gap-4 lg:gap-8">
            <button 
              onClick={() => router.push('/featured')}
              className="text-white font-medium hover:text-gray-200 transition-colors text-sm lg:text-base bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20"
            >
              Browse Snarkels
            </button>
            <button 
              onClick={() => router.push('/create')}
              className="text-white font-medium hover:text-gray-200 transition-colors text-sm lg:text-base bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20"
            >
              Host a Snarkel
            </button>
            </div>
            
          {/* Right: Connect Button & Mobile Menu */}
          <div className="flex flex-shrink-0 items-center gap-2">
            <div className="hidden md:block">
              <WalletConnectButton />
            </div>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden bg-white/90 backdrop-blur-md rounded-xl p-2.5 shadow-lg border border-white/50 text-gray-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div 
              className="absolute top-20 right-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/50 p-4 min-w-[250px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <button
                  onClick={() => {
                    router.push('/featured');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all"
                >
                  Browse Snarkels
                </button>
                <button
                  onClick={() => {
                    router.push('/create');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-700 transition-all"
                >
                  Host a Snarkel
                </button>
                <div className="pt-2 border-t border-gray-200">
                  <WalletConnectButton />
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="min-h-screen flex items-center justify-center p-4 pt-16 sm:pt-20">
        <div className="w-full max-w-md">
          {/* Card with input */}
          <div className="bg-white rounded-xl p-4 sm:p-6 md:p-8 shadow-lg border border-gray-200 mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-center mb-2 text-gray-800">
              Enter Snakel Code
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 text-center mb-4 sm:mb-6">
              * Required to join a snakel
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-red-600 text-sm text-center">{error}</p>
              </div>
            )}
            <div className="space-y-4">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter snakel code"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              />
              <button
                onClick={handlePlay}
                disabled={!code.trim() || loading || !isConnected}
                className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium border-2 transition-all duration-100 ${
                  code.trim() && !loading && isConnected
                    ? 'text-black border-black bg-lime-300 hover:bg-lime-400 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px]' 
                    : 'text-lime-600 border-lime-300 bg-transparent cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Joining...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {!isConnected ? 'Connect Wallet First' : 'Join Snakel'}
                    </span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
              </div>
            </div>
            
            {/* Host a Snarkel Label */}
            <div className="text-center mt-4">
              <button 
                onClick={() => router.push('/create')}
                className="text-blue-600 hover:text-blue-800 transition-colors font-medium text-sm"
              >
                Host a Snarkel
              </button>
            </div>
          </div>
      </div>
    </FarcasterUI>
  );
}