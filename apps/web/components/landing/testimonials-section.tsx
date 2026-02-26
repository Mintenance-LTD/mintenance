'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface Testimonial {
  initials: string;
  name: string;
  role: string;
  location: string;
  quote: string;
  badgeText: string;
  badgeColors: string;
  delay: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    initials: 'SM',
    name: 'Sarah Mitchell',
    role: 'Homeowner',
    location: 'London',
    quote:
      'I posted my kitchen renovation and had 5 quotes within 24 hours. The contractor I chose was professional, affordable, and did an amazing job. Highly recommended!',
    badgeText: 'Verified',
    badgeColors: 'bg-teal-100 text-teal-700',
    delay: 0.1,
  },
  {
    initials: 'JO',
    name: "James O'Connor",
    role: 'Electrician',
    location: 'Manchester',
    quote:
      'As a contractor, Mintenance has transformed my business. I get quality leads, fair pricing, and the platform handles all the admin. Game-changer!',
    badgeText: 'Verified Pro',
    badgeColors: 'bg-amber-100 text-amber-700',
    delay: 0.2,
  },
  {
    initials: 'ER',
    name: 'Emily Roberts',
    role: 'Homeowner',
    location: 'Birmingham',
    quote:
      'The protected payment system gave me peace of mind. I knew my money was safe until the work was completed to my satisfaction. Brilliant!',
    badgeText: 'Verified',
    badgeColors: 'bg-teal-100 text-teal-700',
    delay: 0.3,
  },
];

function AnimatedStars({ delay }: { delay: number }) {
  return (
    <div className="flex gap-1 mb-6" aria-label="5 out of 5 stars">
      {[...Array(5)].map((_, i) => (
        <motion.svg
          key={i}
          initial={{ scale: 0, rotate: -180 }}
          whileInView={{ scale: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ delay: delay + i * 0.1, duration: 0.4, type: "spring", stiffness: 200 }}
          className="w-5 h-5 text-amber-500"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </motion.svg>
      ))}
    </div>
  );
}

function VerifiedBadge({ text, colors }: { text: string; colors: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${colors} text-xs font-semibold`}>
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      {text}
    </span>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: testimonial.delay }}
      className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group"
    >
      <div className="absolute top-4 right-4 text-teal-100 text-6xl font-serif opacity-50 group-hover:opacity-100 transition-opacity" aria-hidden="true">&ldquo;</div>

      <AnimatedStars delay={testimonial.delay} />

      <p className="text-gray-700 mb-6 leading-relaxed italic relative z-10">
        &ldquo;{testimonial.quote}&rdquo;
      </p>

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
          {testimonial.initials}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900">{testimonial.name}</p>
            <VerifiedBadge text={testimonial.badgeText} colors={testimonial.badgeColors} />
          </div>
          <p className="text-sm text-gray-600">{testimonial.role}, {testimonial.location}</p>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Customer testimonials section with animated stars and verified badges
 */
export function TestimonialsSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl font-bold text-gray-900 mb-4">What our customers say</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real stories from homeowners who found the perfect contractor
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testimonial) => (
            <TestimonialCard key={testimonial.initials} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}
