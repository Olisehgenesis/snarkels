import { Inter } from 'next/font/google'
import './globals.css'
import ContextProvider from '@/context'
import AccountModalProvider from '@/components/AccountModalProvider'
import { FarcasterProvider } from '@/components/FarcasterProvider'
import MiniAppWrapper from '@/components/MiniAppWrapper'
import AppKitProvider from '@/components/AppKitProvider'
import { cookies } from 'next/headers'
import ClientLayout from '@/components/ClientLayout'

const inter = Inter({ subsets: ['latin'] })

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get cookies for wagmi state persistence
  const cookieStore = await cookies()
  let cookieString: string | null = null
  
  try {
    // Get all cookies and convert to a proper format
    const allCookies = cookieStore.getAll()
    if (allCookies.length > 0) {
      // Convert cookies to a format that wagmi can understand
      cookieString = allCookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')
    }
  } catch (error) {
    console.warn('Error processing cookies:', error)
    cookieString = null
  }

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
        <title>Snarkels - Quiz Rewards</title>
        <meta name="description" content="On-chain Snarkels rewards users in interactive sessions with ERC20 tokens on Base and Celo networks" />
        
        {/* Farcaster Mini App Embed Meta Tags */}
        <meta name="fc:miniapp" content='{"version":"1","imageUrl":"https://snarkels.lol/api/og","button":{"title":"🎯 Play a Snarkel","action":{"type":"launch_miniapp","url":"https://snarkels.lol","name":"Snarkels","splashImageUrl":"https://snarkels.lol/logo.png","splashBackgroundColor":"#1f2937"}}}' />
        <meta name="fc:frame" content='{"version":"1","imageUrl":"https://snarkels.lol/api/og","button":{"title":"🎯 Play a Snarkel","action":{"type":"launch_frame","url":"https://snarkels.lol","name":"Snarkels","splashImageUrl":"https://snarkels.lol/logo.png","splashBackgroundColor":"#1f2937"}}}' />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Social Media Meta Tags */}
        <meta property="og:title" content="Snarkels - Interactive Quiz Rewards" />
        <meta property="og:description" content="On-chain Snarkels rewards users in interactive sessions with ERC20 tokens on Base and Celo networks" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://snarkels.lol" />
        <meta property="og:image" content="https://snarkels.lol/api/og" />
        
        {/* Twitter Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Snarkels - Interactive Quiz Rewards" />
        <meta name="twitter:description" content="On-chain Snarkels rewards users in interactive sessions with ERC20 tokens on Base and Celo networks" />
        <meta name="twitter:image" content="https://snarkels.lol/api/og" />
      </head>
      <body 
        className={`${inter.className}`} 
      >
        <ContextProvider cookies={cookieString}>
          <MiniAppWrapper>
            <FarcasterProvider>
              <AppKitProvider>
                <ClientLayout>
                  <AccountModalProvider>
                    {children}
                  </AccountModalProvider>
                </ClientLayout>
              </AppKitProvider>
            </FarcasterProvider>
          </MiniAppWrapper>
        </ContextProvider>
      </body>
    </html>
  )
}
