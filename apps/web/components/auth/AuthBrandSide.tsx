'use client';

import React from 'react';
import Link from 'next/link';
import Logo from '@/app/components/Logo';
import { CheckCircle2, Shield, Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthBrandSideProps {
  title: string;
  description: string;
  role?: 'homeowner' | 'contractor' | null;
}

export function AuthBrandSide({ title, description, role }: AuthBrandSideProps) {
  const features = role === 'contractor' ? [
    {
      icon: TrendingUp,
      title: 'Grow Your Business',
      description: 'Access quality leads and grow your client base',
    },
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'Get paid safely with escrow protection',
    },
    {
      icon: Zap,
      title: 'Smart Matching',
      description: 'AI-powered job matching for your skills',
    },
  ] : [
    {
      icon: CheckCircle2,
      title: 'Verified Professionals',
      description: '50,000+ vetted contractors ready to help',
    },
    {
      icon: Shield,
      title: 'Payment Protection',
      description: 'Escrow system keeps your money safe',
    },
    {
      icon: Zap,
      title: 'Instant Matching',
      description: 'Find the perfect contractor in minutes',
    },
  ];

  return (
    <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0066CC] via-[#0052A3] to-[#003D7A] text-white p-12 flex-col justify-between relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '30px 30px',
        }} />
      </div>

      {/* Gradient Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/3" />

      {/* Content */}
      <div className="relative z-10">
        <Link href="/" className="inline-flex items-center space-x-3 mb-16 group">
          <div className="transform transition-transform group-hover:scale-110 duration-300 bg-white/10 p-2.5 rounded-xl backdrop-blur-sm border border-white/20">
            <Logo className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Mintenance</h1>
        </Link>

        <div className="space-y-6">
          <h2 className="text-5xl font-bold leading-tight tracking-tight">
            {title}
          </h2>
          <p className="text-xl text-blue-100 leading-relaxed max-w-md">
            {description}
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="relative z-10 space-y-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className={cn(
                "flex items-start gap-4 p-4 rounded-xl",
                "bg-white/5 backdrop-blur-sm border border-white/10",
                "transition-all duration-300 hover:bg-white/10 hover:border-white/20",
                "group cursor-default"
              )}
            >
              <div className="flex-shrink-0 p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold mb-1">{feature.title}</p>
                <p className="text-blue-100 text-sm">{feature.description}</p>
              </div>
            </div>
          );
        })}

        {/* Trust Badge */}
        <div className="mt-8 pt-6 border-t border-white/20">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-semibold text-white mb-1">Trusted by thousands</p>
              <p className="text-blue-200">50,000+ projects completed</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-2xl text-white">4.9</p>
              <p className="text-blue-200 text-xs">Average rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-8 text-sm text-blue-300">
        <p className="font-medium text-white">2025 Mintenance Ltd</p>
        <p>Building the future of home maintenance</p>
      </div>
    </div>
  );
}
