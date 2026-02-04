'use client';

import React from 'react';
import Link from 'next/link';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { Download, Clock, BookOpen, TrendingUp, Target } from 'lucide-react';

/**
 * Featured resources section
 * Highlighted cards for most popular guides
 */
export function FeaturedResources() {
  const featuredGuides = [
    {
      title: 'Complete Your Profile',
      description: 'A comprehensive guide to creating a winning contractor profile that attracts clients',
      readingTime: 8,
      category: 'Getting Started',
      downloadUrl: '#',
      icon: BookOpen,
      featured: true,
    },
    {
      title: 'Bidding Strategies That Win',
      description: 'Learn how to write competitive quotes that stand out and convert at higher rates',
      readingTime: 12,
      category: 'Business Growth',
      downloadUrl: '#',
      icon: Target,
      featured: true,
    },
    {
      title: 'Pricing Your Services',
      description: 'Market research and competitive pricing strategies to maximize your profit margins',
      readingTime: 10,
      category: 'Finance',
      downloadUrl: '#',
      icon: TrendingUp,
      featured: true,
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
          Featured Resources
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Our most popular guides to help you get started and succeed quickly
        </p>
      </MotionDiv>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {featuredGuides.map((guide, index) => {
          const Icon = guide.icon;
          return (
            <MotionDiv
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="group bg-gradient-to-br from-white to-teal-50 rounded-2xl shadow-lg border border-teal-100 p-8 hover:shadow-2xl transition-all duration-300"
            >
              {/* Icon */}
              <div className="bg-gradient-to-br from-teal-500 to-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-8 h-8 text-white" aria-hidden="true" />
              </div>

              {/* Badge */}
              <div className="inline-flex items-center px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold mb-4">
                {guide.category}
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {guide.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 mb-6 leading-relaxed">
                {guide.description}
              </p>

              {/* Meta info */}
              <div className="flex items-center justify-between mb-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" aria-hidden="true" />
                  <span>{guide.readingTime} min read</span>
                </div>
                <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded-md text-xs font-medium">
                  Featured
                </span>
              </div>

              {/* Download button */}
              <Link
                href={guide.downloadUrl}
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <Download className="w-5 h-5" aria-hidden="true" />
                Download PDF
              </Link>
            </MotionDiv>
          );
        })}
      </div>
    </section>
  );
}
