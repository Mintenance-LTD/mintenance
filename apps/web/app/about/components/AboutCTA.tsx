import Link from 'next/link';
import { Button } from '@/components/ui/Button';

/**
 * Call-to-Action Section
 */
export function AboutCTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-secondary to-secondary-dark" aria-labelledby="cta-heading">
      <div className="max-w-4xl mx-auto text-center">
        <h2 id="cta-heading" className="text-4xl md:text-5xl font-bold text-white mb-6">
          Join Our Growing Community
        </h2>
        <p className="text-xl text-white/90 mb-10">
          Whether you're a homeowner looking for reliable tradespeople or a skilled professional seeking new opportunities,
          Mintenance is here to help you succeed.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Link href="/register?role=homeowner">
            <Button variant="primary" size="lg" className="bg-white text-secondary hover:bg-gray-100">
              Get Started as a Homeowner
            </Button>
          </Link>
          <Link href="/register?role=contractor">
            <Button variant="primary" size="lg" className="bg-primary text-white hover:bg-primary-light">
              Join as a Tradesperson
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

