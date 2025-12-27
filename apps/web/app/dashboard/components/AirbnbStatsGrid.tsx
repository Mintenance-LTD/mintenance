import React from 'react';
import Link from 'next/link';
import { Briefcase, CheckCircle2, DollarSign, FileText } from 'lucide-react';

interface AirbnbStatsGridProps {
  activeJobsCount: number;
  postedJobsCount: number;
  completedJobsCount: number;
  totalSpent: number;
}

export function AirbnbStatsGrid({
  activeJobsCount,
  postedJobsCount,
  completedJobsCount,
  totalSpent,
}: AirbnbStatsGridProps) {
  const stats = [
    {
      label: 'Jobs Posted',
      value: postedJobsCount,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/jobs',
    },
    {
      label: 'Active Jobs',
      value: activeJobsCount,
      icon: Briefcase,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      href: '/jobs',
    },
    {
      label: 'Completed',
      value: completedJobsCount,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      href: '/jobs',
    },
    {
      label: 'Total Spent',
      value: `$${totalSpent.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      href: '/payments',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div className="text-3xl font-semibold text-gray-900 mb-1">
              {stat.value}
            </div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </Link>
        );
      })}
    </div>
  );
}
