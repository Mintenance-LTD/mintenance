'use client';

import React from 'react';
import { StandardCard } from '@/components/ui/StandardCard';
import { Badge } from '@/components/ui/Badge.unified';

interface SkillsDisplayProps {
  skills: string[];
}

/**
 * SkillsDisplay - Skills tags component
 */
export function SkillsDisplay({ skills }: SkillsDisplayProps) {
  if (skills.length === 0) {
    return null;
  }

  return (
    <StandardCard>
      <div className="space-y-3">
        <h4 className="text-base font-semibold text-gray-900">Skills</h4>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <Badge key={index}>
              {skill}
            </Badge>
          ))}
        </div>
      </div>
    </StandardCard>
  );
}

