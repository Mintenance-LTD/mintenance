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
        <html lang="en">
          <head>
            {materialSymbolsLink}
          </head>
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
                              // Handle DOMTokenList (SVG elements in some browsers)
                              if (value && typeof value === 'object') {
                                if ('value' in value && typeof value.value === 'string') {
                                  return value.value;
                                }
                                if ('toString' in value && typeof value.toString === 'function') {
                                  return String(value);
                                }
                              }
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
                      console.warn('className fix failed:', e);
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
