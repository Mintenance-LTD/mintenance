'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  MapPin,
  Calendar,
  PoundSterling,
  Star,
  Shield,
  Users,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Wrench,
  Zap,
  Home,
  Paintbrush,
  Hammer,
  Droplet
} from 'lucide-react';
import { ContractorCard } from '@/components/cards/ContractorCard';
import { LandingNavigation } from './LandingNavigation';
import { Footer2025 } from './Footer2025';

const services = [
  { icon: Wrench, name: 'Plumbing', count: '500+ contractors' },
  { icon: Zap, name: 'Electrical', count: '400+ contractors' },
  { icon: Paintbrush, name: 'Painting', count: '350+ contractors' },
  { icon: Hammer, name: 'Carpentry', count: '300+ contractors' },
  { icon: Home, name: 'Roofing', count: '250+ contractors' },
  { icon: Droplet, name: 'HVAC', count: '200+ contractors' },
];

const categories = [
  'All Services',
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Painting',
  'Roofing',
  'Landscaping',
  'HVAC',
];

const featuredContractors = [
  {
    id: '1',
    profilePhotoUrl: '/placeholder-avatar.jpg',
    name: 'John Smith',
    trade: 'Licensed Plumber',
    location: 'London, UK',
    rating: 4.9,
    reviewCount: 127,
    hourlyRate: 45,
    isVerified: true,
  },
  {
    id: '2',
    profilePhotoUrl: '/placeholder-avatar.jpg',
    name: 'Emma Williams',
    trade: 'Master Electrician',
    location: 'Manchester, UK',
    rating: 4.8,
    reviewCount: 98,
    hourlyRate: 50,
    isVerified: true,
  },
  {
    id: '3',
    profilePhotoUrl: '/placeholder-avatar.jpg',
    name: 'Michael Brown',
    trade: 'Professional Carpenter',
    location: 'Birmingham, UK',
    rating: 5.0,
    reviewCount: 156,
    hourlyRate: 40,
    isVerified: true,
  },
  {
    id: '4',
    profilePhotoUrl: '/placeholder-avatar.jpg',
    name: 'Sarah Johnson',
    trade: 'Expert Painter',
    location: 'Leeds, UK',
    rating: 4.7,
    reviewCount: 84,
    hourlyRate: 35,
    isVerified: true,
  },
];

const howItWorksSteps = [
  {
    step: 1,
    title: 'Post Your Job',
    description: 'Describe your project and what you need done',
    icon: CheckCircle,
  },
  {
    step: 2,
    title: 'Get Matched',
    description: 'Receive quotes from vetted contractors',
    icon: Users,
  },
  {
    step: 3,
    title: 'Hire & Complete',
    description: 'Choose the best contractor and get it done',
    icon: Shield,
  },
];

export function AirbnbLandingPage() {
  const [selectedService, setSelectedService] = useState('All Services');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [scrollPosition, setScrollPosition] = useState(0);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedService !== 'All Services') params.set('service', selectedService);
    if (location) params.set('location', location);
    window.location.href = `/contractors?${params.toString()}`;
  };

  const scrollServices = (direction: 'left' | 'right') => {
    const container = document.getElementById('services-carousel');
    if (container) {
      const scrollAmount = 300;
      const newPosition = direction === 'left'
        ? Math.max(0, scrollPosition - scrollAmount)
        : Math.min(container.scrollWidth - container.clientWidth, scrollPosition + scrollAmount);

      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  return (
    <>
      {/* Navigation */}
      <LandingNavigation />

      <main id="main-content">
        {/* Hero Section with Search */}
        <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-900/80 via-teal-800/70 to-emerald-900/80 z-10" />
            <div className="w-full h-full bg-gradient-to-br from-teal-100 to-emerald-100" />
          </div>

          {/* Content */}
          <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6">
                Find trusted tradespeople<br />for your home
              </h1>
              <p className="text-xl sm:text-2xl text-teal-100 mb-4">
                Book vetted contractors • Fixed prices • Instant quotes
              </p>
            </div>

            {/* Large Search Bar */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-full shadow-2xl p-2">
                <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_2fr_auto] gap-2">
                  {/* What - Service Type */}
                  <div className="relative">
                    <label className="absolute left-6 top-2 text-xs font-semibold text-gray-900">
                      What
                    </label>
                    <select
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="w-full h-16 pl-6 pr-4 pt-5 rounded-full border-0 focus:ring-2 focus:ring-teal-500 bg-transparent text-gray-700 font-medium appearance-none cursor-pointer"
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Where - Location */}
                  <div className="relative">
                    <label className="absolute left-6 top-2 text-xs font-semibold text-gray-900">
                      Where
                    </label>
                    <input
                      type="text"
                      placeholder="Enter postcode"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full h-16 pl-6 pr-4 pt-5 rounded-full border-0 focus:ring-2 focus:ring-teal-500 bg-transparent text-gray-700 font-medium placeholder:text-gray-400"
                    />
                  </div>

                  {/* When - Date Picker */}
                  <div className="relative">
                    <label className="absolute left-6 top-2 text-xs font-semibold text-gray-900">
                      When
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-16 pl-6 pr-4 pt-5 rounded-full border-0 focus:ring-2 focus:ring-teal-500 bg-transparent text-gray-700 font-medium"
                    />
                  </div>

                  {/* Search Button */}
                  <button
                    onClick={handleSearch}
                    className="h-16 w-16 bg-teal-600 hover:bg-teal-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                  >
                    <PoundSterling className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 mt-8 text-white">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span className="font-medium">50k+ Homeowners</span>
              </div>
              <div className="w-px h-6 bg-white/30" />
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span className="font-medium">10k+ Contractors</span>
              </div>
              <div className="w-px h-6 bg-white/30" />
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-current" />
                <span className="font-medium">4.9★ Average Rating</span>
              </div>
            </div>
          </div>
        </section>

        {/* Popular Services Carousel */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Popular Services</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => scrollServices('left')}
                  className="p-2 rounded-full border border-gray-300 hover:border-gray-400 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => scrollServices('right')}
                  className="p-2 rounded-full border border-gray-300 hover:border-gray-400 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div
              id="services-carousel"
              className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {services.map((service, index) => {
                const Icon = service.icon;
                return (
                  <Link
                    key={index}
                    href={`/contractors?service=${service.name}`}
                    className="flex-shrink-0 w-64 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow p-6 group"
                  >
                    <div className="bg-teal-100 p-4 rounded-xl inline-block mb-4 group-hover:bg-teal-200 transition-colors">
                      <Icon className="w-8 h-8 text-teal-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {service.name}
                    </h3>
                    <p className="text-gray-600">{service.count}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Featured Contractors */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Featured Contractors
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredContractors.map((contractor) => (
                <ContractorCard
                  key={contractor.id}
                  {...contractor}
                  onClick={(id) => (window.location.href = `/contractors/${id}`)}
                />
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                href="/contractors"
                className="inline-flex items-center gap-2 px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors"
              >
                View All Contractors
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                How It Works
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Find and hire trusted contractors in three simple steps
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {howItWorksSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.step}
                    className="bg-white rounded-xl border border-gray-200 p-8 text-center hover:shadow-lg transition-shadow"
                  >
                    <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-2xl font-bold text-teal-600">
                        {step.step}
                      </span>
                    </div>
                    <Icon className="w-12 h-12 text-teal-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-12">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors"
              >
                Get Started
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to start your project?
            </h2>
            <p className="text-xl text-teal-100 mb-8 max-w-2xl mx-auto">
              Join thousands of homeowners who have found trusted contractors on Mintenance
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="px-8 py-4 bg-white text-teal-600 hover:bg-gray-50 font-semibold rounded-xl transition-colors"
              >
                Post a Job
              </Link>
              <Link
                href="/contractors"
                className="px-8 py-4 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl transition-colors border-2 border-white/20"
              >
                Browse Contractors
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="footer">
        <Footer2025 />
      </footer>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}
