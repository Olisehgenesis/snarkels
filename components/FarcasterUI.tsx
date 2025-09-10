'use client'

import { useFarcaster } from './FarcasterProvider'
import { CheckCircle } from 'lucide-react'

interface FarcasterUIProps {
  children?: React.ReactNode
}

export function FarcasterUI({ children }: FarcasterUIProps) {
  const { isFarcasterApp, isReady, callReady } = useFarcaster()

  if (!isFarcasterApp) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      {children}
      
      {/* Farcaster-specific floating action buttons - Only show ready button in mini app */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="flex flex-col gap-4 farcaster-button-stack">
          {/* Ready button - shows when app isn't ready yet */}
          {!isReady && (
            <div className="relative group">
              <button
                onClick={callReady}
                className="farcaster-button farcaster-floating text-gray-700 p-4 rounded-2xl border-2 border-black bg-lime-300 hover:bg-lime-400 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px] transition-all duration-100"
                title="Dismiss Splash Screen"
              >
                <CheckCircle className="w-6 h-6" />
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full right-0 mb-2 px-3 py-2 text-gray-700 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none farcaster-tooltip">
                Dismiss Splash Screen
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-300"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

 