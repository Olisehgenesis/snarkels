'use client'

import React from 'react'
import { useFarcaster } from './FarcasterProvider'
import { User, Crown, Star } from 'lucide-react'

interface FarcasterUserProfileProps {
  className?: string
  showPfp?: boolean
  showEmoji?: boolean
  showFid?: boolean
  compact?: boolean
  variant?: 'default' | 'card' | 'inline'
}

export function FarcasterUserProfile({ 
  className = '',
  showPfp = true,
  showEmoji = true,
  showFid = false,
  compact = false,
  variant = 'default'
}: FarcasterUserProfileProps) {
  const { 
    isInFarcasterContext, 
    getUserDisplayName, 
    getUserEmoji, 
    getRandomEmoji,
    context 
  } = useFarcaster()

  if (!isInFarcasterContext()) {
    return null
  }

  const user = context.user
  const displayName = getUserDisplayName()
  const emoji = getUserEmoji()
  const isAdded = context.client?.added

  const renderProfile = () => {
    switch (variant) {
      case 'card':
        return (
          <div className={`text-gray-800 rounded-xl p-4 ${className}`}>
            <div className="flex items-center gap-3">
              {showPfp && user.pfpUrl && (
                <img 
                  src={user.pfpUrl} 
                  alt="Profile" 
                  className="w-12 h-12 rounded-full border-2 border-gray-300"
                />
              )}
              {showPfp && !user.pfpUrl && (
                <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-gray-300">
                  <User className="w-6 h-6 text-gray-600" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-lg">
                    {showEmoji && emoji} {displayName}
                  </span>
                  {isAdded && (
                    <Star className="w-4 h-4 text-yellow-300" />
                  )}
                </div>
                {showFid && (
                  <p className="text-gray-600 text-sm">FID: {user.fid}</p>
                )}
              </div>
            </div>
          </div>
        )

      case 'inline':
        return (
          <div className={`flex items-center gap-2 ${className}`}>
            {showPfp && user.pfpUrl && (
              <img 
                src={user.pfpUrl} 
                alt="Profile" 
                className="w-6 h-6 rounded-full border border-gray-300"
              />
            )}
            <span className="font-medium text-gray-800">
              {showEmoji && emoji} {displayName}
            </span>
            {isAdded && (
              <Star className="w-3 h-3 text-yellow-500" />
            )}
          </div>
        )

      default:
        return (
          <div className={`rounded-lg p-3 ${className}`}>
            <div className="flex items-center gap-3">
              {showPfp && user.pfpUrl && (
                <img 
                  src={user.pfpUrl} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full border-2 border-gray-300"
                />
              )}
              {showPfp && !user.pfpUrl && (
                <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-gray-300">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">
                    {showEmoji && emoji} {displayName}
                  </span>
                  {isAdded && (
                    <Star className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                {showFid && (
                  <p className="text-gray-500 text-sm">FID: {user.fid}</p>
                )}
              </div>
            </div>
          </div>
        )
    }
  }

  return renderProfile()
}

export default FarcasterUserProfile
