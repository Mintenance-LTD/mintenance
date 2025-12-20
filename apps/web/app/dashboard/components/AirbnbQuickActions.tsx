'use client';

import React from 'react';
import Link from 'next/link';
import { PlusCircle, Search, MessageSquare, Calendar } from 'lucide-react';

export function AirbnbQuickActions() {
  const actions = [
    {
      label: 'Post a Job',
      icon: PlusCircle,
      href: '/jobs/create',
      description: 'Create a new project',
    },
    {
      label: 'Find Contractors',
      icon: Search,
      href: '/contractors',
      description: 'Browse professionals',
    },
    {
      label: 'Messages',
      icon: MessageSquare,
      href: '/messages',
      description: 'View conversations',
    },
    {
      label: 'Schedule',
      icon: Calendar,
      href: '/scheduling/meetings',
      description: 'Book meetings',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            href={action.href}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                <Icon className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{action.label}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
