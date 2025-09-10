'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ArrowRight, Loader2 } from 'lucide-react';
import { FarcasterUI } from '@/components/FarcasterUI';
import WalletConnectButton from '@/components/WalletConnectButton';

export default function HomePage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      <div className="fixed top-4 left-4 z-50">
                  <img 
                    src="/logo.png" 
                    alt="Snarkels Logo" 
          className="h-128 w-auto"
                  />
                </div>

      {/* Transparent Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="flex items-center justify-between px-4 py-4">
          {/* Left: Empty space for logo */}
          <div className="flex-shrink-0 w-32">
            {/* Logo moved outside */}
              </div>
              
          {/* Center: Navigation buttons */}
          <div className="flex-1 flex justify-center gap-8">
            <button className="text-lime-600 font-medium hover:text-lime-800 transition-colors bg-lime-100/50 px-3 py-1 rounded-lg">
              How it works
            </button>
            <button className="text-lime-600 font-medium hover:text-lime-800 transition-colors bg-lime-100/50 px-3 py-1 rounded-lg">
              Host a Snarkel
            </button>
            </div>
            
          {/* Right: Connect Button - moved left */}
          <div className="flex-shrink-0 mr-8">
            <WalletConnectButton />
          </div>
              </div>
      </header>

      <div className="min-h-screen flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-md">
          {/* Card with input */}
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 mb-6">
            <h1 className="text-2xl font-bold text-center mb-2 text-gray-800">
              Enter Snakel Code
            </h1>
            <p className="text-sm text-gray-600 text-center mb-6">
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
          </div>
      </div>
    </FarcasterUI>
  );
}