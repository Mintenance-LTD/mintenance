'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { Zap, Clock, Wrench, Droplets, Lightbulb, BookOpen, Armchair, DoorClosed, Paintbrush, Home } from 'lucide-react';

interface QuickJobTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  fixedPrice?: { min: number; max: number };
  estimatedDuration: string;
  icon: React.ReactNode;
  sameDayAvailable: boolean;
}

interface QuickJobTemplatesProps {
  onSelectTemplate: (template: QuickJobTemplate) => void;
}

/**
 * Quick Job Templates Component
 * Provides pre-filled templates for common small jobs
 */
export function QuickJobTemplates({ onSelectTemplate }: QuickJobTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const quickJobTemplates: QuickJobTemplate[] = [
    {
      id: 'fix-leaky-tap',
      title: 'Fix Leaky Tap',
      category: 'plumbing',
      description: 'Repair or replace leaking tap. Includes diagnosis, repair, and testing.',
      fixedPrice: { min: 50, max: 120 },
      estimatedDuration: '1-2 hours',
      icon: <Wrench className="w-6 h-6" />,
      sameDayAvailable: true,
    },
    {
      id: 'unblock-drain',
      title: 'Unblock Drain',
      category: 'plumbing',
      description: 'Clear blocked sink, bath, or shower drain using professional equipment.',
      fixedPrice: { min: 60, max: 150 },
      estimatedDuration: '1-2 hours',
      icon: <Droplets className="w-6 h-6" />,
      sameDayAvailable: true,
    },
    {
      id: 'replace-light-switch',
      title: 'Replace Light Switch',
      category: 'electrical',
      description: 'Replace single or double light switch. Includes testing and certification.',
      fixedPrice: { min: 50, max: 100 },
      estimatedDuration: '30-60 minutes',
      icon: <Lightbulb className="w-6 h-6" />,
      sameDayAvailable: true,
    },
    {
      id: 'hang-picture',
      title: 'Hang Picture/Mirror',
      category: 'handyman',
      description: 'Hang picture, mirror, or shelf securely on wall. Includes finding studs.',
      fixedPrice: { min: 30, max: 80 },
      estimatedDuration: '30-60 minutes',
      icon: <BookOpen className="w-6 h-6" />,
      sameDayAvailable: true,
    },
    {
      id: 'assemble-furniture',
      title: 'Assemble Furniture',
      category: 'handyman',
      description: 'Assemble flat-pack furniture. Includes moving to desired location.',
      fixedPrice: { min: 40, max: 120 },
      estimatedDuration: '1-3 hours',
      icon: <Armchair className="w-6 h-6" />,
      sameDayAvailable: false,
    },
    {
      id: 'fix-door',
      title: 'Fix Door/Window',
      category: 'handyman',
      description: 'Repair sticking door or window. Includes adjustment and lubrication.',
      fixedPrice: { min: 50, max: 150 },
      estimatedDuration: '1-2 hours',
      icon: <DoorClosed className="w-6 h-6" />,
      sameDayAvailable: true,
    },
    {
      id: 'paint-room',
      title: 'Paint Single Room',
      category: 'painting',
      description: 'Paint walls and ceiling of one room. Includes preparation and cleanup.',
      fixedPrice: { min: 200, max: 500 },
      estimatedDuration: '1-2 days',
      icon: <Paintbrush className="w-6 h-6" />,
      sameDayAvailable: false,
    },
    {
      id: 'gutter-clean',
      title: 'Clean Gutters',
      category: 'handyman',
      description: 'Clean and clear gutters. Includes removal of debris and testing flow.',
      fixedPrice: { min: 80, max: 200 },
      estimatedDuration: '2-4 hours',
      icon: <Home className="w-6 h-6" />,
      sameDayAvailable: false,
    },
    {
      id: 'fix-toilet',
      title: 'Fix Toilet Issues',
      category: 'plumbing',
      description: 'Repair running toilet, weak flush, or leaks. Includes parts if needed.',
      fixedPrice: { min: 60, max: 150 },
      estimatedDuration: '1-2 hours',
      icon: <Droplets className="w-6 h-6" />,
      sameDayAvailable: true,
    },
    {
      id: 'install-shelf',
      title: 'Install Shelf',
      category: 'handyman',
      description: 'Install wall shelf or floating shelf. Includes finding studs and leveling.',
      fixedPrice: { min: 40, max: 100 },
      estimatedDuration: '1 hour',
      icon: <BookOpen className="w-6 h-6" />,
      sameDayAvailable: true,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Job Templates
        </CardTitle>
        <CardDescription>
          Start with a template for common jobs. All templates include fixed pricing estimates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickJobTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => {
                setSelectedTemplate(template.id);
                onSelectTemplate(template);
              }}
              className={`p-4 border-2 rounded-lg transition-all text-left ${
                selectedTemplate === template.id
                  ? 'border-secondary bg-secondary/5'
                  : 'border-gray-200 hover:border-secondary/50 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="text-gray-600">{template.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{template.title}</h4>
                    {template.sameDayAvailable && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                        <Clock className="h-3 w-3" />
                        Same Day
                      </span>
                    )}
                  </div>
                  {template.fixedPrice && (
                    <p className="text-sm font-semibold text-secondary mb-1">
                      £{template.fixedPrice.min}-£{template.fixedPrice.max}
                    </p>
                  )}
                  <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{template.estimatedDuration}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

