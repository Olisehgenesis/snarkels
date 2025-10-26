'use client'

import { useFarcaster } from './FarcasterProvider'
import { User, Smartphone, MapPin, Bell, Zap, X } from 'lucide-react'
import { useState } from 'react'

export function FarcasterContextDisplay() {
  const { isFarcasterApp, context } = useFarcaster()
  const [isVisible, setIsVisible] = useState(true)

  if (!isFarcasterApp || !context || !isVisible) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm farcaster-context">
      <div className="bg-gradient-to-br from-blue-600 to-slate-500 text-white rounded-2xl p-4 shadow-2xl border border-blue-300 relative farcaster-debug">
        {/* Close button */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors farcaster-button"
        >
          <X className="w-3 h-3" />
        </button>
        
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-200" />
          Farcaster Context
        </h3>
        
        <div className="space-y-3 text-xs">
          {/* User Info */}
          {context.user && (
            <div className="flex items-center gap-2 bg-white/20 rounded-lg p-2">
              <User className="w-3 h-3 text-blue-200" />
              <span className="text-blue-50">
                {context.user.displayName || context.user.username || `FID: ${context.user.fid}`}
              </span>
            </div>
          )}
          
          {/* Client Info */}
          {context.client && (
            <div className="flex items-center gap-2 bg-white/20 rounded-lg p-2">
              <Smartphone className="w-3 h-3 text-emerald-300" />
              <span className="text-blue-50">
                {context.client.platformType || 'unknown'} • Added: {context.client.added ? 'Yes' : 'No'}
              </span>
            </div>
          )}
          
          {/* Location Context */}
          {context.location && (
            <div className="flex items-center gap-2 bg-white/20 rounded-lg p-2">
              <MapPin className="w-3 h-3 text-red-300" />
              <span className="text-blue-50">
                {context.location.type}
                {context.location.type === 'cast_embed' && context.location.cast && (
                  <span> • by {context.location.cast.author.displayName || context.location.cast.author.username}</span>
                )}
              </span>
            </div>
          )}
          
          {/* Features */}
          {context.features && (
            <div className="flex items-center gap-2 bg-white/20 rounded-lg p-2">
              <Bell className="w-3 h-3 text-purple-300" />
              <span className="text-blue-50">
                Haptics: {context.features.haptics ? 'Yes' : 'No'}
                {context.features.cameraAndMicrophoneAccess !== undefined && (
                  <span> • Camera: {context.features.cameraAndMicrophoneAccess ? 'Yes' : 'No'}</span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function FarcasterUserInfo() {
  const { isFarcasterApp, context } = useFarcaster()

  if (!isFarcasterApp || !context?.user) {
    return null
  }

  return (
    <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-slate-500 text-white rounded-xl px-3 py-2 shadow-lg border border-blue-300">
      {context.user.pfpUrl && (
        <img 
          src={context.user.pfpUrl} 
          alt="Profile" 
          className="w-6 h-6 rounded-full border-2 border-blue-200"
        />
      )}
      <span className="text-sm font-medium text-white">
        {context.user.displayName || context.user.username || `FID: ${context.user.fid}`}
      </span>
    </div>
  )
} 