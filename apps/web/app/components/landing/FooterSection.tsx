import Link from 'next/link';
import Image from 'next/image';

/**
 * Footer with navigation links, company info, and legal details
 */
export function FooterSection() {
  return (
    <footer id="footer" className="bg-primary text-white" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Company Info */}
          <div>
            <div className="flex items-center mb-6">
              <Image 
                src="/assets/icon.png" 
                alt="Mintenance Logo" 
                width={40} 
                height={40} 
                className="w-10 h-10" 
              />
              <span className="ml-3 text-xl font-bold">Mintenance</span>
            </div>
            <p className="text-gray-400 mb-4">
              Connecting homeowners with trusted tradespeople across the UK.
            </p>
          </div>

          {/* For Homeowners */}
          <div>
            <h3 className="text-lg font-semibold mb-4">For Homeowners</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/register?role=homeowner" 
                  className="text-gray-400 hover:text-secondary transition-colors"
                >
                  Post a Job
                </Link>
              </li>
              <li>
                <a 
                  href="#how-it-works" 
                  className="text-gray-400 hover:text-secondary transition-colors"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a 
                  href="#services" 
                  className="text-gray-400 hover:text-secondary transition-colors"
                >
                  Browse Services
                </a>
              </li>
              <li>
                <Link 
                  href="/contractors" 
                  className="text-gray-400 hover:text-secondary transition-colors"
                >
                  Find Tradespeople
                </Link>
              </li>
            </ul>
          </div>

          {/* For Tradespeople */}
          <div>
            <h3 className="text-lg font-semibold mb-4">For Tradespeople</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/register?role=contractor" 
                  className="text-gray-400 hover:text-secondary transition-colors"
                >
                  Join as a Tradesperson
                </Link>
              </li>
              <li>
                <Link 
                  href="/jobs" 
                  className="text-gray-400 hover:text-secondary transition-colors"
                >
                  Find Jobs
                </Link>
              </li>
              <li>
                <a 
                  href="#features" 
                  className="text-gray-400 hover:text-secondary transition-colors"
                >
                  Features & Benefits
                </a>
              </li>
              <li>
                <Link 
                  href="/dashboard" 
                  className="text-gray-400 hover:text-secondary transition-colors"
                >
                  Business Dashboard
                </Link>
              </li>
              <li>
                <Link 
                  href="/about#success-stories" 
                  className="text-gray-400 hover:text-secondary transition-colors"
                >
                  Success Stories
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/about" 
                  className="text-gray-400 hover:text-secondary transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="text-gray-400 hover:text-secondary transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy" 
                  className="text-gray-400 hover:text-secondary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms" 
                  className="text-gray-400 hover:text-secondary transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link 
                  href="/help" 
                  className="text-gray-400 hover:text-secondary transition-colors"
                >
                  Help Centre
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Company Registration Details */}
        <div className="border-t border-gray-800 pt-8">
          <div className="text-center text-gray-400 text-sm space-y-2">
            <p className="font-semibold text-gray-300">MINTENANCE LTD</p>
            <p>Registered Office Address:</p>
            <p>Suite 2 J2 Business Park</p>
            <p>Bridge Hall Lane</p>
            <p>Bury, England, BL9 7NY</p>
            <p className="mt-4">Company No. 16542104</p>
            <p className="mt-6 text-gray-500">
              © {new Date().getFullYear()} Mintenance Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
