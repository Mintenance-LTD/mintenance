import './globals.css'
import '../styles/responsive.css'
import '../styles/print.css'
import '../styles/animations-enhanced.css'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import CookieConsent from '../components/CookieConsent'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { Providers } from './providers'
import { WebVitalsMonitor } from '../components/monitoring/WebVitalsMonitor'

// Material Symbols font for enhanced icon support
const materialSymbolsLink = (
  <link
    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
    rel="stylesheet"
  />
)

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
        {materialSymbolsLink}
      </head>
      <body className={inter.variable}>

        <Providers>
          <ErrorBoundary>
            {children}
            <CookieConsent />
            <WebVitalsMonitor />
            {/* <PerformanceDashboard /> */}
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  )
}
