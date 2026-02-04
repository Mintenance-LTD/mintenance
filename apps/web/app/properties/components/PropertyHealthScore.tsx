'use client';

import React from 'react';
import { CheckCircle2, ThumbsUp, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { PropertyHealthScore as HealthScore } from '@mintenance/shared';

interface PropertyHealthScoreProps {
  healthScore: HealthScore;
  showRecommendations?: boolean;
  compact?: boolean;
}

/**
 * PropertyHealthScore Component
 * Displays property health score with visual indicators and recommendations
 */
export function PropertyHealthScore({
  healthScore,
  showRecommendations = true,
  compact = false,
}: PropertyHealthScoreProps) {
  const { score, grade, color, recommendations } = healthScore;

  // Icon component based on grade
  const getIcon = () => {
    const iconProps = { className: 'w-8 h-8', style: { color } };
    switch (grade) {
      case 'excellent':
        return <CheckCircle2 {...iconProps} />;
      case 'good':
        return <ThumbsUp {...iconProps} />;
      case 'needs_attention':
        return <AlertTriangle {...iconProps} />;
      case 'critical':
        return <AlertOctagon {...iconProps} />;
    }
  };

  // Grade label display
  const gradeLabels = {
    excellent: 'Excellent',
    good: 'Good',
    needs_attention: 'Needs Attention',
    critical: 'Critical',
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{score}</span>
            <span className="text-sm text-gray-600">/ 100</span>
          </div>
          <div className="text-sm font-medium" style={{ color }}>
            {gradeLabels[grade]}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Score Display */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold text-gray-900">{score}</span>
            <span className="text-gray-600">/ 100</span>
          </div>
          <div className="text-lg font-semibold" style={{ color }}>
            {gradeLabels[grade]}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${score}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* Recommendations */}
      {showRecommendations && recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">Recommendations</h4>
          <ul className="space-y-2">
            {recommendations.map((recommendation, index) => (
              <li
                key={index}
                className="text-sm text-gray-700 flex items-start gap-2"
              >
                <span className="text-gray-400 mt-0.5">•</span>
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * PropertyHealthScoreCard Component
 * Wrapped version with card styling for sidebar placement
 */
export function PropertyHealthScoreCard({
  healthScore,
  showRecommendations = true,
}: Omit<PropertyHealthScoreProps, 'compact'>) {
  return (
    <div className="p-6 border border-gray-200 rounded-xl">
      <h3 className="font-semibold text-gray-900 mb-4">Property health</h3>
      <PropertyHealthScore
        healthScore={healthScore}
        showRecommendations={showRecommendations}
        compact={false}
      />
    </div>
  );
}
