'use client';

import Image from 'next/image';
import { Image as ImageIcon } from 'lucide-react';

interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  images: string[];
  description: string;
  completionDate: string;
  cost?: number;
  featured: boolean;
}

interface ContractorPortfolioProps {
  portfolio: PortfolioItem[];
}

export function ContractorPortfolio({ portfolio }: ContractorPortfolioProps) {
  if (portfolio.length === 0) return null;

  return (
    <div className="border-b border-gray-200 pb-8">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Portfolio</h2>
      <div className="grid grid-cols-2 gap-4">
        {portfolio.map((item) => (
          <div
            key={item.id}
            className="group relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer"
          >
            <div className="relative aspect-[4/3] bg-gray-100">
              {item.images && item.images.length > 0 && item.images[0] ? (
                <Image
                  src={item.images[0]}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 33vw"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const placeholder = parent.querySelector('.placeholder-fallback');
                      if (placeholder) {
                        (placeholder as HTMLElement).style.display = 'flex';
                      }
                    }
                  }}
                />
              ) : null}
              <div className="placeholder-fallback absolute inset-0 bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center" style={{ display: item.images && item.images.length > 0 && item.images[0] ? 'none' : 'flex' }}>
                <ImageIcon className="w-16 h-16 text-gray-300" />
              </div>
              {item.featured && (
                <span className="absolute top-3 right-3 px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-semibold rounded-full shadow-lg">
                  Featured
                </span>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
              <h4 className="font-semibold text-white text-lg">{item.title}</h4>
              <p className="text-white/90 text-sm">{item.category}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
