'use client';

import React from 'react';
import Link from 'next/link';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import { LucideIcon } from 'lucide-react';

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
  variant?: 'primary' | 'secondary' | 'outline';
  badge?: string | number;
}

interface QuickActionsCardProps {
  title: string;
  subtitle?: string;
  actions: QuickAction[];
}

export function QuickActionsCard({ title, subtitle, actions }: QuickActionsCardProps) {
  return (
    <MotionDiv
      className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm h-full"
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>

      {/* Actions Grid */}
      <MotionDiv
        className="space-y-3"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {actions.map((action) => {
          const Icon = action.icon;
          const isPrimary = action.variant === 'primary' || !action.variant;

          return (
            <MotionDiv key={action.label} variants={staggerItem}>
              <Link href={action.href}>
                <MotionButton
                  className={`w-full flex items-center justify-between gap-3 p-4 rounded-xl transition-all duration-200 ${
                    isPrimary
                      ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800 shadow-md hover:shadow-lg'
                      : action.variant === 'secondary'
                      ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      : 'bg-white border-2 border-gray-200 text-gray-900 hover:border-teal-300 hover:bg-teal-50'
                  }`}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isPrimary
                          ? 'bg-white/20'
                          : action.variant === 'secondary'
                          ? 'bg-white'
                          : 'bg-teal-50'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          isPrimary
                            ? 'text-white'
                            : action.variant === 'secondary'
                            ? 'text-gray-700'
                            : 'text-teal-600'
                        }`}
                      />
                    </div>
                    <span className="font-medium text-sm">{action.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {action.badge && (
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          isPrimary
                            ? 'bg-white/20 text-white'
                            : 'bg-teal-100 text-teal-700'
                        }`}
                      >
                        {action.badge}
                      </div>
                    )}
                    <svg
                      className={`w-5 h-5 ${
                        isPrimary
                          ? 'text-white/70'
                          : 'text-gray-400'
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </MotionButton>
              </Link>
            </MotionDiv>
          );
        })}
      </MotionDiv>
    </MotionDiv>
  );
}
