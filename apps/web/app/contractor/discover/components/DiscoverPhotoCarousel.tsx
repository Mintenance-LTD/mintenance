'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

interface DiscoverPhotoCarouselProps {
  photos: string[];
  title: string;
  distanceBadge?: string;
  isNew?: boolean;
}

export function DiscoverPhotoCarousel({ photos, title, distanceBadge, isNew }: DiscoverPhotoCarouselProps) {
  const [idx, setIdx] = useState(0);
  const multi = photos.length > 1;

  const go = (dir: 1 | -1, e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx(i => (i + dir + photos.length) % photos.length);
  };

  return (
    <div className="relative h-48 bg-gray-100 overflow-hidden group">
      <img
        src={photos[idx]}
        alt={`${title} – photo ${idx + 1}`}
        className="w-full h-full object-cover transition-opacity duration-200"
        onError={e => { (e.target as HTMLImageElement).src = '/placeholder-job.jpg'; }}
      />

      {multi && (
        <>
          <button
            onClick={e => go(-1, e)}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={e => go(1, e)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Next photo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setIdx(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/50'}`}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Distance badge */}
      {distanceBadge && (
        <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {distanceBadge}
        </span>
      )}

      {/* New badge */}
      {isNew && (
        <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide">
          NEW
        </span>
      )}
    </div>
  );
}
