'use client'

import { wagmiAdapter } from '@/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { base, celo } from '@reown/appkit/networks'
import React, { type ReactNode } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'

// Set up queryClient
const queryClient = new QueryClient()

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "48f6c31f2547205456c0abfa1fe6d7e3"

if (!projectId) {
  throw new Error('Project ID is not defined')
}

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  let initialState = undefined
  
  try {
    if (cookies) {
      initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)
    }
  } catch (error) {
    console.warn('Error parsing cookies for wagmi state:', error)
    // Continue without initial state if cookie parsing fails
  }

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider 