'use client';

import React from 'react';
import { StandardCard } from '@/components/ui/StandardCard';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { SkillsDisplay } from './SkillsDisplay';
import { PortfolioSection } from './PortfolioSection';

interface CompanyInfoCardProps {
  contractorId: string;
  profileCompletion: number;
  skills: string[];
  portfolioImages?: string[];
}

/**
 * CompanyInfoCard - Company card with circular progress indicator
 */
export function CompanyInfoCard({
  contractorId,
  profileCompletion,
  skills,
  portfolioImages = [],
}: CompanyInfoCardProps) {
  return (
    <div className="space-y-6">
      <StandardCard>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Company Profile</h3>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-600">Profile Completion</div>
                <div className="text-2xl font-bold text-gray-900">{profileCompletion}%</div>
              </div>
              <CircularProgress value={profileCompletion} size={64} />
            </div>
          </div>
        </div>
      </StandardCard>

      {/* Skills Display */}
      {skills.length > 0 && <SkillsDisplay skills={skills} />}

      {/* Portfolio Section */}
      {portfolioImages.length > 0 && (
        <PortfolioSection images={portfolioImages} />
      )}
    </div>
  );
}

