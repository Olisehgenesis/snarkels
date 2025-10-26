'use client'

import React, { useState, useEffect, useRef } from 'react'
import { CheckCircle, XCircle, Loader2, AlertCircle, Globe, Search, Info, ChevronDown, Coins, Wallet } from 'lucide-react'
import { useTokenDetails } from '@/hooks/useTokenDetails'
import { REWARD_TOKENS } from '@/lib/tokens-config'
import { useAccount } from 'wagmi'
import { useQuizContract } from '@/hooks/useViemContract'

interface EnhancedTokenSelectorProps {
  value: string
  onChange: (address: string, tokenInfo?: { symbol: string; name: string; decimals: number }) => void
  chainId?: number
  placeholder?: string
  className?: string
  error?: string
  disabled?: boolean
  showBalance?: boolean
}

interface TokenOption {
  address: string
  symbol: string
  name: string
  chainId: number
  network: string
  decimals: number
  logoURI?: string
}

interface TokenBalance {
  address: string
  balance: string
  formatted: string
  isLoading: boolean
}

export const EnhancedTokenSelector: React.FC<EnhancedTokenSelectorProps> = ({
  value,
  onChange,
  chainId = 8453, // Default to Base
  placeholder = 'Select a token...',
  className = '',
  error,
  disabled,
  showBalance = true,
}) => {
  const { tokenDetails, validateToken, clearTokenDetails } = useTokenDetails()
  const { address: userAddress, isConnected } = useAccount()
  const { getTokenBalance } = useQuizContract()
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedToken, setSelectedToken] = useState<TokenOption | null>(null)
  const [tokenBalances, setTokenBalances] = useState<Record<string, TokenBalance>>({})
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter tokens based on search term and group by chain
  const filteredTokens = REWARD_TOKENS.filter(token => 
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Group tokens by chain
  const tokensByChain = filteredTokens.reduce((acc, token) => {
    if (!acc[token.chainId]) {
      acc[token.chainId] = []
    }
    acc[token.chainId].push(token)
    return acc
  }, {} as Record<number, TokenOption[]>)

  // Find selected token
  useEffect(() => {
    if (value) {
      const token = REWARD_TOKENS.find(t => t.address === value)
      setSelectedToken(token || null)
    } else {
      setSelectedToken(null)
    }
  }, [value])

  // Validate custom token when value changes
  useEffect(() => {
    if (value && value.length >= 42 && !REWARD_TOKENS.find(t => t.address === value)) {
      validateToken(value, chainId)
    } else if (value.length === 0) {
      clearTokenDetails()
    }
  }, [value, chainId, validateToken, clearTokenDetails])

  // Fetch token balances for visible tokens
  useEffect(() => {
    if (!showBalance || !isConnected || !userAddress) return

    const fetchBalances = async () => {
      const newBalances: Record<string, TokenBalance> = {}
      
      for (const token of filteredTokens) {
        if (token.chainId === chainId) {
          newBalances[token.address] = {
            address: token.address,
            balance: '0',
            formatted: '0',
            isLoading: true
          }
          
          try {
            const balance = await getTokenBalance(token.address as `0x${string}`, userAddress as `0x${string}`, token.chainId)
            newBalances[token.address] = {
              address: token.address,
              balance,
              formatted: parseFloat(balance).toFixed(4),
              isLoading: false
            }
          } catch (error) {
            console.error(`Error fetching balance for ${token.symbol}:`, error)
            newBalances[token.address] = {
              address: token.address,
              balance: '0',
              formatted: '0',
              isLoading: false
            }
          }
        }
      }
      
      setTokenBalances(newBalances)
    }

    fetchBalances()
  }, [filteredTokens, chainId, isConnected, userAddress, showBalance, getTokenBalance])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const getInputBorderColor = () => {
    if (error) return 'border-red-500'
    if (selectedToken) return 'border-green-500'
    return 'border-gray-300'
  }

  const getInputBgColor = () => {
    if (error) return 'bg-red-50'
    if (selectedToken) return 'bg-green-50'
    return 'bg-white'
  }

  const getChainIcon = (chainId: number) => {
    switch (chainId) {
      case 8453:
        return '🔵'
      case 42220:
        return '🌾'
      default:
        return '🌐'
    }
  }

  const handleTokenSelect = (token: TokenOption) => {
    onChange(token.address, {
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals
    })
    setSelectedToken(token)
    setIsOpen(false)
    setSearchTerm('')
  }

  const renderBalance = (tokenAddress: string) => {
    const balance = tokenBalances[tokenAddress]
    if (!balance) return null

    if (balance.isLoading) {
      return (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Loading...</span>
        </div>
      )
    }

    const hasBalance = parseFloat(balance.balance) > 0
    return (
      <div className={`flex items-center gap-1 text-xs ${hasBalance ? 'text-green-600' : 'text-gray-500'}`}>
        <Wallet className="w-3 h-3" />
        <span>{hasBalance ? balance.formatted : '0.0000'}</span>
      </div>
    )
  }

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
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
            {/* Search input */}
            <div className="sticky top-0 bg-white p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tokens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Token options grouped by chain */}
            <div className="p-2">
              {Object.entries(tokensByChain).map(([chainIdStr, tokens]) => (
                <div key={chainIdStr} className="mb-4">
                  <div className="flex items-center gap-2 mb-2 px-2">
                    <span className="text-lg">{getChainIcon(parseInt(chainIdStr))}</span>
                    <span className="text-sm font-medium text-gray-600">
                      {parseInt(chainIdStr) === 8453 ? 'Base' : parseInt(chainIdStr) === 42220 ? 'Celo' : `Chain ${chainIdStr}`}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {tokens.map((token) => (
                      <button
                        key={token.address}
                        onClick={() => handleTokenSelect(token)}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getChainIcon(token.chainId)}</span>
                          <div>
                            <div className="font-medium text-gray-900">{token.symbol}</div>
                            <div className="text-sm text-gray-500">{token.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          {showBalance && renderBalance(token.address)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Custom token input */}
              <div className="mt-4 p-3 border-t border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-2">Custom Token</div>
                <input
                  type="text"
                  placeholder="Enter token contract address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
                {searchTerm && searchTerm.length >= 42 && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">Custom token on {chainId === 8453 ? 'Base' : chainId === 42220 ? 'Celo' : `Chain ${chainId}`}</span>
                    </div>
                    {tokenDetails && (
                      <div className="mt-2 text-xs text-gray-500">
                        <div>Symbol: {tokenDetails.symbol}</div>
                        <div>Name: {tokenDetails.name}</div>
                        <div>Decimals: {tokenDetails.decimals}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <XCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Token details */}
      {tokenDetails && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="w-4 h-4" />
          Valid token: {tokenDetails.symbol} ({tokenDetails.name})
        </div>
      )}
    </div>
  )
}

export default EnhancedTokenSelector
