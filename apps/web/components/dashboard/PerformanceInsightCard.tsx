'use client';

import React, { useState } from 'react';
import { fadeIn } from '@/lib/animations/variants';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import { Lightbulb, X, TrendingUp, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export interface PerformanceInsight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'tip';
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  dismissible?: boolean;
}

interface PerformanceInsightCardProps {
  insight: PerformanceInsight;
  onDismiss?: (id: string) => void;
}

const insightConfig = {
  success: {
    icon: CheckCircle2,
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    iconColor: 'text-emerald-600',
    textColor: 'text-emerald-900',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-600',
    textColor: 'text-amber-900',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    textColor: 'text-blue-900',
  },
  tip: {
    icon: Lightbulb,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    iconColor: 'text-purple-600',
    textColor: 'text-purple-900',
  },
};

export function PerformanceInsightCard({ insight, onDismiss }: PerformanceInsightCardProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const config = insightConfig[insight.type];
  const Icon = config.icon;

  const handleDismiss = () => {
    setIsDismissed(true);
    setTimeout(() => {
      onDismiss?.(insight.id);
    }, 300);
  };

  if (isDismissed) return null;

  return (
    <MotionDiv
      className={`${config.bgColor} border ${config.borderColor} rounded-xl p-4 relative overflow-hidden`}
      variants={fadeIn}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Dismiss Button */}
      {insight.dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 w-6 h-6 rounded-full hover:bg-white/50 transition-colors flex items-center justify-center"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      )}

      <div className="flex gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 ${config.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-sm ${config.textColor} mb-1`}>
            {insight.title}
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            {insight.message}
          </p>

          {/* Action */}
          {insight.actionLabel && insight.actionHref && (
            <a
              href={insight.actionHref}
              className={`inline-flex items-center gap-1 mt-3 text-sm font-medium ${config.iconColor} hover:underline`}
            >
              {insight.actionLabel}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </MotionDiv>
  );
}

interface PerformanceInsightsListProps {
  insights: PerformanceInsight[];
  title?: string;
  onDismiss?: (id: string) => void;
}

export function PerformanceInsightsList({
  insights,
  title = 'Performance Insights',
  onDismiss,
}: PerformanceInsightsListProps) {
  const [visibleInsights, setVisibleInsights] = useState(insights);

  const handleDismiss = (id: string) => {
    setVisibleInsights((prev) => prev.filter((i) => i.id !== id));
    onDismiss?.(id);
  };

  if (visibleInsights.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-teal-600" />
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>

      <div className="space-y-3">
        {visibleInsights.map((insight) => (
          <PerformanceInsightCard
            key={insight.id}
            insight={insight}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </div>
  );
}
