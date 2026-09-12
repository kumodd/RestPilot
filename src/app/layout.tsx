import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from '@/components/layout/Providers'

export const viewport: Viewport = {
  themeColor: '#FF6B35',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: {
    default: 'RestPilot — Smart Restaurant Ordering',
    template: '%s | RestPilot',
  },
  description:
    'QR-based digital ordering with waiter-verified service. Scan, order, and track your food in real time.',
  keywords: ['restaurant ordering', 'QR menu', 'digital menu', 'restaurant management'],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'RestPilot',
    title: 'RestPilot — Smart Restaurant Ordering',
    description: 'QR-based digital ordering with waiter-verified service.',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
