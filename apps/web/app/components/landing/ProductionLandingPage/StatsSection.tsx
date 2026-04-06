'use client';

import { Users, TrendingUp, Star, MapPin } from 'lucide-react';
import type { Stats } from './types';

interface StatsSectionProps {
  stats: Stats;
}

export function StatsSection({ stats }: StatsSectionProps) {
  const items = [
    { icon: <Users className="w-8 h-8" />, value: stats.contractors.toLocaleString(), label: 'Verified Contractors' },
    { icon: <TrendingUp className="w-8 h-8" />, value: stats.jobs.toLocaleString(), label: 'Jobs Completed' },
    { icon: <Star className="w-8 h-8" />, value: stats.avgRating, label: 'Average Rating' },
    { icon: <MapPin className="w-8 h-8" />, value: stats.cities, label: 'Cities Covered' },
  ];

  return (
    <section className="py-20 sm:py-24" data-animate>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center"
              data-animate
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 text-teal-600 rounded-2xl mb-4">
                {stat.icon}
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-2">{stat.value}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
