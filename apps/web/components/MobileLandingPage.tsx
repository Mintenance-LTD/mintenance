'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SwipeableCarousel } from './ui/SwipeableCarousel';
import { TouchButton } from './ui/TouchButton';
import { ResponsiveGrid } from './ui/ResponsiveGrid';
import { Card } from './ui/Card';
import { theme } from '@/lib/theme';

export const MobileLandingPage: React.FC = () => {
  const services = [
    {
      title: 'Plumbing',
      icon: '🔧',
      description: 'Emergency repairs and installations',
    },
    {
      title: 'Electrical',
      icon: '⚡',
      description: 'Safe and certified electrical work',
    },
    {
      title: 'HVAC',
      icon: '🌡️',
      description: 'Heating and cooling solutions',
    },
    {
      title: 'Cleaning',
      icon: '🧹',
      description: 'Professional cleaning services',
    },
  ];

  const features = [
    {
      title: 'Instant Quotes',
      description: 'Get quotes within minutes from verified contractors',
      icon: '⚡',
    },
    {
      title: 'Secure Payments',
      description: 'Payments held in escrow until work is completed',
      icon: '🔒',
    },
    {
      title: 'Quality Guarantee',
      description: 'All work backed by our satisfaction guarantee',
      icon: '✅',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      location: 'London',
      text: 'Found the perfect plumber within minutes. The work was completed on time and exceeded expectations.',
      rating: 5,
    },
    {
      name: 'Mike Chen',
      location: 'Manchester',
      text: 'Great platform for finding reliable contractors. The escrow payment system gives me peace of mind.',
      rating: 5,
    },
    {
      name: 'Emma Wilson',
      location: 'Birmingham',
      text: 'Excellent service from start to finish. Will definitely use Mintenance again.',
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pt-20 pb-12 px-4 bg-gradient-to-br from-[#0F172A] to-[#1e293b] text-white">
        <div className="max-w-md mx-auto text-center">
          <Image
            src="/assets/icon.png"
            alt="Mintenance Logo"
            width={80}
            height={80}
            className="mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold mb-4">
            Find Trusted Contractors
          </h1>
          <p className="text-lg mb-8 text-gray-300">
            Connect with verified professionals for your home projects
          </p>

          <div className="space-y-3">
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <TouchButton
                variant="primary"
                size="lg"
                fullWidth
                style={{
                  backgroundColor: theme.colors.success,
                  borderColor: theme.colors.success,
                }}
              >
                Get Started Free
              </TouchButton>
            </Link>

            <Link href="/login" style={{ textDecoration: 'none' }}>
              <TouchButton
                variant="outline"
                size="lg"
                fullWidth
                style={{
                  color: 'white',
                  borderColor: 'white',
                }}
              >
                Log In
              </TouchButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-12 px-4">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">
            Popular Services
          </h2>

          <ResponsiveGrid
            areas={{
              mobile: [['col1'], ['col2']],
              tablet: [['col1', 'col2']],
              desktop: [['col1', 'col2']],
            }}
            gap="md"
          >
            {services.map((service, index) => (
              <TouchButton
                key={index}
                variant="ghost"
                style={{
                  padding: theme.spacing[4],
                  height: '120px',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: theme.spacing[2] }}>
                  {service.icon}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing[1] }}>
                    {service.title}
                  </div>
                  <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                    {service.description}
                  </div>
                </div>
              </TouchButton>
            ))}
          </ResponsiveGrid>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">
            Why Choose Mintenance?
          </h2>

          <div className="space-y-6">
            {features.map((feature, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  fontSize: '2rem',
                  marginRight: theme.spacing[4],
                  minWidth: '60px',
                  textAlign: 'center',
                }}>
                  {feature.icon}
                </div>
                <div>
                  <h3 style={{
                    fontSize: theme.typography.fontSize.lg,
                    fontWeight: theme.typography.fontWeight.semibold,
                    marginBottom: theme.spacing[1],
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                  }}>
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 px-4">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">
            What Our Customers Say
          </h2>

          <SwipeableCarousel
            autoplay={true}
            autoplayInterval={4000}
            showDots={true}
            showArrows={false}
            style={{ height: '200px' }}
          >
            {testimonials.map((testimonial, index) => (
              <Card key={index} variant="elevated" style={{ padding: theme.spacing[4], height: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '2rem',
                    marginBottom: theme.spacing[2],
                  }}>
                    {'⭐'.repeat(testimonial.rating)}
                  </div>
                  <p style={{
                    fontSize: theme.typography.fontSize.base,
                    fontStyle: 'italic',
                    marginBottom: theme.spacing[3],
                    lineHeight: theme.typography.lineHeight.relaxed,
                  }}>
                    "{testimonial.text}"
                  </p>
                  <div>
                    <div style={{
                      fontWeight: theme.typography.fontWeight.semibold,
                      marginBottom: theme.spacing[1],
                    }}>
                      {testimonial.name}
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                    }}>
                      {testimonial.location}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </SwipeableCarousel>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 px-4 bg-[#0F172A] text-white">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-gray-300 mb-8">
            Join thousands of satisfied customers
          </p>

          <Link href="/register" style={{ textDecoration: 'none' }}>
            <TouchButton
              variant="primary"
              size="lg"
              fullWidth
              style={{
                backgroundColor: theme.colors.success,
                borderColor: theme.colors.success,
              }}
            >
              Start Your Project Today
            </TouchButton>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-white">
        <div className="max-w-md mx-auto text-center">
          <div style={{ marginBottom: theme.spacing[4] }}>
            <Image
              src="/assets/icon.png"
              alt="Mintenance Logo"
              width={40}
              height={40}
              className="mx-auto mb-2"
            />
            <div style={{ fontWeight: theme.typography.fontWeight.bold }}>
              Mintenance
            </div>
          </div>

          <div style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing[4],
          }}>
            © 2024 Mintenance. All rights reserved.
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: theme.spacing[4] }}>
            <Link href="/privacy" style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
              Privacy
            </Link>
            <Link href="/terms" style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
              Terms
            </Link>
            <Link href="/contact" style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
