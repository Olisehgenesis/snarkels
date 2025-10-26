'use client'

import { useFarcaster } from '@/components/FarcasterProvider'

interface ClientLayoutProps {
  children: React.ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const { isFarcasterApp, context } = useFarcaster()

  return (
    <div 
      className="min-h-screen"
      style={{
        paddingTop: isFarcasterApp ? (context?.client?.safeAreaInsets?.top ?? 0) : 0,
        paddingBottom: isFarcasterApp ? (context?.client?.safeAreaInsets?.bottom ?? 0) : 0,
        paddingLeft: isFarcasterApp ? (context?.client?.safeAreaInsets?.left ?? 0) : 0,
        paddingRight: isFarcasterApp ? (context?.client?.safeAreaInsets?.right ?? 0) : 0,
      }}
    >
      {children}
    </div>
  )
}
