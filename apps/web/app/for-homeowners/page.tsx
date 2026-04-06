import Link from 'next/link';
import Image from 'next/image';
import {
  Camera,
  Shield,
  PoundSterling,
  Search,
  CheckCircle,
  Sparkles,
  Home,
  ArrowRight,
  Star,
  Clock,
  Eye,
} from 'lucide-react';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Homeowners - Your Property, Protected | Mintenance',
  description:
    'Post a job in 60 seconds. Get AI-powered damage assessments, compare verified contractor bids, and pay securely through escrow. Your money is protected until you approve the work.',
  keywords:
    'homeowner maintenance, property repair, find contractor UK, escrow payments, AI building assessment, verified tradespeople',
  openGraph: {
    title: 'For Homeowners - Your Property, Protected | Mintenance',
    description:
      'AI damage assessments, verified contractors, protected payments. Post a job in 60 seconds.',
    type: 'website',
  },
};

const FEATURES = [
  {
    icon: Search,
    title: 'Post a Job in Seconds',
    description: 'Describe what needs fixing, pick your property, set your budget. Verified contractors in your area get notified instantly.',
    screenshot: '/screenshots/homeowner/dashboard.png',
    screenshotAlt: 'Homeowner dashboard with job posting search bar',
    mobileScreenshot: '/screenshots/mobile/homeowner-dashboard.png',
    mobileAlt: 'Mobile homeowner dashboard showing active projects and bids',
    badge: 'Quick & Easy',
  },
  {
    icon: Sparkles,
    title: 'AI Tells You What\'s Wrong',
    description: 'Upload a photo of the damage. Our AI analyses it in seconds \u2014 identifying the problem, estimating repair costs, listing materials needed, and assessing insurance impact.',
    screenshot: '/screenshots/homeowner/ai-assessment.png',
    screenshotAlt: 'AI Building Assessment showing damage analysis with cost estimate',
    badge: 'Powered by Mint AI',
  },
  {
    icon: Star,
    title: 'Compare & Choose',
    description: 'Review bids from verified contractors. See their ratings, completed jobs, company details, and portfolio. Accept the best offer \u2014 your money stays protected until you\'re happy.',
    screenshot: '/screenshots/homeowner/bids-received.png',
    screenshotAlt: 'Job detail page showing bids received with contractor profiles',
    mobileScreenshot: '/screenshots/mobile/homeowner-bids.png',
    mobileAlt: 'Mobile view of bids received section',
    badge: 'You Decide',
  },
  {
    icon: Eye,
    title: 'Track Every Step',
    description: 'Follow the entire job lifecycle from posting to completion. See real-time progress, before and after photos, and approve work before releasing payment.',
    screenshot: '/screenshots/homeowner/job-progress.png',
    screenshotAlt: 'Job progress timeline showing all steps from posting to payment',
    badge: 'Full Visibility',
  },
  {
    icon: Shield,
    title: 'Payment Protection',
    description: 'Your money is held securely in escrow. Contractors upload before photos, complete the work, then submit after photos. You compare and approve before a single penny is released.',
    screenshot: '/screenshots/homeowner/property-management.png',
    screenshotAlt: 'Property management view with escrow protection',
    mobileScreenshot: '/screenshots/mobile/homeowner-properties.png',
    mobileAlt: 'Mobile property management screen',
    badge: 'Escrow Protected',
  },
];

const STATS = [
  { value: '60s', label: 'Average time to post a job' },
  { value: '85%', label: 'AI assessment accuracy' },
  { value: '4.8', label: 'Average contractor rating' },
  { value: '0', label: 'Money lost to bad work' },
];

const TESTIMONIALS = [
  {
    quote: 'The AI assessment told me exactly what was wrong with my damp wall before I even called anyone. Saved me hundreds in unnecessary quotes.',
    name: 'Sarah M.',
    location: 'Bristol',
    rating: 5,
  },
  {
    quote: 'Being able to see before and after photos before releasing payment gave me total peace of mind. The escrow system is brilliant.',
    name: 'James T.',
    location: 'Manchester',
    rating: 5,
  },
  {
    quote: 'Posted a job for a leaky pipe, had 3 bids within an hour. Chose the highest-rated contractor and the job was done same day.',
    name: 'Priya K.',
    location: 'London',
    rating: 5,
  },
];

export default function ForHomeownersPage() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white">
        <LandingNavigation />

        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 text-white">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-72 h-72 bg-teal-500 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-20 w-96 h-96 bg-emerald-400 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-500/20 text-teal-300 rounded-full text-sm font-medium mb-6">
                  <Home className="w-4 h-4" />
                  For Homeowners
                </span>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                  Your Property.
                  <br />
                  <span className="text-teal-400">Protected.</span>
                </h1>
                <p className="text-lg text-gray-300 mb-8 max-w-lg leading-relaxed">
                  Post a maintenance job, get AI-powered damage assessments, compare verified contractor bids, and pay securely through escrow. You stay in control from first quote to final sign-off.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-400/30"
                  >
                    Get Started Free
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/how-it-works"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all backdrop-blur-sm"
                  >
                    How It Works
                  </Link>
                </div>
              </div>

              {/* Hero screenshot — web dashboard */}
              <div className="relative hidden lg:block">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10">
                  <Image
                    src="/screenshots/homeowner/dashboard.png"
                    alt="Mintenance homeowner dashboard showing active jobs, bids received, and project overview"
                    width={800}
                    height={500}
                    className="w-full h-auto"
                    priority
                  />
                </div>
                {/* Floating mobile screenshot */}
                <div className="absolute -bottom-8 -left-12 w-48 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 rotate-[-3deg]">
                  <Image
                    src="/screenshots/mobile/homeowner-dashboard.png"
                    alt="Mobile app showing homeowner dashboard"
                    width={240}
                    height={520}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section className="bg-gray-50 border-y border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-teal-600">{stat.value}</div>
                  <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature sections — alternating layout */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Everything You Need to Maintain Your Property
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                From AI damage detection to escrow-protected payments, Mintenance handles the entire maintenance lifecycle.
              </p>
            </div>

            <div className="space-y-24">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                const isReversed = index % 2 === 1;

                return (
                  <div
                    key={feature.title}
                    className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${isReversed ? 'lg:direction-rtl' : ''}`}
                  >
                    {/* Text side */}
                    <div className={`${isReversed ? 'lg:order-2' : ''}`}>
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
                        <Icon className="w-3.5 h-3.5" />
                        {feature.badge}
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed text-lg">
                        {feature.description}
                      </p>
                    </div>

                    {/* Screenshot side */}
                    <div className={`relative ${isReversed ? 'lg:order-1' : ''}`}>
                      {/* Desktop screenshot in laptop frame */}
                      <div className="relative bg-gray-900 rounded-xl p-2 shadow-2xl">
                        <div className="flex items-center gap-1.5 px-3 py-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                          <div className="flex-1 mx-3 h-5 bg-gray-700 rounded-md" />
                        </div>
                        <div className="rounded-lg overflow-hidden">
                          <Image
                            src={feature.screenshot}
                            alt={feature.screenshotAlt}
                            width={700}
                            height={440}
                            className="w-full h-auto"
                          />
                        </div>
                      </div>

                      {/* Floating mobile screenshot (if available) */}
                      {feature.mobileScreenshot && (
                        <div className="absolute -bottom-6 -right-6 w-36 rounded-2xl overflow-hidden shadow-xl border-4 border-white hidden md:block">
                          <Image
                            src={feature.mobileScreenshot}
                            alt={feature.mobileAlt || ''}
                            width={180}
                            height={390}
                            className="w-full h-auto"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-16">
              How It Works
            </h2>
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: '1', icon: Camera, title: 'Upload a Photo', desc: 'Snap a picture of the damage. AI analyses it instantly.' },
                { step: '2', icon: Search, title: 'Get Matched', desc: 'Verified contractors in your area bid on your job.' },
                { step: '3', icon: PoundSterling, title: 'Pay Securely', desc: 'Money held in escrow until you approve the work.' },
                { step: '4', icon: CheckCircle, title: 'Approve & Done', desc: 'Compare before/after photos. Release payment when happy.' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.step} className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-100 text-teal-600 mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-2">
                      Step {item.step}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Homeowners Love Mintenance
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 leading-relaxed italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                      {t.name[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                      <div className="text-xs text-gray-500">{t.location}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-teal-600 to-teal-500 text-white py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Get Your Home Sorted?
            </h2>
            <p className="text-teal-100 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of UK homeowners who protect their property with Mintenance. Post your first job for free.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-teal-700 rounded-xl font-semibold hover:bg-teal-50 transition-all shadow-lg"
              >
                Post a Job Now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-4 bg-teal-700/50 hover:bg-teal-700/70 text-white rounded-xl font-semibold transition-all backdrop-blur-sm"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>

        <Footer2025 />
      </div>
    </ErrorBoundary>
  );
}
