'use client';

import Link from 'next/link';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import { Rocket, Users } from 'lucide-react';

export function PlansCTA() {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 rounded-2xl p-12 text-center text-white"
    >
      <Rocket className="w-16 h-16 mx-auto mb-6 text-teal-200" />

      <h2 className="text-4xl font-bold mb-4">Start Your Free Trial</h2>

      <p className="text-xl text-teal-100 mb-3 max-w-2xl mx-auto">
        14 days free, no credit card required
      </p>

      <p className="text-teal-200 mb-8">
        Join 2,500+ verified professionals growing their business on Mintenance
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
        <Link
          href="/register?type=contractor&plan=professional"
          className="px-8 py-4 bg-white text-teal-600 rounded-xl font-bold hover:shadow-xl inline-flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <Rocket className="w-5 h-5" />
          Start Professional Trial
        </Link>

        <Link
          href="/contact?subject=Business%20Plan%20Enquiry"
          className="px-8 py-4 bg-teal-700 text-white rounded-xl font-bold hover:bg-teal-800 border-2 border-white/30 inline-flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <Users className="w-5 h-5" />
          Contact Sales
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <p className="text-3xl font-bold mb-1">2,500+</p>
          <p className="text-teal-100 text-sm">Verified Contractors</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <p className="text-3xl font-bold mb-1">50,000+</p>
          <p className="text-teal-100 text-sm">Jobs Completed</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <p className="text-3xl font-bold mb-1">98%</p>
          <p className="text-teal-100 text-sm">Satisfaction Rate</p>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-white/20">
        <p className="text-teal-100 text-sm">
          <span className="font-semibold">Top-rated contractors prefer Professional plan</span>
          {' '}— Invest in your growth today
        </p>
      </div>
    </MotionDiv>
  );
}
