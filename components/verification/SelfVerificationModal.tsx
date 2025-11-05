'use client';

import React, { useState, useEffect } from 'react';
import { SelfQRcodeWrapper, SelfAppBuilder } from '@selfxyz/qrcode';
import { getUniversalLink } from '@selfxyz/core';
import { useAccount } from 'wagmi';
import WalletConnectButton from '@/components/WalletConnectButton';

interface SelfVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  snarkelId?: string;
}

export default function SelfVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  snarkelId
}: SelfVerificationModalProps) {
  // Loosen typing to avoid cross-package version type conflicts
  const [selfApp, setSelfApp] = useState<any | null>(null);
  const [universalLink, setUniversalLink] = useState("");
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (isOpen && isConnected && address) {
      // Intercept fetch requests to add userAddress to verification endpoint
      const originalFetch = window.fetch;
      const verificationEndpoint = process.env.NEXT_PUBLIC_SELF_ENDPOINT || '/api/verification/self';
      
      window.fetch = async (...args) => {
        const [url, options] = args;
        const urlString = typeof url === 'string' ? url : url.toString();
        
        // Check if this is a request to our verification endpoint
        if (urlString.includes(verificationEndpoint) && options?.method === 'POST') {
          try {
            // Parse existing body and add userAddress
            const existingBody = options?.body ? JSON.parse(options.body as string) : {};
            const modifiedBody = {
              ...existingBody,
              userAddress: address
            };
            
            // Create new options with modified body
            const modifiedOptions = {
              ...options,
              body: JSON.stringify(modifiedBody)
            };
            
            console.log('Intercepted verification request, adding userAddress:', address);
            return originalFetch(url, modifiedOptions);
          } catch (e) {
            console.error('Error intercepting fetch:', e);
            return originalFetch(...args);
          }
        }
        
        return originalFetch(...args);
      };
      
      try {
        const app = new SelfAppBuilder({
          version: 2,
          appName: process.env.NEXT_PUBLIC_SELF_APP_NAME || 'Snarkels',
          scope: process.env.NEXT_PUBLIC_SELF_SCOPE || 'snarkels-verification',
          endpoint: verificationEndpoint,
          logoBase64: 'https://snarkels.lol/logo.png',
          userId: address, // Use connected wallet address
          endpointType: 'staging_https',
          userIdType: 'hex',
          userDefinedData: `Snarkels Verification - ${snarkelId || 'General'}`,
          disclosures: {
            // Simplified: only age above 18 and country
            minimumAge: 18,
            issuing_state: true, // This gives us the country
          }
        }).build();

        setSelfApp(app);
        // Cast to any to avoid type mismatch between @selfxyz/common versions
        setUniversalLink(getUniversalLink(app as any));
      } catch (error) {
        console.error('Failed to initialize Self app:', error);
      }
      
      // Cleanup: restore original fetch when component unmounts or modal closes
      return () => {
        window.fetch = originalFetch;
      };
    } else {
      // Reset app if wallet disconnects
      setSelfApp(null);
      setUniversalLink("");
    }
  }, [isOpen, isConnected, address, snarkelId]);

  const handleVerificationSuccess = () => {
    console.log('Verification successful!');
    // The address is now automatically included via fetch interception
    // The verification data will be sent to our API endpoint with userAddress
    onSuccess();
    onClose();
  };

  const handleVerificationError = (error: any) => {
    console.error('Verification failed:', error);
    // You could show an error message to the user here
  };

  const openSelfApp = () => {
    if (universalLink) {
      window.open(universalLink, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Verify Your Identity</h2>
          
          {!isConnected ? (
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">
                Please connect your wallet to proceed with identity verification
              </p>
              <WalletConnectButton />
              <button
                onClick={onClose}
                className="mt-4 text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-4">
                Self wants to verify your wallet address by confirming your identity.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Scan this QR code with the Self app to verify your identity. Your personal information remains private - only age and country will be disclosed.
              </p>
              
              {selfApp ? (
                <div className="space-y-4">
                  <SelfQRcodeWrapper
                    selfApp={selfApp}
                    onSuccess={handleVerificationSuccess}
                    onError={handleVerificationError}
                  />
                  
                  <button
                    onClick={openSelfApp}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                  >
                    Open Self App
                  </button>
                </div>
              ) : (
                <div className="text-gray-500">Loading QR Code...</div>
              )}
              
              <button
                onClick={onClose}
                className="mt-4 text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
