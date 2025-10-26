'use client'

import React, { useState, useEffect } from 'react'
import { useFarcaster } from './FarcasterProvider'
import { Trophy, Star, Sparkles, Rocket, FireExtinguisher, Zap, Heart, Crown, Medal } from 'lucide-react'

interface FarcasterCelebrationProps {
  type: 'quiz_completed' | 'quiz_created' | 'high_score' | 'first_win' | 'streak'
  score?: number
  maxScore?: number
  position?: number
  onClose?: () => void
  className?: string
}

const celebrationConfigs = {
  quiz_completed: {
    title: 'Quiz Completed! 🎉',
    subtitle: 'Great job completing the quiz!',
    emojis: ['🎯', '🧠', '💡', '🎪', '🎭', '🎨', '🎵', '🎮', '🏆', '💎'],
    colors: 'from-green-400 to-blue-500',
    icon: Trophy
  },
  quiz_created: {
    title: 'Quiz Created! 🚀',
    subtitle: 'Your quiz is now live and ready!',
    emojis: ['✨', '🌟', '⚡', '🎊', '🎉', '🎁', '🎈', '🎠', '🎡', '🎢'],
    colors: 'from-purple-400 to-pink-500',
    icon: Star
  },
  high_score: {
    title: 'High Score! 🏆',
    subtitle: 'You crushed it!',
    emojis: ['🔥', '💫', '🌟', '⚡', '💎', '🏅', '👑', '🎖️', '🥇', '💪'],
    colors: 'from-yellow-400 to-orange-500',
    icon: Crown
  },
  first_win: {
    title: 'First Win! 🎊',
    subtitle: 'Congratulations on your first victory!',
    emojis: ['🎉', '🎊', '🎁', '🎈', '🎠', '🎡', '🎢', '🎣', '🎤', '🎥'],
    colors: 'from-pink-400 to-red-500',
    icon: Heart
  },
  streak: {
    title: 'Streak! 🔥',
    subtitle: 'You\'re on fire!',
    emojis: ['🔥', '⚡', '💥', '💫', '🌟', '✨', '💎', '🏆', '👑', '💪'],
    colors: 'from-red-400 to-orange-500',
    icon: FireExtinguisher
  }
}

export function FarcasterCelebration({ 
  type, 
  score, 
  maxScore, 
  position, 
  onClose, 
  className = '' 
}: FarcasterCelebrationProps) {
  const { isInFarcasterContext, getUserEmoji, getRandomEmoji } = useFarcaster()
  const [isVisible, setIsVisible] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [floatingEmojis, setFloatingEmojis] = useState<Array<{ id: number; emoji: string; x: number; y: number; delay: number }>>([])

  const config = celebrationConfigs[type]
  const IconComponent = config.icon

  useEffect(() => {
    // Show celebration with delay for dramatic effect
    const timer = setTimeout(() => {
      setIsVisible(true)
      setShowEmojis(true)
      generateFloatingEmojis()
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  const generateFloatingEmojis = () => {
    const emojis = []
    for (let i = 0; i < 15; i++) {
      emojis.push({
        id: i,
        emoji: isInFarcasterContext() ? getUserEmoji() : getRandomEmoji(),
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2
      })
    }
    setFloatingEmojis(emojis)
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose?.()
    }, 300)
  }

  if (!isVisible) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Main celebration card */}
      <div className="relative bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
        {/* Floating emojis background */}
        {showEmojis && (
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            {floatingEmojis.map((emoji) => (
              <div
                key={emoji.id}
                className="absolute text-2xl animate-bounce"
                style={{
                  left: `${emoji.x}%`,
                  top: `${emoji.y}%`,
                  animationDelay: `${emoji.delay}s`,
                  animationDuration: '2s'
                }}
              >
                {emoji.emoji}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 text-center">
          {/* Icon */}
          <div className={`w-20 h-20 mx-auto mb-6 bg-gradient-to-r ${config.colors} rounded-full flex items-center justify-center shadow-lg`}>
            <IconComponent className="w-10 h-10 text-white" />
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {config.title}
          </h2>

          {/* Subtitle */}
          <p className="text-lg text-gray-600 mb-6">
            {config.subtitle}
          </p>

          {/* Score display */}
          {score !== undefined && maxScore !== undefined && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 mb-6 border border-blue-200">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {score}/{maxScore}
              </div>
              <div className="text-sm text-blue-500">
                {Math.round((score / maxScore) * 100)}% Score
              </div>
            </div>
          )}

          {/* Position display */}
          {position !== undefined && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-4 mb-6 border border-yellow-200">
              <div className="text-4xl font-bold text-yellow-600 mb-2">
                #{position}
              </div>
              <div className="text-sm text-yellow-500">
                {position === 1 ? '🥇 Winner!' : position === 2 ? '🥈 Runner Up!' : position === 3 ? '🥉 Third Place!' : 'Great Job!'}
              </div>
            </div>
          )}

          {/* Farcaster-specific elements */}
          {isInFarcasterContext() && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 mb-6 border border-blue-200">
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <Sparkles className="w-5 h-5" />
                <span className="font-medium">Farcaster Mini App</span>
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-sm text-blue-500 mt-1">
                Share your achievement with the community!
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl transition-colors"
            >
              Continue
            </button>
            {isInFarcasterContext() && (
              <button
                onClick={() => {
                  // TODO: Implement share functionality
                  console.log('Share achievement')
                }}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-xl transition-colors shadow-lg"
              >
                Share 🚀
              </button>
            )}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
        >
          <span className="text-gray-500 text-lg">×</span>
        </button>
      </div>
    </div>
  )
}

export default FarcasterCelebration
