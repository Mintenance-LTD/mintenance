'use client';

import React from 'react';
import { ChevronLeft, Share2, Heart } from 'lucide-react';

interface PageHeaderProps {
  jobTitle: string;
  jobDescription: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function PageHeader({
  jobTitle,
  jobDescription,
  isFavorite,
  onToggleFavorite,
}: PageHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-4">
      <button
        onClick={() => window.history.back()}
        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        aria-label="Go back"
      >
        <ChevronLeft className="w-6 h-6 text-gray-700" />
      </button>
      <div className="flex-1">
        <h1 className="text-sm text-gray-500">Job Details</h1>
      </div>
      <button
        onClick={onToggleFavorite}
        className="p-2 hover:bg-gray-100 rounded-xl transition-colors group"
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart
          className={`w-6 h-6 transition-all duration-200 ${
            isFavorite
              ? 'fill-teal-500 text-teal-500'
              : 'text-gray-700 group-hover:text-teal-500'
          }`}
        />
      </button>
      <button
        onClick={() => {
          navigator.share?.({
            title: jobTitle,
            text: jobDescription,
            url: window.location.href,
          });
        }}
        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        aria-label="Share job"
      >
        <Share2 className="w-6 h-6 text-gray-700" />
      </button>
    </div>
  );
}
