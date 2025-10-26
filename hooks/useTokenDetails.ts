import { useState, useEffect, useCallback } from 'react';
import { Address } from 'viem';

interface TokenDetails {
  name: string;
  symbol: string;
  decimals: number;
  isValid: boolean;
  isLoading: boolean;
  error?: string;
}

interface UseTokenDetailsReturn {
  tokenDetails: TokenDetails;
  validateToken: (address: string, chainId?: number) => Promise<void>;
  clearTokenDetails: () => void;
}

export const useTokenDetails = (): UseTokenDetailsReturn => {
  const [tokenDetails, setTokenDetails] = useState<TokenDetails>({
    name: '',
    symbol: '',
    decimals: 18,
    isValid: false,
    isLoading: false,
  });

  const validateToken = useCallback(async (address: string, chainId?: number) => {
    if (!address || address.length < 42) {
      setTokenDetails({
        name: '',
        symbol: '',
        decimals: 18,
        isValid: false,
        isLoading: false,
        error: 'Invalid address format',
      });
      return;
    }

    setTokenDetails(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      // Basic address validation
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        throw new Error('Invalid Ethereum address format');
      }

      // For now, we'll use a simple validation approach
      // In a real implementation, you would query the blockchain for token details
      const response = await fetch('/api/token/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenAddress: address,
          chainId: chainId || 42220, // Default to Celo Mainnet
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate token');
      }

      const data = await response.json();

      if (data.isValid) {
        setTokenDetails({
          name: data.name || 'Unknown Token',
          symbol: data.symbol || 'UNKNOWN',
          decimals: data.decimals || 18,
          isValid: true,
          isLoading: false,
        });
      } else {
        setTokenDetails({
          name: '',
          symbol: '',
          decimals: 18,
          isValid: false,
          isLoading: false,
          error: data.error || 'Token not found or invalid',
        });
      }
    } catch (error: any) {
      setTokenDetails({
        name: '',
        symbol: '',
        decimals: 18,
        isValid: false,
        isLoading: false,
        error: error.message || 'Failed to validate token',
      });
    }
  }, []);

  const clearTokenDetails = useCallback(() => {
    setTokenDetails({
      name: '',
      symbol: '',
      decimals: 18,
      isValid: false,
      isLoading: false,
    });
  }, []);

  return {
    tokenDetails,
    validateToken,
    clearTokenDetails,
  };
}; 