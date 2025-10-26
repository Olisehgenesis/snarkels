import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle, Globe, Search, Info, ChevronDown, Coins } from 'lucide-react';
import { useTokenDetails } from '@/hooks/useTokenDetails';
import { REWARD_TOKENS } from '@/lib/tokens-config';

interface TokenSelectorProps {
  value: string;
  onChange: (address: string, tokenInfo?: { symbol: string; name: string; decimals: number }) => void;
  chainId?: number;
  placeholder?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
}

interface TokenOption {
  address: string;
  symbol: string;
  name: string;
  chainId: number;
  network: string;
  decimals: number;
  isNative?: boolean;
  isStablecoin?: boolean;
}

const getChainName = (chainId: number) => {
  switch (chainId) {
    case 8453:
      return 'Base';
    case 42220:
      return 'Celo Mainnet';
    default:
      return 'Unknown Network';
  }
};

const getChainColor = (chainId: number) => {
  switch (chainId) {
    case 8453:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 42220:
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getChainIcon = (chainId: number) => {
  switch (chainId) {
    case 8453:
      return '🔵';
    case 42220:
      return '🌾';
    default:
      return '🌐';
  }
};

export const TokenSelector: React.FC<TokenSelectorProps> = ({
  value,
  onChange,
  chainId = 8453, // Default to Base
  placeholder = 'Select a token...',
  className = '',
  error,
  disabled,
}) => {
  const { tokenDetails, validateToken, clearTokenDetails } = useTokenDetails();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenOption | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter tokens based on search term and group by chain
  const filteredTokens = REWARD_TOKENS.filter(token => 
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group tokens by chain
  const tokensByChain = filteredTokens.reduce((acc, token) => {
    if (!acc[token.chainId]) {
      acc[token.chainId] = [];
    }
    acc[token.chainId].push(token);
    return acc;
  }, {} as Record<number, TokenOption[]>);

  // Find selected token
  useEffect(() => {
    if (value) {
      const token = REWARD_TOKENS.find(t => t.address === value);
      setSelectedToken(token || null);
    } else {
      setSelectedToken(null);
    }
  }, [value]);

  // Validate custom token when value changes
  useEffect(() => {
    if (value && value.length >= 42 && !REWARD_TOKENS.find(t => t.address === value)) {
      validateToken(value, chainId);
    } else if (value.length === 0) {
      clearTokenDetails();
    }
  }, [value, chainId, validateToken, clearTokenDetails]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTokenSelect = (token: TokenOption) => {
    onChange(token.address, {
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals
    });
    setSelectedToken(token);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCustomToken = (address: string) => {
    // If we have validated token details, pass them along
    if (tokenDetails.isValid && tokenDetails.name && tokenDetails.symbol) {
      onChange(address, {
        symbol: tokenDetails.symbol,
        name: tokenDetails.name,
        decimals: tokenDetails.decimals
      });
    } else {
      // Otherwise just pass the address
      onChange(address);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  const getInputBorderColor = () => {
    if (error) return 'border-red-500';
    if (tokenDetails.isLoading) return 'border-yellow-400';
    if (tokenDetails.isValid) return 'border-green-500';
    if (value && value.length >= 42) return 'border-red-500';
    return 'border-gray-300';
  };

  const getInputBgColor = () => {
    if (error) return 'bg-red-50';
    if (tokenDetails.isLoading) return 'bg-yellow-50';
    if (tokenDetails.isValid) return 'bg-green-50';
    if (value && value.length >= 42) return 'bg-red-50';
    return 'bg-white';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative" ref={dropdownRef}>
        {/* Main input/button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-handwriting transition-all duration-200 ${getInputBorderColor()} ${getInputBgColor()} flex items-center justify-between ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-2">
            {selectedToken ? (
              <>
                <span className="text-lg">{getChainIcon(selectedToken.chainId)}</span>
                <span className="font-medium">{selectedToken.symbol}</span>
                <span className="text-sm text-gray-500">({selectedToken.name})</span>
              </>
            ) : value && value.length >= 42 ? (
              <>
                <span className="text-lg">{getChainIcon(chainId)}</span>
                <span className="font-medium">Custom Token</span>
                <span className="text-sm text-gray-500">({value.slice(0, 6)}...{value.slice(-4)})</span>
              </>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
            {/* Search input */}
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search tokens..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-handwriting"
                  autoFocus
                />
              </div>
            </div>

            {/* Token list */}
            <div className="max-h-80 overflow-y-auto">
              {Object.entries(tokensByChain).map(([chainIdStr, tokens]) => {
                const chainIdNum = parseInt(chainIdStr);
                return (
                  <div key={chainIdNum} className="border-b border-gray-100 last:border-b-0">
                    {/* Chain header */}
                    <div className={`px-3 py-2 ${getChainColor(chainIdNum)} text-xs font-medium flex items-center gap-2`}>
                      <span className="text-sm">{getChainIcon(chainIdNum)}</span>
                      <span>{getChainName(chainIdNum)}</span>
                    </div>
                    
                    {/* Tokens in this chain */}
                    {tokens.map((token) => (
                      <button
                        key={token.address}
                        onClick={() => handleTokenSelect(token)}
                        className="w-full px-3 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <Coins className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{token.symbol}</div>
                            <div className="text-sm text-gray-500">{token.name}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {token.isNative && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Native</span>
                          )}
                          {token.isStablecoin && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Stable</span>
                          )}
                          <Info className="w-4 h-4 text-gray-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}

              {/* Custom token option */}
              {searchTerm && searchTerm.length >= 42 && (
                <div className="border-t border-gray-200">
                  <button
                    onClick={() => handleCustomToken(searchTerm)}
                    className="w-full px-3 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <Coins className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Custom Token</div>
                        <div className="text-sm text-gray-500">{searchTerm.slice(0, 6)}...{searchTerm.slice(-4)}</div>
                      </div>
                    </div>
                    <Info className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}

              {/* No results */}
              {filteredTokens.length === 0 && searchTerm && searchTerm.length < 42 && (
                <div className="px-3 py-4 text-center text-gray-500">
                  No tokens found. Try searching for a token symbol or enter a custom address.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Token details display for custom tokens */}
      {tokenDetails.isValid && value && !selectedToken && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-handwriting font-bold text-green-800">
                {tokenDetails.name}
              </h4>
              <p className="font-handwriting text-sm text-green-600">
                Symbol: {tokenDetails.symbol} • Decimals: {tokenDetails.decimals}
              </p>
              <p className="font-handwriting text-xs text-green-500 mt-1">
                ✓ Valid ERC-20 token on {getChainName(chainId)}
              </p>
            </div>
            <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
              Valid Token
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {(error || tokenDetails.error) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-handwriting text-sm text-red-700">
                {error || tokenDetails.error}
              </p>
              <p className="font-handwriting text-xs text-red-600 mt-1">
                Please enter a valid ERC-20 token address on {getChainName(chainId)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {tokenDetails.isLoading && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
            <p className="font-handwriting text-sm text-yellow-700">
              Querying blockchain for token details...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}; 