'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';;
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { fadeIn, staggerContainer, staggerItem, cardHover } from '@/lib/animations/variants';
import { formatMoney } from '@/lib/utils/currency';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { MotionArticle, MotionDiv } from '@/components/ui/MotionDiv';

interface Property {
  id: string;
  property_name: string | null;
  address: string | null;
  property_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_footage?: number | null;
  year_built?: number | null;
  is_primary?: boolean;
  created_at: string;
  activeJobs: number;
  completedJobs: number;
  totalSpent: number;
  lastServiceDate: string | null;
  recentCategories: string[];
}

interface PropertiesClient2025Props {
  properties: Property[];
  userInfo: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export function PropertiesClient2025({ properties, userInfo }: PropertiesClient2025Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProperty, setNewProperty] = useState({
    property_name: '',
    address: '',
    property_type: 'house',
    bedrooms: '',
    bathrooms: '',
  });

  const totalActiveJobs = properties.reduce((sum, p) => sum + p.activeJobs, 0);
  const totalCompleted = properties.reduce((sum, p) => sum + p.completedJobs, 0);
  const totalSpent = properties.reduce((sum, p) => sum + p.totalSpent, 0);

  const handleAddProperty = async () => {
    if (!newProperty.property_name || !newProperty.address) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProperty),
      });

      if (!response.ok) throw new Error('Failed to add property');

      toast.success('Property added successfully!');
      setShowAddModal(false);
      window.location.reload();
    } catch (error) {
      toast.error('Failed to add property');
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar userRole="homeowner" userInfo={userInfo} />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1600px] mx-auto px-8 py-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold mb-2">My Properties</h1>
                <p className="text-teal-100 text-lg">Manage your properties and maintenance history</p>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-white text-teal-600 rounded-xl font-semibold hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Property
              </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Properties', value: properties.length, icon: '🏠' },
                { label: 'Active Jobs', value: totalActiveJobs, icon: '🔧' },
                { label: 'Completed Jobs', value: totalCompleted, icon: '✅' },
                { label: 'Total Spent', value: formatMoney(totalSpent, 'GBP'), icon: '💰' },
              ].map((stat) => (
                <MotionDiv
                  key={stat.label}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20"
                  variants={staggerItem}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{stat.icon}</span>
                    <div>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-teal-100 text-sm">{stat.label}</div>
                    </div>
                  </div>
                </MotionDiv>
              ))}
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1600px] mx-auto px-8 py-8 w-full">
          {properties.length === 0 ? (
            <MotionDiv
              className="bg-white rounded-2xl border border-gray-200 p-12 text-center"
              variants={fadeIn}
              initial="initial"
              animate="animate"
            >
              <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No properties yet</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Add your first property to start managing maintenance jobs and tracking service history
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-8 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
              >
                Add Your First Property
              </button>
            </MotionDiv>
          ) : (
            <MotionDiv
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {properties.map((property) => (
                <MotionArticle
                  key={property.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                  variants={cardHover}
                  initial="rest"
                  whileHover="hover"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-br from-teal-500 to-emerald-500 p-6 text-white">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-2xl font-bold">
                            {property.property_name || 'Unnamed Property'}
                          </h3>
                          {property.is_primary && (
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-lg">
                              PRIMARY
                            </span>
                          )}
                        </div>
                        <p className="text-teal-100 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {property.address || 'No address'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-teal-100 mb-1">Property Type</div>
                        <div className="text-lg font-semibold capitalize">
                          {property.property_type || 'House'}
                        </div>
                      </div>
                    </div>

                    {/* Property Details */}
                    {(property.bedrooms || property.bathrooms || property.square_footage) && (
                      <div className="flex items-center gap-4 text-sm">
                        {property.bedrooms && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            {property.bedrooms} bed
                          </div>
                        )}
                        {property.bathrooms && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                            </svg>
                            {property.bathrooms} bath
                          </div>
                        )}
                        {property.square_footage && (
                          <div className="flex items-center gap-1">
                            📐 {property.square_footage.toLocaleString()} sq ft
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="p-6">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-teal-600">{property.activeJobs}</div>
                        <div className="text-xs text-gray-500">Active Jobs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-600">{property.completedJobs}</div>
                        <div className="text-xs text-gray-500">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          £{(property.totalSpent / 1000).toFixed(1)}k
                        </div>
                        <div className="text-xs text-gray-500">Total Spent</div>
                      </div>
                    </div>

                    {/* Recent Categories */}
                    {property.recentCategories.length > 0 && (
                      <div className="mb-6">
                        <div className="text-xs font-semibold text-gray-500 mb-2">Recent Services</div>
                        <div className="flex flex-wrap gap-2">
                          {property.recentCategories.slice(0, 3).map((cat, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded-lg capitalize"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Last Service */}
                    {property.lastServiceDate && (
                      <div className="mb-6 pb-6 border-b border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Last Service</div>
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(property.lastServiceDate).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Link
                        href={`/properties/${property.id}`}
                        className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-center hover:bg-gray-200 transition-colors"
                      >
                        View Details
                      </Link>
                      <Link
                        href={`/jobs/create?property_id=${property.id}`}
                        className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-medium text-center hover:bg-teal-700 transition-colors"
                      >
                        Post Job
                      </Link>
                    </div>
                  </div>
                </MotionArticle>
              ))}
            </MotionDiv>
          )}
        </div>

        {/* Add Property Modal */}
        <AnimatePresence>
          {showAddModal && (
            <MotionDiv
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
            >
              <MotionDiv
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Property</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Property Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="My Home"
                      value={newProperty.property_name}
                      onChange={(e) => setNewProperty({ ...newProperty, property_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Address <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="123 Main St, City, Postcode"
                      value={newProperty.address}
                      onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                      <select
                        value={newProperty.property_type}
                        onChange={(e) => setNewProperty({ ...newProperty, property_type: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="house">House</option>
                        <option value="apartment">Apartment</option>
                        <option value="condo">Condo</option>
                        <option value="townhouse">Townhouse</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Bedrooms</label>
                      <input
                        type="number"
                        placeholder="3"
                        value={newProperty.bedrooms}
                        onChange={(e) => setNewProperty({ ...newProperty, bedrooms: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Bathrooms</label>
                      <input
                        type="number"
                        placeholder="2"
                        value={newProperty.bathrooms}
                        onChange={(e) => setNewProperty({ ...newProperty, bathrooms: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddProperty}
                    className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors"
                  >
                    Add Property
                  </button>
                </div>
              </MotionDiv>
            </MotionDiv>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
