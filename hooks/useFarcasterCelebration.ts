'use client'

import { useState, useCallback } from 'react'
import { useFarcaster } from '@/components/FarcasterProvider'

interface CelebrationState {
  isVisible: boolean
  type: 'quiz_completed' | 'quiz_created' | 'high_score' | 'first_win' | 'streak' | null
  score?: number
  maxScore?: number
  position?: number
}

export function useFarcasterCelebration() {
  const { isInFarcasterContext, showToast } = useFarcaster()
  const [celebration, setCelebration] = useState<CelebrationState>({
    isVisible: false,
    type: null
  })

  const showCelebration = useCallback((
    type: 'quiz_completed' | 'quiz_created' | 'high_score' | 'first_win' | 'streak',
    options?: {
      score?: number
      maxScore?: number
      position?: number
    }
  ) => {
    if (!isInFarcasterContext()) {
      // Fallback for non-Farcaster users
      const messages = {
        quiz_completed: '🎉 Quiz completed! Great job!',
        quiz_created: '🚀 Quiz created successfully!',
        high_score: '🏆 High score achieved! You crushed it!',
        first_win: '🎊 First win! Congratulations!',
        streak: '🔥 Streak! You\'re on fire!'
      }
      showToast(messages[type])
      return
    }

    setCelebration({
      isVisible: true,
      type,
      ...options
    })
  }, [isInFarcasterContext, showToast])

  const hideCelebration = useCallback(() => {
    setCelebration(prev => ({
      ...prev,
      isVisible: false
    }))
  }, [])

  const resetCelebration = useCallback(() => {
    setCelebration({
      isVisible: false,
      type: null
    })
  }, [])

  // Auto-hide celebration after a delay
  const autoHideCelebration = useCallback((delay: number = 5000) => {
    if (celebration.isVisible) {
      setTimeout(() => {
        hideCelebration()
      }, delay)
    }
  }, [celebration.isVisible, hideCelebration])

  return {
    celebration,
    showCelebration,
    hideCelebration,
    resetCelebration,
    autoHideCelebration,
    isInFarcasterContext: isInFarcasterContext()
  }
}

export default useFarcasterCelebration
