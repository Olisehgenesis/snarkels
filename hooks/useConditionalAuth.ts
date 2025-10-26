'use client';

import { useFarcaster } from '@/components/FarcasterProvider';

export const useConditionalAuth = () => {
  const { isFarcasterApp } = useFarcaster();
  
  // Only show email/social auth when NOT in Farcaster
  // In Farcaster, users should use their Farcaster wallet
  const shouldShowEmailAuth = !isFarcasterApp;
  const shouldShowSocialAuth = !isFarcasterApp;
  
  return {
    shouldShowEmailAuth,
    shouldShowSocialAuth,
    isFarcasterApp
  };
};
