'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'

interface FarcasterContextType {
  isFarcasterApp: boolean
  isReady: boolean
  context: any
  showToast: (message: string) => void
  composeCast: (text: string, embeds?: [] | [string] | [string, string]) => void
  callReady: () => Promise<void>
  // New enhanced features
  getUserDisplayName: () => string
  getUserEmoji: () => string
  getRandomEmoji: () => string
  isInFarcasterContext: () => boolean
  getLocationContext: () => string
}

const FarcasterContext = createContext<FarcasterContextType | undefined>(undefined)

export function useFarcaster() {
  const context = useContext(FarcasterContext)
  if (!context) {
    throw new Error('useFarcaster must be used within a FarcasterProvider')
  }
  return context
}

interface FarcasterProviderProps {
  children: ReactNode
}

export function FarcasterProvider({ children }: FarcasterProviderProps) {
  const [isFarcasterApp, setIsFarcasterApp] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [context, setContext] = useState<any>(null)

  // Cool emojis for Farcaster users
  const farcasterEmojis = ['🚀', '✨', '🎯', '🔥', '💫', '🌟', '⚡', '🎪', '🎭', '🎨', '🎵', '🎮', '🏆', '💎', '🌈', '🎊', '🎉', '🎁', '🎈', '🎠', '🎡', '🎢', '🎣', '🎤', '🎥', '🎦', '🎧', '🎨', '🎩', '🎪', '🎫', '🎬', '🎭', '🎮', '🎯', '🎲', '🎳', '🎴', '🎵', '🎶', '🎷', '🎸', '🎹', '🎺', '🎻', '🎼', '🎽', '🎾', '🎿', '🏀', '🏁', '🏂', '🏃', '🏄', '🏅', '🏆', '🏇', '🏈', '🏉', '🏊', '🏋️', '🏌️', '🏍️', '🏎️', '🏏', '🏐', '🏑', '🏒', '🏓', '🏔️', '🏕️', '🏖️', '🏗️', '🏘️', '🏙️', '🏚️', '🏛️', '🏜️', '🏝️', '🏞️', '🏟️', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏧', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏮', '🏯', '🏰', '🏱', '🏲', '🏳️', '🏴', '🏵️', '🏶', '🏷️', '🏸', '🏹', '🏺', '🏻', '🏼', '🏽', '🏾', '🏿']

  // Random emojis for non-Farcaster users
  const randomEmojis = ['🎯', '🧠', '💡', '🎪', '🎭', '🎨', '🎵', '🎮', '🏆', '💎', '🌈', '🎊', '🎉', '🎁', '🎈', '🎠', '🎡', '🎢', '🎣', '🎤', '🎥', '🎦', '🎧', '🎨', '🎩', '🎪', '🎫', '🎬', '🎭', '🎮', '🎯', '🎲', '🎳', '🎴', '🎵', '🎶', '🎷', '🎸', '🎹', '🎺', '🎻', '🎼', '🎽', '🎾', '🎿', '🏀', '🏁', '🏂', '🏃', '🏄', '🏅', '🏆', '🏇', '🏈', '🏉', '🏊', '🏋️', '🏌️', '🏍️', '🏎️', '🏏', '🏐', '🏑', '🏒', '🏓', '🏔️', '🏕️', '🏖️', '🏗️', '🏘️', '��️', '🏚️', '🏛️', '🏜️', '🏝️', '🏞️', '🏟️', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏧', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏮', '🏯', '🏰', '🏱', '🏲', '🏳️', '🏴', '🏵️', '🏶', '🏷️', '🏸', '🏹', '🏺', '🏻', '🏼', '🏽', '🏾', '🏿']

  useEffect(() => {
    const detectFarcasterApp = async () => {
      try {
        // Use the proper SDK method to detect Mini App
        const isMini = await sdk.isInMiniApp()
        
        if (isMini) {
          setIsFarcasterApp(true)
          
          // Get the context information
          const sdkContext = sdk.context
          setContext(sdkContext)
          
          console.log('Farcaster Mini App Context:', sdkContext)
          
          // Call ready() to hide the splash screen with retry logic
          let readyCalled = false
          let retryCount = 0
          const maxRetries = 3
          
          const callReady = async () => {
            try {
              if (!readyCalled && retryCount < maxRetries) {
                retryCount++
                console.log(`Attempting to call sdk.actions.ready() (attempt ${retryCount})`)
                
                await sdk.actions.ready()
                readyCalled = true
                console.log('Successfully called sdk.actions.ready() - splash screen should be hidden')
                setIsReady(true)
              }
            } catch (error) {
              console.error(`Error calling sdk.actions.ready() (attempt ${retryCount}):`, error)
              
              if (retryCount < maxRetries) {
                // Retry after a short delay
                setTimeout(callReady, 500)
              } else {
                console.error('Failed to call sdk.actions.ready() after all retries')
                setIsReady(true) // Set ready anyway to prevent blocking
              }
            }
          }
          
          // Call ready immediately
          await callReady()
          
          // Also set a fallback timeout to ensure ready is called
          setTimeout(() => {
            if (!readyCalled) {
              console.log('Fallback: calling sdk.actions.ready() after timeout')
              callReady()
            }
          }, 1000)
          
        } else {
          setIsReady(true)
        }
      } catch (error) {
        console.error('Error detecting Farcaster app:', error)
        setIsReady(true)
      }
    }

    detectFarcasterApp()
  }, [])

  const composeCast = async (text: string, embeds?: [] | [string] | [string, string]) => {
    if (isFarcasterApp) {
      try {
        const result = await sdk.actions.composeCast({
          text,
          embeds: embeds || []
        })
        
        if (result?.cast) {
          console.log('Cast posted successfully:', result.cast.hash)
          return result.cast
        } else {
          console.log('User cancelled cast')
        }
      } catch (error) {
        console.error('Error composing cast:', error)
        alert('Failed to compose cast')
      }
    } else {
      // Fallback for non-Farcaster environments
      alert('Cast feature available in Farcaster Mini App')
    }
  }

  const showToast = async (message: string) => {
    if (isFarcasterApp && context?.features?.haptics) {
      try {
        // Use Farcaster haptics if available
        await sdk.haptics.impactOccurred('medium')
      } catch (error) {
        console.log('Haptics not available, using fallback')
      }
    }
    // Fallback to browser alert for now
    alert(message)
  }

  const callReady = async () => {
    try {
      await sdk.actions.ready()
      setIsReady(true)
      console.log('Successfully called sdk.actions.ready() - splash screen should be hidden')
    } catch (error) {
      console.error('Failed to call sdk.actions.ready() manually:', error)
    }
  }

  // Enhanced Farcaster-specific functions
  const getUserDisplayName = (): string => {
    if (!isFarcasterApp || !context?.user) return ''
    
    const user = context.user
    if (user.displayName) return user.displayName
    if (user.username) return user.username
    return `FID: ${user.fid}`
  }

  const getUserEmoji = (): string => {
    if (!isFarcasterApp || !context?.user) return getRandomEmoji()
    
    // Use FID to generate consistent emoji for the same user
    const user = context.user
    const emojiIndex = user.fid % farcasterEmojis.length
    return farcasterEmojis[emojiIndex]
  }

  const getRandomEmoji = (): string => {
    const randomIndex = Math.floor(Math.random() * randomEmojis.length)
    return randomEmojis[randomIndex]
  }

  const isInFarcasterContext = (): boolean => {
    return isFarcasterApp && !!context?.user
  }

  const getLocationContext = (): string => {
    if (!isFarcasterApp || !context?.location) return 'Social Feed'
    
    const location = context.location
    switch (location.type) {
      case 'cast_embed':
        return `Cast by ${location.cast?.author?.displayName || location.cast?.author?.username || 'Unknown'}`
      case 'cast_share':
        return `Shared from ${location.cast?.author?.displayName || location.cast?.author?.username || 'Unknown'}`
      case 'notification':
        return 'Notification'
      case 'launcher':
        return 'Launcher'
      case 'channel':
        return `Channel: ${location.channel?.name || 'Unknown'}`
      case 'open_miniapp':
        return `From ${location.referrerDomain}`
      default:
        return 'Social Feed'
    }
  }

  const value: FarcasterContextType = {
    isFarcasterApp,
    isReady,
    context,
    showToast,
    composeCast,
    callReady,
    getUserDisplayName,
    getUserEmoji,
    getRandomEmoji,
    isInFarcasterContext,
    getLocationContext,
  }

  return (
    <FarcasterContext.Provider value={value}>
      {children}
    </FarcasterContext.Provider>
  )
} 