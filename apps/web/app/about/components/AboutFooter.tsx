import Link from 'next/link';
import Logo from '../../components/Logo';

/**
 * About Page Footer Component
 */
export function AboutFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-white py-12" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="flex items-center justify-center mb-6">
          <Logo />
          <span className="ml-3 text-xl font-bold">Mintenance</span>
        </div>
        <nav aria-label="Footer navigation">
          <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm">
            <Link href="/" className="text-gray-400 hover:text-secondary transition-colors">
              Home
            </Link>
            <Link href="/privacy" className="text-gray-400 hover:text-secondary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-secondary transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="text-gray-400 hover:text-secondary transition-colors">
              Contact
            </Link>
          </div>
        </nav>
        <p className="text-gray-500 text-sm">
          © {currentYear} Mintenance Ltd. All rights reserved. Company No. 16542104
        </p>
      </div>
    </footer>
  );
}

