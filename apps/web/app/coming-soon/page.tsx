'use client';

import { useState, useRef, FormEvent } from 'react';
import { motion, useInView } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  Sparkles,
  ShieldCheck,
  Camera,
  MessageCircle,
  BarChart3,
  LayoutDashboard,
  ClipboardList,
  Users,
  CheckCircle2,
  ArrowRight,
  Check,
  Loader2,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Animation helpers                                                         */
/* -------------------------------------------------------------------------- */

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function AnimatedSection({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

const features = [
  {
    icon: Sparkles,
    title: 'Smart Matching',
    description: 'AI matches you with the right contractor based on job type, location, and reviews.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Payments',
    description: 'Escrow-protected payments that are only released when the work is completed and approved.',
  },
  {
    icon: Camera,
    title: 'Photo Verification',
    description: 'Before and after photo proof of work so you can see exactly what was done.',
  },
  {
    icon: MessageCircle,
    title: 'Real-Time Chat',
    description: 'Direct messaging with your contractor to discuss details and stay updated.',
  },
  {
    icon: BarChart3,
    title: 'Transparent Pricing',
    description: 'Compare quotes side by side with no hidden fees or surprise charges.',
  },
  {
    icon: LayoutDashboard,
    title: 'Professional Dashboard',
    description: 'Track all your jobs, payments, and communications in one organised place.',
  },
];

const steps = [
  {
    number: '1',
    icon: ClipboardList,
    title: 'Post Your Job',
    description: 'Describe what needs fixing, upload photos, and set your budget. It takes under two minutes.',
  },
  {
    number: '2',
    icon: Users,
    title: 'Get Matched',
    description: 'Receive competitive quotes from vetted, local contractors ready to help.',
  },
  {
    number: '3',
    icon: CheckCircle2,
    title: 'Job Done',
    description: 'Approve the completed work with photo evidence and release payment securely.',
  },
];

const pricingPlans = [
  {
    name: 'Homeowners',
    price: 'FREE',
    period: '',
    description: 'Everything you need to get your property maintained.',
    features: [
      'Post unlimited jobs',
      'Receive contractor quotes',
      'Escrow payment protection',
      'Before/after photo verification',
      'Real-time messaging',
    ],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    name: 'Contractors Basic',
    price: '\u00A329',
    period: '/month',
    description: 'Start winning jobs and growing your business.',
    features: [
      'Up to 20 bids per month',
      'Professional profile listing',
      'Direct messaging',
      'Job notifications',
      'Payment processing',
    ],
    cta: 'Start Basic',
    highlighted: false,
  },
  {
    name: 'Contractors Pro',
    price: '\u00A359',
    period: '/month',
    description: 'Unlock your full potential with premium tools.',
    features: [
      'Unlimited bids',
      'Priority listing in search',
      'Advanced analytics dashboard',
      'AI-powered job recommendations',
      'Dedicated account support',
    ],
    cta: 'Go Pro',
    highlighted: true,
  },
];

/* -------------------------------------------------------------------------- */
/*  Page component                                                            */
/* -------------------------------------------------------------------------- */

export default function ComingSoonPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signupRef = useRef<HTMLDivElement>(null);

  const scrollToSignup = () => {
    signupRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/coming-soon/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong. Please try again.');
      }

      toast.success(data.message || 'You\'re on the list! We\'ll be in touch soon.');
      setName('');
      setEmail('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-inter)] text-navy-900 antialiased">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 5000,
          style: {
            fontFamily: 'var(--font-inter)',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
          },
          success: { style: { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' } },
          error: { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' } },
        }}
      />

      {/* ------------------------------------------------------------------ */}
      {/*  Navigation                                                        */}
      {/* ------------------------------------------------------------------ */}
      <nav className="sticky top-0 z-50 border-b border-navy-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/coming-soon" className="flex items-center gap-2" aria-label="Mintenance home">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
              <span className="text-sm font-bold text-white">M</span>
            </div>
            <span className="text-lg font-semibold tracking-tight text-navy-900">
              Mintenance
            </span>
          </a>
          <button
            type="button"
            onClick={scrollToSignup}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            Get Early Access
          </button>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/*  Hero                                                              */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-teal-50/60 via-white to-white" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
              </span>
              Launching Soon
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl lg:text-6xl">
              Property Maintenance,{' '}
              <span className="bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-transparent">
                Reinvented
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy-500 sm:text-xl">
              Mintenance connects homeowners with vetted local contractors.
              Post a job, compare quotes, and pay securely &mdash; all in one platform.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={scrollToSignup}
                className="group inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-600/20 transition-all hover:bg-teal-700 hover:shadow-xl hover:shadow-teal-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                Get Early Access
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <span className="text-sm text-navy-400">
                Free for homeowners. No credit card required.
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  Features                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-navy-50/50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="mt-4 text-lg text-navy-500">
              A smarter way to manage property maintenance, from first quote to final payment.
            </p>
          </AnimatedSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  variants={fadeUp}
                  className="group rounded-2xl border border-navy-100 bg-white p-6 shadow-sm transition-all hover:border-teal-200 hover:shadow-md"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-navy-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-500">{feature.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  How It Works                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-navy-500">
              Three simple steps from problem to solution.
            </p>
          </AnimatedSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="mx-auto mt-16 grid max-w-4xl gap-10 md:grid-cols-3 md:gap-8"
          >
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div key={step.title} variants={fadeUp} className="relative text-center">
                  {/* Connector line (desktop only) */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-[calc(50%+2.5rem)] top-8 hidden h-px w-[calc(100%-5rem)] bg-navy-200 md:block" />
                  )}

                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-900 text-white shadow-lg">
                    <span className="text-xl font-bold">{step.number}</span>
                  </div>
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-navy-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-500">{step.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  Pricing                                                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-navy-50/50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-navy-500">
              No hidden fees. Cancel anytime.
            </p>
          </AnimatedSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="mx-auto mt-16 grid max-w-5xl gap-6 md:grid-cols-3"
          >
            {pricingPlans.map((plan) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                className={`relative flex flex-col rounded-2xl border p-8 transition-shadow hover:shadow-lg ${
                  plan.highlighted
                    ? 'border-teal-300 bg-white shadow-md ring-1 ring-teal-200'
                    : 'border-navy-100 bg-white shadow-sm'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-teal-600 px-4 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-base font-semibold text-navy-900">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight text-navy-900">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm text-navy-400">{plan.period}</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-navy-500">{plan.description}</p>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-navy-700">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-500" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={scrollToSignup}
                  className={`w-full rounded-xl py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${
                    plan.highlighted
                      ? 'bg-teal-600 text-white hover:bg-teal-700'
                      : 'border border-navy-200 bg-white text-navy-900 hover:bg-navy-50'
                  }`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  Email Signup                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section ref={signupRef} className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="mx-auto max-w-2xl rounded-3xl border border-navy-100 bg-white p-8 shadow-lg sm:p-12">
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
                  Be the First to Know
                </h2>
                <p className="mt-3 text-base text-navy-500">
                  Sign up for early access and be notified as soon as we launch. No spam, ever.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label htmlFor="signup-name" className="mb-1.5 block text-sm font-medium text-navy-700">
                    Name
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full rounded-xl border border-navy-200 bg-white px-4 py-3 text-sm text-navy-900 placeholder:text-navy-300 transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div>
                  <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium text-navy-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-navy-200 bg-white px-4 py-3 text-sm text-navy-900 placeholder:text-navy-300 transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-teal-600/20 transition-all hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Get Early Access
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-navy-400">
                  We respect your privacy. Unsubscribe at any time.
                </p>
              </form>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  Footer                                                            */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-navy-100 bg-navy-900 py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-600">
              <span className="text-xs font-bold text-white">M</span>
            </div>
            <span className="text-sm font-semibold text-white">Mintenance</span>
          </div>
          <p className="text-sm leading-relaxed text-navy-300">
            &copy; 2026 Mintenance Ltd. Company No. 16542104.
            <br className="sm:hidden" />{' '}
            Registered in England &amp; Wales.
            <br />
            Suite 2 J2 Business Park, Bridge Hall Lane, Bury, BL9 7NY.
          </p>
        </div>
      </footer>
    </div>
  );
}
