'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles, Shield } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function CTASection2025() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative py-24 overflow-hidden bg-gradient-to-br from-[#0066CC] via-[#0052A3] to-[#003D7A]">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:4rem_4rem]"
          style={
            !prefersReducedMotion
              ? { animation: 'grid-flow 20s linear infinite' }
              : undefined
          }
        />
      </div>

      {/* Floating Shapes */}
      {!prefersReducedMotion && (
        <>
          <motion.div
            className="absolute top-10 left-10 w-64 h-64 bg-[#10B981] rounded-full filter blur-3xl opacity-20"
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-10 right-10 w-80 h-80 bg-teal-400 rounded-full filter blur-3xl opacity-20"
            animate={{
              x: [0, -40, 0],
              y: [0, -60, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </>
      )}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial={!prefersReducedMotion ? { opacity: 0, y: 30 } : undefined}
          whileInView={!prefersReducedMotion ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Sparkle Icon */}
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6"
            animate={
              !prefersReducedMotion
                ? { rotate: [0, 360], scale: [1, 1.1, 1] }
                : undefined
            }
            transition={{
              rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
              scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            <Sparkles className="w-8 h-8 text-[#10B981]" />
          </motion.div>

          {/* Headline */}
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied homeowners and skilled tradespeople. Start your journey
            today.
          </p>

          {/* No Credit Card Message */}
          <div className="flex items-center justify-center gap-2 text-sm text-blue-200 mb-8">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>No credit card required • Free to start • Cancel anytime</span>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/jobs/create"
              className="group inline-flex items-center justify-center gap-3 px-10 py-5 text-lg font-bold text-[#0066CC] bg-white rounded-2xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-all duration-300 shadow-2xl hover:shadow-[#10B981]/30 hover:scale-105"
            >
              Post a Job
              <motion.span
                animate={!prefersReducedMotion ? { x: [0, 5, 0] } : undefined}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-5 h-5" />
              </motion.span>
            </Link>
            <Link
              href="/register?role=contractor"
              className="inline-flex items-center justify-center gap-3 px-10 py-5 text-lg font-bold text-white bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-2xl hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 transition-all duration-300 hover:scale-105"
            >
              Join as a Contractor
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Trust Badges */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-8 mt-12 pt-8 border-t border-white/10"
            initial={!prefersReducedMotion ? { opacity: 0 } : undefined}
            whileInView={!prefersReducedMotion ? { opacity: 1 } : undefined}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="flex items-center gap-2 text-blue-100">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium">Secure Payments</span>
            </div>
            <div className="flex items-center gap-2 text-blue-100">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium">Verified Professionals</span>
            </div>
            <div className="flex items-center gap-2 text-blue-100">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium">24/7 Support</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes grid-flow {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(4rem);
          }
        }
      `}</style>
    </section>
  );
}
