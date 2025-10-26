import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, getContract, parseAbi } from 'viem';
import { base, celo } from 'viem/chains';

interface TokenValidationRequest {
  tokenAddress: string;
  chainId: number;
}

interface TokenValidationResponse {
  isValid: boolean;
  name?: string;
  symbol?: string;
  decimals?: number;
  error?: string;
}

// ERC-20 Token ABI for basic token functions
const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
]);

// Chain configuration
const CHAINS = {
  42220: celo,
  8453: base,
};

export async function POST(request: NextRequest) {
  try {
    const body: TokenValidationRequest = await request.json();
    const { tokenAddress, chainId } = body;

    // Basic validation
    if (!tokenAddress || tokenAddress.length < 42) {
      return NextResponse.json({
        isValid: false,
        error: 'Invalid token address format'
      });
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      return NextResponse.json({
        isValid: false,
        error: 'Invalid Ethereum address format'
      });
    }

    // Get chain configuration
    const chain = CHAINS[chainId as keyof typeof CHAINS];
    if (!chain) {
      return NextResponse.json({
        isValid: false,
        error: 'Unsupported network'
      });
    }

    // Create public client
    const client = createPublicClient({
      chain,
      transport: http(),
    });

    try {
      // Create contract instance
      const contract = getContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        client,
      });

      // Query token details
      const [name, symbol, decimals] = await Promise.all([
        contract.read.name(),
        contract.read.symbol(),
        contract.read.decimals(),
      ]);

      // Validate that we got meaningful data
      if (!name || !symbol || decimals === undefined) {
        return NextResponse.json({
          isValid: false,
          error: 'Token contract does not implement required ERC-20 functions'
        });
      }

      return NextResponse.json({
        isValid: true,
        name: name.toString(),
        symbol: symbol.toString(),
        decimals: Number(decimals),
      });

    } catch (contractError: any) {
      // If contract calls fail, the token might not be a valid ERC-20
      console.error('Contract error:', contractError);
      
      return NextResponse.json({
        isValid: false,
        error: 'Token not found or not a valid ERC-20 token on this network'
      });
    }

  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json({
      isValid: false,
      error: 'Failed to validate token - network error'
    }, { status: 500 });
  }
} 