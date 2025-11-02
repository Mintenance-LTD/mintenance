import './globals.css'
import '../styles/responsive.css'
import '../styles/print.css'
import { Inter } from 'next/font/google'
import Script from 'next/script'
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
            <Script
              id="className-fix"
              strategy="beforeInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  // Fix for className.split() errors - runs before page interaction
                  (function() {
                    if (typeof window === 'undefined' || typeof Element === 'undefined') return;
                    
                    try {
                      // Ensure className always returns a string
                      const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'className') ||
                                        Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'className');
                      
                      if (descriptor && descriptor.get) {
                        const originalGet = descriptor.get;
                        Object.defineProperty(Element.prototype, 'className', {
                          get: function() {
                            try {
                              const value = originalGet.call(this);
                              if (typeof value === 'string') return value;
                              // Fallback to getAttribute if value is not a string
                              const attr = this.getAttribute?.('class');
                              return typeof attr === 'string' ? attr : '';
                            } catch (e) {
                              const attr = this.getAttribute?.('class');
                              return typeof attr === 'string' ? attr : '';
                            }
                          },
                          set: descriptor.set,
                          configurable: true,
                          enumerable: true,
                        });
                      }
                    } catch (e) {
                      // Silently fail if we can't patch
                    }
                  })();
                `,
              }}
            />
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
