'use client';

import React from 'react';
import Link from 'next/link';
import { MotionDiv } from '@/components/ui/MotionDiv';
import {
  BookOpen,
  TrendingUp,
  Megaphone,
  CheckCircle,
  Award,
  Video,
  ArrowRight,
} from 'lucide-react';

/**
 * Resource categories in Bento Grid layout
 * Professional card design with hover animations
 */
export function ResourceCategories() {
  const categories = [
    {
      icon: BookOpen,
      title: 'Getting Started Guide',
      description: 'Complete onboarding for new contractors. Learn the platform basics and win your first job.',
      color: 'from-teal-500 to-teal-600',
      href: '#getting-started',
    },
    {
      icon: TrendingUp,
      title: 'Growing Your Business',
      description: 'Strategies to scale your contracting business and increase revenue on Mintenance.',
      color: 'from-emerald-500 to-emerald-600',
      href: '#growth',
    },
    {
      icon: Megaphone,
      title: 'Marketing &amp; Promotion',
      description: 'Stand out from the competition and attract more clients with effective marketing.',
      color: 'from-amber-500 to-amber-600',
      href: '#marketing',
    },
    {
      icon: CheckCircle,
      title: 'Platform Best Practices',
      description: 'Insider tips to maximize your success rate and become a featured contractor.',
      color: 'from-blue-500 to-blue-600',
      href: '#best-practices',
    },
    {
      icon: Award,
      title: 'Success Stories',
      description: 'Learn from top-performing contractors who have built thriving businesses.',
      color: 'from-purple-500 to-purple-600',
      href: '#success-stories',
    },
    {
      icon: Video,
      title: 'Video Tutorials',
      description: 'Step-by-step video guides covering everything from profile setup to advanced features.',
      color: 'from-pink-500 to-pink-600',
      href: '#videos',
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Explore Resource Categories
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Browse our comprehensive library of guides, tips, and tutorials designed to help you succeed
        </p>
      </MotionDiv>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category, index) => {
          const Icon = category.icon;
          return (
            <MotionDiv
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300"
            >
              {/* Gradient border effect on hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${category.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />
              <div className="relative bg-white m-[2px] rounded-[14px] p-8">
                {/* Icon with gradient background */}
                <div
                  className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-8 h-8 text-white" aria-hidden="true" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {category.title}
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {category.description}
                </p>

                {/* Link */}
                <Link
                  href={category.href}
                  className="inline-flex items-center text-teal-600 font-semibold group-hover:gap-3 transition-all duration-300"
                >
                  Explore
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
              </div>
            </MotionDiv>
          );
        })}
      </div>
    </section>
  );
}
