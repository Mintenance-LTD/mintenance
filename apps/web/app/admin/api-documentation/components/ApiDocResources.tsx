'use client';

import React from 'react';
import { Book, Shield, FileText, ExternalLink } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { cardHover } from './ApiDocData';

const resources = [
  { icon: Book, title: 'Documentation', description: 'Comprehensive guides and tutorials', color: 'text-purple-600', label: 'Read Docs' },
  { icon: Shield, title: 'Security', description: 'Learn about API security best practices', color: 'text-indigo-600', label: 'View Security' },
  { icon: FileText, title: 'Support', description: 'Get help with API integration', color: 'text-blue-600', label: 'Contact Support' },
];

export function ApiDocResources() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
      {resources.map((resource) => (
        <MotionDiv key={resource.title} variants={cardHover} initial="rest" whileHover="hover" className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <resource.icon className={`w-10 h-10 ${resource.color} mb-4`} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{resource.title}</h3>
          <p className="text-sm text-gray-600 mb-4">{resource.description}</p>
          <button className={`${resource.color} font-medium text-sm flex items-center gap-2 hover:gap-3 transition-all`}>
            {resource.label}
            <ExternalLink className="w-4 h-4" />
          </button>
        </MotionDiv>
      ))}
    </div>
  );
}
