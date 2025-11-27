import { HeroStoryAnimation } from './HeroStoryAnimation';
import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 pt-32 pb-20 lg:pt-40 lg:pb-28">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left Column: Text Content */}
          <div className="max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm font-medium mb-6 mx-auto lg:mx-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500"></span>
              </span>
              Verified Pros Available Now
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-tight">
              Home Maintenance, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary-400 to-secondary-200">
                Simplified
              </span>
            </h1>

            <p className="text-lg text-gray-300 mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Connect with trusted professionals for all your home repair and maintenance needs.
              Quality work, fair prices, and peace of mind.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12 justify-center lg:justify-start">
              <Link
                href="/register?role=homeowner"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white transition-all duration-200 bg-secondary-600 rounded-xl hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500 focus:ring-offset-primary-900 shadow-lg shadow-secondary-500/20 hover:shadow-secondary-500/40 hover:-translate-y-0.5"
              >
                Find a Contractor
              </Link>
              <Link
                href="/register?role=contractor"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white transition-all duration-200 bg-transparent border border-white/20 rounded-xl hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/20 focus:ring-offset-primary-900 backdrop-blur-sm hover:-translate-y-0.5"
              >
                I'm a Pro
              </Link>
            </div>
          </div>

          {/* Right Column: Hero Animation */}
          <div className="relative lg:h-[600px] flex items-center justify-center w-full">
            <HeroStoryAnimation />
          </div>
        </div>
      </div>
    </section>
  );
}
