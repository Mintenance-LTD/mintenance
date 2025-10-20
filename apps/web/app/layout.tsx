import './globals.css'
import { Inter } from 'next/font/google'
import CookieConsent from '../components/CookieConsent'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { Providers } from './providers'
import { WebVitalsMonitor } from '../components/monitoring/WebVitalsMonitor'

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
        <html lang="en">
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
