'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useFarcaster } from './FarcasterProvider'

type Props = { children: React.ReactNode }

export default function AccountModalProvider({ children }: Props) {
  const { address, isConnected } = useAccount()
  const { isInFarcasterContext, getUserDisplayName, getUserEmoji } = useFarcaster()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const wallet = useMemo(() => address?.toLowerCase() ?? '', [address])

  useEffect(() => {
    let aborted = false
    async function ensureAccount() {
      if (!isConnected || !wallet) return
      
      // If in Farcaster context, auto-fill the name
      if (isInFarcasterContext()) {
        const farcasterName = getUserDisplayName()
        if (farcasterName) {
          setName(farcasterName)
        }
      }
      
      try {
        const res = await fetch(`/api/account?wallet=${wallet}`, { cache: 'no-store' })
        const data = await res.json()
        if (!aborted) {
          if (!data.exists) {
            setIsOpen(true)
          } else if (!data.name) {
            setIsOpen(true)
          }
        }
      } catch (e) {
        // Open modal to allow user to retry creating
        if (!aborted) setIsOpen(true)
      }
    }
    ensureAccount()
    return () => {
      aborted = true
    }
  }, [isConnected, wallet, isInFarcasterContext, getUserDisplayName])

  async function saveProfile() {
    if (!wallet) return
    setLoading(true)
    try {
      const res = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, name: name || null, metadata: {} }),
      })
      if (res.ok) {
        setIsOpen(false)
      }
    } finally {
      setLoading(false)
    }
  }

  // Auto-save if in Farcaster context and we have a name
  useEffect(() => {
    if (isInFarcasterContext() && name && isConnected && wallet && !isOpen) {
      saveProfile()
    }
  }, [isInFarcasterContext, name, isConnected, wallet, isOpen])

  return (
    <>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-2 text-xl font-bold">Create your profile</h2>
            <p className="mb-4 text-sm text-gray-600">
              {isInFarcasterContext() 
                ? "We'll use your Farcaster profile. You can customize it below if you'd like."
                : "Set a display name. You can use emojis. You can change it later."
              }
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isInFarcasterContext() ? "Your name ✨" : "Your name ✨"}
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                disabled={loading}
              >
                Skip
              </button>
              <button
                onClick={saveProfile}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


