'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CATEGORIES } from './constants';

export function CategoriesSection() {
  return (
    <section className="py-20 sm:py-24 bg-gray-50" data-animate>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12">
          Browse by Service
        </h2>

        <div className="flex gap-6 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
          {CATEGORIES.map((category) => (
            <Link
              key={category.id}
              href={`/contractors?category=${category.id}`}
              className="flex-shrink-0 w-64 snap-start group"
            >
              <div className="card-airbnb overflow-hidden">
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                    sizes="256px"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                  <div className="absolute top-4 left-4 w-12 h-12 bg-white rounded-xl flex items-center justify-center text-teal-600">
                    {category.icon}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {category.count} contractors
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
