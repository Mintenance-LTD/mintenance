'use client';

import React, { useState } from 'react';
import { fadeIn, staggerContainer, staggerItem, cardHover } from '@/lib/animations/variants';
import Link from 'next/link';
import { MotionDiv } from '@/components/ui/MotionDiv';

interface Contractor {
  id: string;
  name: string;
  company?: string;
  rating: number;
  reviews: number;
  specialties: string[];
  location: string;
  verified: boolean;
  avatar?: string;
  completedJobs: number;
  hourlyRate?: string;
}

interface FindContractorsClientProps {
  contractors: Contractor[];
}

export function FindContractorsClient({ contractors }: FindContractorsClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [location, setLocation] = useState('');

  const categories = ['All', 'Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Renovation', 'Landscaping'];

  const filteredContractors = contractors.filter((contractor) => {
    const matchesSearch =
      searchQuery === '' ||
      contractor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contractor.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contractor.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || contractor.specialties.includes(selectedCategory);

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">Mintenance</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-700 hover:text-gray-900 font-medium">
                Log in
              </Link>
              <Link
                href="/register"
                className="px-6 py-2 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <MotionDiv
        className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="max-w-[1600px] mx-auto px-8 py-16 text-center">
          <h1 className="text-5xl font-bold mb-4">Find Trusted Contractors</h1>
          <p className="text-teal-100 text-xl mb-8">
            Connect with verified professionals for your home improvement projects
          </p>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-3 flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What service do you need?"
                className="w-full px-12 py-4 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter postcode or city"
                className="w-full px-12 py-4 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <button className="px-8 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg transition-all">
              Search
            </button>
          </div>
        </div>
      </MotionDiv>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-8 py-12">
        {/* Categories */}
        <MotionDiv
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8"
          variants={fadeIn}
          initial="initial"
          animate="animate"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">Categories</h2>
          <div className="flex items-center gap-3 flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </MotionDiv>

        {/* Results */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {filteredContractors.length} Contractors Found
          </h2>
          <select className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 focus:ring-2 focus:ring-teal-500">
            <option>Sort by: Best Match</option>
            <option>Highest Rated</option>
            <option>Most Reviews</option>
            <option>Nearest</option>
          </select>
        </div>

        {/* Contractors Grid */}
        <MotionDiv
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {filteredContractors.map((contractor) => (
            <MotionDiv
              key={contractor.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all overflow-hidden group"
              variants={cardHover}
              whileHover="hover"
              whileTap="tap"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                    {contractor.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 mb-1 truncate flex items-center gap-2">
                      {contractor.name}
                      {contractor.verified && (
                        <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </h3>
                    {contractor.company && <p className="text-sm text-gray-600 truncate">{contractor.company}</p>}
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-bold text-gray-900">{contractor.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-sm text-gray-600">({contractor.reviews} reviews)</span>
                </div>

                {/* Specialties */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {contractor.specialties.slice(0, 3).map((specialty, index) => (
                    <span key={index} className="px-3 py-1 bg-teal-100 text-teal-700 rounded-lg text-xs font-semibold">
                      {specialty}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Completed Jobs</p>
                    <p className="text-lg font-bold text-gray-900">{contractor.completedJobs}</p>
                  </div>
                  {contractor.hourlyRate && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Hourly Rate</p>
                      <p className="text-lg font-bold text-gray-900">{contractor.hourlyRate}</p>
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {contractor.location}
                </div>

                {/* CTA */}
                <Link
                  href={`/contractors/${contractor.id}`}
                  className="block w-full py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all text-center"
                >
                  View Profile
                </Link>
              </div>
            </MotionDiv>
          ))}
        </MotionDiv>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-[1600px] mx-auto px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold mb-4">Mintenance</h3>
              <p className="text-gray-400 text-sm">Connecting homeowners with trusted contractors</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Homeowners</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/jobs/create" className="hover:text-white">Post a Job</Link></li>
                <li><Link href="/find-contractors" className="hover:text-white">Find Contractors</Link></li>
                <li><Link href="/how-it-works" className="hover:text-white">How It Works</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Contractors</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/contractor/register" className="hover:text-white">Join as Contractor</Link></li>
                <li><Link href="/contractor/discover" className="hover:text-white">Find Jobs</Link></li>
                <li><Link href="/contractor/resources" className="hover:text-white">Resources</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
            © 2025 Mintenance. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
