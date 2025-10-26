import type { Hex } from 'viem'

const DIVVI_CONSUMER_ADDRESS: `0x${string}` = '0x53eaF4CD171842d8144e45211308e5D90B4b0088'

// Always safe: return empty suffix if SDK is unavailable
// @ts-ignore - downstream consumers accept Hex '0x' as no-op suffix
export function getReferralDataSuffix(_providers: `0x${string}`[] = []): Hex {
  return '0x' as Hex
}

export async function submitDivviReferral(txHash: Hex, chainId: number): Promise<void> {
  try {
    // Dynamically import to avoid build-time coupling
    const mod = await import('@divvi/referral-sdk') as any
    if (mod && typeof mod.submitReferral === 'function') {
      await mod.submitReferral({ txHash, chainId })
    }
  } catch {
    // no-op; attribution errors must not break main flow
  }
}


