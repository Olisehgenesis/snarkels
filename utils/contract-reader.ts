import { type Address } from 'viem';

interface ReadContractParams {
  address: Address;
  abi?: any[];
  functionName: string;
  args?: any[];
  chainId: number;
}

interface ReadContractResponse {
  success: boolean;
  result?: any;
  error?: string;
  chainId?: number;
  functionName?: string;
}

/**
 * Read contract data using the backend API endpoint
 * This allows for cross-chain contract reads without needing to create
 * multiple public clients in the frontend
 */
export async function readContract(params: ReadContractParams): Promise<ReadContractResponse> {
  try {
    const response = await fetch('/api/read-contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to read contract'
      };
    }

    const data = await response.json();
    return {
      success: true,
      result: data.result,
      chainId: data.chainId,
      functionName: data.functionName
    };

  } catch (error: any) {
    console.error('Read contract error:', error);
    return {
      success: false,
      error: error.message || 'Failed to read contract'
    };
  }
}

/**
 * Read ERC20 token balance
 */
export async function readTokenBalance(
  tokenAddress: Address,
  userAddress: Address,
  chainId: number
): Promise<string> {
  const result = await readContract({
    address: tokenAddress,
    functionName: 'balanceOf',
    args: [userAddress],
    chainId
  });

  if (!result.success) {
    console.error('Failed to read token balance:', result.error);
    return '0';
  }

  return result.result.toString();
}

/**
 * Read ERC20 token allowance
 */
export async function readTokenAllowance(
  tokenAddress: Address,
  ownerAddress: Address,
  spenderAddress: Address,
  chainId: number
): Promise<string> {
  const result = await readContract({
    address: tokenAddress,
    functionName: 'allowance',
    args: [ownerAddress, spenderAddress],
    chainId
  });

  if (!result.success) {
    console.error('Failed to read token allowance:', result.error);
    return '0';
  }

  return result.result.toString();
}

/**
 * Read ERC20 token decimals
 */
export async function readTokenDecimals(
  tokenAddress: Address,
  chainId: number
): Promise<number> {
  const result = await readContract({
    address: tokenAddress,
    functionName: 'decimals',
    args: [],
    chainId
  });

  if (!result.success) {
    console.error('Failed to read token decimals:', result.error);
    return 18; // Default to 18 decimals
  }

  return Number(result.result);
}

/**
 * Read ERC20 token symbol
 */
export async function readTokenSymbol(
  tokenAddress: Address,
  chainId: number
): Promise<string> {
  const result = await readContract({
    address: tokenAddress,
    functionName: 'symbol',
    args: [],
    chainId
  });

  if (!result.success) {
    console.error('Failed to read token symbol:', result.error);
    return 'UNKNOWN';
  }

  return result.result;
} 