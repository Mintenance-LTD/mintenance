'use client';

import { motion } from 'framer-motion';
import { Star, TrendingUp, Users, DollarSign } from 'lucide-react';
import { CustomerTestimonials } from '@/components/landing/CustomerTestimonials';
import { LiveActivityFeed } from '@/components/landing/LiveActivityFeed';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const stats = [
  {
    icon: Users,
    value: '50,000+',
    label: 'Verified Contractors',
    color: 'from-[#0066CC] to-[#0052A3]',
  },
  {
    icon: TrendingUp,
    value: '1,000,000+',
    label: 'Jobs Completed',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    icon: Star,
    value: '4.8/5',
    label: 'Average Rating',
    color: 'from-[#10B981] to-emerald-600',
  },
  {
    icon: DollarSign,
    value: '£10M+',
    label: 'Paid Securely',
    color: 'from-emerald-500 to-teal-500',
  },
];

export function SocialProofSection2025() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Animated Statistics */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20"
          initial={!prefersReducedMotion ? { opacity: 0, y: 30 } : undefined}
          whileInView={!prefersReducedMotion ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {stats.map((stat, index) => (
            <StatCard key={stat.label} stat={stat} index={index} prefersReducedMotion={prefersReducedMotion} />
          ))}
        </motion.div>

        {/* Customer Testimonials */}
        <CustomerTestimonials />

        {/* Live Activity Feed (floating) */}
        <LiveActivityFeed />
      </div>
    </section>
  );
}

function StatCard({
  stat,
  index,
  prefersReducedMotion,
}: {
  stat: typeof stats[0];
  index: number;
  prefersReducedMotion: boolean;
}) {
  const Icon = stat.icon;

  return (
    <motion.div
      className="text-center group"
      initial={!prefersReducedMotion ? { opacity: 0, scale: 0.8 } : undefined}
      whileInView={!prefersReducedMotion ? { opacity: 1, scale: 1 } : undefined}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div className="relative mb-4 inline-block">
        <div
          className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon className="w-8 h-8 text-white" />
        </div>
        {/* Glow effect */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.color} blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300`}
        />
      </div>
      <div className="text-4xl font-bold text-gray-900 mb-2">{stat.value}</div>
      <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
    </motion.div>
  );
}
