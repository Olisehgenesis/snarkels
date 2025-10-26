import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, type Address } from 'viem';
import { base, celo } from 'viem/chains';

// Supported chains mapping with fallback RPC endpoints
const SUPPORTED_CHAINS = {
  8453: { ...base, rpcUrls: { ...base.rpcUrls, default: { http: ['https://base.drpc.org'] } } }, // Base mainnet with fallback RPC
  42220: celo, // Celo mainnet
};

// Common ERC20 ABI for token operations
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {"name": "_owner", "type": "address"},
      {"name": "_spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"name": "", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  }
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, abi, functionName, args, chainId } = body;

    // Validate required parameters
    if (!address || !functionName || !chainId) {
      return NextResponse.json(
        { error: 'Missing required parameters: address, functionName, chainId' },
        { status: 400 }
      );
    }

    // Check if chain is supported
    const chain = SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS];
    if (!chain) {
      return NextResponse.json(
        { error: `Unsupported chain ID: ${chainId}. Supported chains: ${Object.keys(SUPPORTED_CHAINS).join(', ')}` },
        { status: 400 }
      );
    }

    // Create public client for the specified chain
    const publicClient = createPublicClient({
      chain,
      transport: http()
    });

    // Use provided ABI or default to ERC20 ABI
    const contractABI = abi || ERC20_ABI;

    console.log(`Reading contract on chain ${chainId}:`, {
      address,
      functionName,
      args: args || []
    });

    // Read contract data with retry mechanism for rate limiting
    let result;
    let lastError;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await publicClient.readContract({
          address: address as Address,
          abi: contractABI,
          functionName,
          args: args || []
        });
        
        console.log(`Contract read successful on chain ${chainId} (attempt ${attempt}):`, result);
        break;
      } catch (error: any) {
        lastError = error;
        console.log(`Contract read attempt ${attempt} failed:`, error.message);
        
        // If it's a rate limit error and we have more attempts, wait and retry
        if ((error.message?.includes('over rate limit') || error.message?.includes('429')) && attempt < 3) {
          console.log(`Rate limited, waiting ${attempt * 2} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }
        
        // For other errors or final attempt, throw the error
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      result: String(result), // Ensure result is serializable
      chainId,
      functionName
    });

  } catch (error: any) {
    console.error('Read contract error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to read contract';
    if (error.message?.includes('ContractFunctionExecutionError')) {
      errorMessage = 'Contract function execution failed - check if the function exists and parameters are correct';
    } else if (error.message?.includes('ContractFunctionRevertedError')) {
      errorMessage = 'Contract function reverted - check if the conditions are met for this function';
    } else if (error.message?.includes('InvalidAddressError')) {
      errorMessage = 'Invalid contract address provided';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.message 
      },
      { status: 500 }
    );
  }
} 