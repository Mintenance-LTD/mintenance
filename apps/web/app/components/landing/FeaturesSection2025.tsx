'use client';

import { motion } from 'framer-motion';
import { Heart, Camera, ShieldCheck, TrendingUp, Video, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const features = [
  {
    icon: Heart,
    title: 'Tinder-Style Matching',
    description: 'Swipe through contractors like never before. Find your perfect match with our intuitive interface.',
    link: '/discover',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    icon: Camera,
    title: 'AI Building Surveyor',
    description: 'Instant damage assessment from photos. Get cost estimates and severity analysis in seconds.',
    link: '/ai-search',
    gradient: 'from-[#0066CC] to-[#0052A3]',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Escrow',
    description: 'Payments protected until job completion. Your money is safe with our escrow system.',
    link: '/about',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: TrendingUp,
    title: 'Serious Buyer Score',
    description: 'Connect with quality leads only. Our algorithm identifies committed homeowners.',
    link: '/about',
    gradient: 'from-[#10B981] to-emerald-600',
  },
  {
    icon: Video,
    title: 'Video Calls',
    description: 'Meet contractors virtually before hiring. Schedule video consultations instantly.',
    link: '/video-calls',
    gradient: 'from-purple-500 to-indigo-500',
  },
  {
    icon: Users,
    title: 'Social Verification',
    description: 'See real work from real professionals. Browse portfolios and verified reviews.',
    link: '/contractors',
    gradient: 'from-cyan-500 to-blue-500',
  },
];

export function FeaturesSection2025() {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={!prefersReducedMotion ? { opacity: 0, y: 20 } : undefined}
          whileInView={!prefersReducedMotion ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0066CC]/10 border border-[#0066CC]/20 text-[#0066CC] text-sm font-semibold mb-4">
            <Zap className="w-4 h-4" />
            Powerful Features
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Why Choose Mintenance?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Industry-leading features designed to make hiring tradespeople effortless and secure
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={!prefersReducedMotion ? containerVariants : undefined}
        >
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              index={index}
              prefersReducedMotion={prefersReducedMotion}
              itemVariants={itemVariants}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
  prefersReducedMotion,
  itemVariants,
}: {
  feature: typeof features[0];
  index: number;
  prefersReducedMotion: boolean;
  itemVariants: any;
}) {
  const Icon = feature.icon;

  return (
    <motion.div
      variants={!prefersReducedMotion ? itemVariants : undefined}
      whileHover={!prefersReducedMotion ? { y: -8, transition: { duration: 0.3 } } : undefined}
      className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
    >
      {/* Gradient Background (on hover) */}
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
      />

      {/* Icon */}
      <div className="relative mb-6">
        <div
          className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg`}
        >
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#0066CC] transition-colors">
          {feature.title}
        </h3>
        <p className="text-gray-600 mb-6 leading-relaxed">{feature.description}</p>

        {/* Learn More Link */}
        <Link
          href={feature.link}
          className="inline-flex items-center gap-2 text-[#0066CC] font-semibold group-hover:gap-3 transition-all"
        >
          Learn more
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Card Number (decorative) */}
      <div className="absolute top-4 right-4 text-6xl font-bold text-gray-100 group-hover:text-gray-200 transition-colors">
        {String(index + 1).padStart(2, '0')}
      </div>
    </motion.div>
  );
}

// Missing Zap import fix
function Zap({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}
