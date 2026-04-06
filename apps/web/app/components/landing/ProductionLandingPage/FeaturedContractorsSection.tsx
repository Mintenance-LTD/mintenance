'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, ArrowRight, Heart } from 'lucide-react';
import type { FeaturedContractor } from './types';

interface FeaturedContractorsSectionProps {
  isLoading: boolean;
  featuredContractors: FeaturedContractor[];
}

export function FeaturedContractorsSection({ isLoading, featuredContractors }: FeaturedContractorsSectionProps) {
  return (
    <section className="py-20 sm:py-24" data-animate>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              Featured Contractors
            </h2>
            <p className="text-lg text-gray-600">
              Top-rated professionals ready to help
            </p>
          </div>
          <Link
            href="/contractors"
            className="hidden sm:flex items-center gap-2 text-teal-600 hover:text-teal-700 font-semibold transition-colors"
          >
            View all
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card-airbnb p-6 animate-pulse">
                <div className="aspect-[3/2] bg-gray-200 rounded-xl mb-4" />
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
            {featuredContractors.map((contractor) => (
              <Link
                key={contractor.id}
                href={`/contractors/${contractor.id}`}
                className="listing-card group"
              >
                <div className="listing-card-image">
                  <Image
                    src={contractor.image}
                    alt={contractor.full_name || 'Contractor'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    loading="lazy"
                  />
                  <button
                    className="listing-card-favorite"
                    onClick={(e) => {
                      e.preventDefault();
                    }}
                    aria-label="Add to favorites"
                  >
                    <Heart className="w-5 h-5 text-gray-700" />
                  </button>
                </div>

                <div className="listing-card-content">
                  <div className="flex items-center justify-between">
                    <h3 className="listing-card-title">{contractor.full_name}</h3>
                    <div className="listing-card-rating">
                      <Star className="w-4 h-4 text-gray-900" fill="currentColor" />
                      <span>{contractor.rating}</span>
                    </div>
                  </div>
                  <p className="listing-card-subtitle">{contractor.category}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {contractor.jobs_completed} jobs completed
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link href="/contractors" className="btn-primary">
            View all contractors
          </Link>
        </div>
      </div>
    </section>
  );
}
