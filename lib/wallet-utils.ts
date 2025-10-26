/**
 * Wallet address validation utilities
 */

/**
 * Validates if a string is a valid Ethereum wallet address
 * @param address - The wallet address to validate
 * @returns true if valid, false otherwise
 */
export function isValidWalletAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // Check if it starts with 0x and has correct length
  if (!address.startsWith('0x') || address.length !== 42) {
    return false;
  }
  
  // Check if it contains only valid hex characters
  const hexRegex = /^0x[a-fA-F0-9]{40}$/;
  return hexRegex.test(address);
}

/**
 * Normalizes a wallet address to lowercase
 * @param address - The wallet address to normalize
 * @returns The normalized address or null if invalid
 */
export function normalizeWalletAddress(address: string): string | null {
  if (!isValidWalletAddress(address)) {
    return null;
  }
  
  return address.toLowerCase();
}

/**
 * Formats a wallet address for display (truncated)
 * @param address - The wallet address to format
 * @returns Formatted address like "0x1234...5678"
 */
export function formatWalletAddress(address: string): string {
  if (!isValidWalletAddress(address)) {
    return 'Invalid Address';
  }
  
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Validates and throws an error if wallet address is invalid
 * @param address - The wallet address to validate
 * @param context - Context for the error message
 * @throws Error if address is invalid
 */
export function validateWalletAddressOrThrow(address: string, context: string = 'wallet address'): void {
  if (!isValidWalletAddress(address)) {
    throw new Error(`Invalid ${context}: ${address}`);
  }
} 