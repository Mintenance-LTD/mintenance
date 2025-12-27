import React from 'react';

interface CategoryIconProps {
  category: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function CategoryIcon({ category, size = 'md', showLabel = false }: CategoryIconProps) {
  const getCategoryConfig = (category: string) => {
    const configs: Record<string, { icon: string; color: string; label: string }> = {
      handyman: { icon: '🔧', color: 'bg-blue-100 text-blue-700', label: 'Handyman' },
      plumbing: { icon: '🚰', color: 'bg-teal-100 text-teal-700', label: 'Plumbing' },
      electrical: { icon: '⚡', color: 'bg-amber-100 text-amber-700', label: 'Electrical' },
      painting: { icon: '🎨', color: 'bg-purple-100 text-purple-700', label: 'Painting' },
      carpentry: { icon: '🔨', color: 'bg-emerald-100 text-emerald-700', label: 'Carpentry' },
      cleaning: { icon: '🧹', color: 'bg-emerald-100 text-emerald-700', label: 'Cleaning' },
      gardening: { icon: '🌱', color: 'bg-green-100 text-green-700', label: 'Gardening' },
      roofing: { icon: '🏠', color: 'bg-rose-100 text-rose-700', label: 'Roofing' },
      heating: { icon: '🔥', color: 'bg-red-100 text-red-700', label: 'Heating & Gas' },
      flooring: { icon: '📐', color: 'bg-indigo-100 text-indigo-700', label: 'Flooring' },
      hvac: { icon: '❄️', color: 'bg-cyan-100 text-cyan-700', label: 'HVAC' },
      landscaping: { icon: '🌳', color: 'bg-lime-100 text-lime-700', label: 'Landscaping' },
      masonry: { icon: '🧱', color: 'bg-stone-100 text-stone-700', label: 'Masonry' },
      general: { icon: '🏗️', color: 'bg-gray-100 text-gray-700', label: 'General' },
    };

    const normalizedCategory = category.toLowerCase().replace(/\s+/g, '_');
    return (
      configs[normalizedCategory] ||
      configs[category.toLowerCase()] ||
      configs.general
    );
  };

  const config = getCategoryConfig(category);

  const sizeClasses = {
    sm: {
      container: 'w-8 h-8',
      icon: 'text-lg',
      label: 'text-xs',
    },
    md: {
      container: 'w-12 h-12',
      icon: 'text-2xl',
      label: 'text-sm',
    },
    lg: {
      container: 'w-16 h-16',
      icon: 'text-3xl',
      label: 'text-base',
    },
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${sizeClasses[size].container} ${config.color} rounded-xl flex items-center justify-center flex-shrink-0`}
        role="img"
        aria-label={config.label}
      >
        <span className={sizeClasses[size].icon} aria-hidden="true">
          {config.icon}
        </span>
      </div>
      {showLabel && (
        <span className={`${sizeClasses[size].label} font-semibold text-gray-900`}>
          {config.label}
        </span>
      )}
    </div>
  );
}
