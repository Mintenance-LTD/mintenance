'use client';

import Link from 'next/link';
import { SERVICES } from './constants';

export function FooterSection() {
  return (
    <footer className="bg-gray-900 text-white py-16" data-animate>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div>
            <h3 className="font-semibold text-lg mb-4">Company</h3>
            <ul className="space-y-3">
              {['About', 'Careers', 'Press', 'Blog'].map((item) => (
                <li key={item}>
                  <Link href={`/${item.toLowerCase()}`} className="text-gray-400 hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Support</h3>
            <ul className="space-y-3">
              {['Help Centre', 'Safety', 'Contact Us', 'FAQs'].map((item) => (
                <li key={item}>
                  <Link href={`/${item.toLowerCase().replace(' ', '-')}`} className="text-gray-400 hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Services</h3>
            <ul className="space-y-3">
              {SERVICES.slice(0, 4).map((service) => (
                <li key={service}>
                  <Link href={`/contractors?service=${service}`} className="text-gray-400 hover:text-white transition-colors">
                    {service}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Legal</h3>
            <ul className="space-y-3">
              {['Terms', 'Privacy', 'Cookies', 'Licenses'].map((item) => (
                <li key={item}>
                  <Link href={`/${item.toLowerCase()}`} className="text-gray-400 hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">
            © 2025 Mintenance. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {['Twitter', 'Facebook', 'Instagram', 'LinkedIn'].map((social) => (
              <Link
                key={social}
                href={`https://${social.toLowerCase()}.com/mintenance`}
                className="text-gray-400 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {social}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
