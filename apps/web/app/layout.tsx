import './globals.css'
import '../styles/professional-design-system.css'
import '../styles/responsive.css'
import '../styles/print.css'
import '../styles/animations-enhanced.css'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import CookieConsent from '../components/CookieConsent'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { ChunkLoadErrorBoundary } from '../components/ChunkLoadErrorBoundary'
import { Providers } from './providers'
import { WebVitalsMonitor } from '../components/monitoring/WebVitalsMonitor'
import { ChunkRetryHandler } from './chunk-retry-handler'
import { SessionMonitor } from '../components/session/SessionMonitor'

// Material Symbols font — async loading to avoid render-blocking
const materialSymbolsUrl =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap'

// Optimize font loading
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})
// import { PerformanceDashboard } from '../components/PerformanceDashboard' // Temporarily disabled for testing

export const metadata = {
  title: 'Mintenance - Find Trusted Contractors For Your Home Projects',
  description: 'Connect with verified contractors, get instant quotes, and manage your home maintenance projects. Powered by AI.',
  icons: {
    icon: '/assets/favicon.png',
    apple: '/assets/icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to frequently-used origins for faster resource fetch */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        )}
        <link rel="preconnect" href="https://js.stripe.com" />
        {/* Preload the stylesheet so the browser fetches it early without blocking render */}
        <link rel="preload" href={materialSymbolsUrl} as="style" crossOrigin="anonymous" />
        {/*
          Async font loading: media="print" prevents render-blocking.
          The inline script below swaps it to media="all" once loaded.
          Note: dangerouslySetInnerHTML is safe here — content is a static string, not user input.
        */}
        <link
          rel="stylesheet"
          href={materialSymbolsUrl}
          media="print"
          crossOrigin="anonymous"
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              'document.addEventListener("DOMContentLoaded",function(){' +
              'document.querySelectorAll(\'link[media="print"][rel="stylesheet"]\')' +
              '.forEach(function(l){l.media="all"})});',
          }}
        />
        {/* Fallback for users with JS disabled */}
        <noscript>
          <link rel="stylesheet" href={materialSymbolsUrl} />
        </noscript>
      </head>
      <body className={inter.variable}>
        {/* Skip-to-content link for keyboard and screen reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-white focus:text-teal-700 focus:rounded-lg focus:shadow-lg focus:font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          Skip to content
        </a>
        <ChunkLoadErrorBoundary>
          <Providers>
            <ChunkRetryHandler />
            <ErrorBoundary>
              {children}
              <CookieConsent />
              <WebVitalsMonitor />
              <SessionMonitor />
              {/* <PerformanceDashboard /> */}
            </ErrorBoundary>
          </Providers>
        </ChunkLoadErrorBoundary>
      </body>
    </html>
  )
}
