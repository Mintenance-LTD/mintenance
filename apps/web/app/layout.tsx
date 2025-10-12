import './globals.css'
import CookieConsent from '../components/CookieConsent'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
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
          <body>
            <ErrorBoundary>
              {children}
              <CookieConsent />
              {/* <PerformanceDashboard /> */}
            </ErrorBoundary>
          </body>
        </html>
  )
}
