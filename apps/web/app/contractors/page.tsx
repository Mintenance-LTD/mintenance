'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PublicLayout } from '../components/layouts/PublicLayout';
import { HomeownerLayoutShell } from '../dashboard/components/HomeownerLayoutShell';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import Link from 'next/link';

interface Contractor {
  id: string;
  name: string;
  company: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  completedJobs: number;
  responseTime: string;
  hourlyRate?: number;
  location: string;
  avatar?: string;
  verified: boolean;
  availability: 'available' | 'busy' | 'booked';
}

// Mock data
const mockContractors: Contractor[] = [
  {
    id: '1',
    name: 'Mike Johnson',
    company: 'Johnson Plumbing Services',
    specialties: ['Plumbing', 'Water Heaters', 'Pipe Repair'],
    rating: 4.9,
    reviewCount: 127,
    completedJobs: 156,
    responseTime: '< 2 hours',
    hourlyRate: 85,
    location: 'Austin, TX',
    verified: true,
    availability: 'available',
  },
  {
    id: '2',
    name: 'Sarah Martinez',
    company: 'Elite HVAC Solutions',
    specialties: ['HVAC', 'AC Repair', 'Heating'],
    rating: 4.8,
    reviewCount: 98,
    completedJobs: 142,
    responseTime: '< 1 hour',
    hourlyRate: 95,
    location: 'Austin, TX',
    verified: true,
    availability: 'available',
  },
  {
    id: '3',
    name: 'David Chen',
    company: 'Chen Electrical',
    specialties: ['Electrical', 'Wiring', 'Panel Upgrades'],
    rating: 5.0,
    reviewCount: 85,
    completedJobs: 98,
    responseTime: '< 3 hours',
    hourlyRate: 90,
    location: 'Austin, TX',
    verified: true,
    availability: 'busy',
  },
];

function ContractorsPageContent() {
  const { user } = useCurrentUser();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [contractors] = useState<Contractor[]>(mockContractors);

  // Initialize search query from URL parameter
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [searchParams]);

  const specialties = ['All', 'Plumbing', 'HVAC', 'Electrical', 'Carpentry', 'Painting', 'Roofing'];

  const filteredContractors = contractors.filter(contractor => {
    const matchesSearch = contractor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contractor.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contractor.specialties.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesSpecialty = selectedSpecialty === 'all' || 
      contractor.specialties.some(s => s.toLowerCase() === selectedSpecialty.toLowerCase());

    return matchesSearch && matchesSpecialty;
  });

  const getAvailabilityColor = (availability: Contractor['availability']) => {
    switch (availability) {
      case 'available':
        return { bg: '#D1FAE5', text: '#065F46' };
      case 'busy':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'booked':
        return { bg: '#FEE2E2', text: '#991B1B' };
    }
  };

  const content = (
    <div style={{
      maxWidth: '1440px',
      margin: '0 auto',
      padding: theme.spacing[6],
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing[6],
    }}>
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50 p-8 -m-8 rounded-2xl mb-8">
        <div>
          <div className="flex items-start gap-4 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center shadow-sm">
              <Icon name="users" size={28} color={theme.colors.primary} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
                Find Contractors
              </h1>
              <p className="text-base font-medium text-gray-600 leading-relaxed">
                {filteredContractors.length} verified contractors in your area
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
        {/* Search Bar */}
        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <div style={{
            position: 'absolute',
            left: theme.spacing[3],
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            zIndex: 10,
          }}>
            <Icon name="search" size={18} color={theme.colors.textTertiary} />
          </div>
          <Input
            type="text"
            placeholder="Search by name, company, or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-12 pr-4"
          />
        </div>

        {/* Specialty Filters */}
        <div style={{
          display: 'flex',
          gap: theme.spacing[2],
          flexWrap: 'wrap',
        }}>
          {specialties.map((specialty) => (
            <Button
              key={specialty}
              variant={selectedSpecialty === specialty.toLowerCase() ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedSpecialty(specialty.toLowerCase())}
              className="rounded-full capitalize"
            >
              {specialty}
            </Button>
          ))}
        </div>
      </div>

      {/* Contractors Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: theme.spacing[4],
      }}>
        {filteredContractors.map((contractor) => (
          <div
            key={contractor.id}
            className="bg-white rounded-2xl border border-gray-200 p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-gray-300 group relative overflow-hidden"
          >
            {/* Gradient bar - appears on hover, always visible on large screens */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: theme.spacing[3],
              marginBottom: theme.spacing[4],
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: theme.borderRadius.full,
                backgroundColor: theme.colors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                position: 'relative',
              }}>
                <span style={{
                  fontSize: theme.typography.fontSize.xl,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: 'white',
                }}>
                  {contractor.name.split(' ').map(n => n[0]).join('')}
                </span>
                {contractor.verified && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    border: `2px solid ${theme.colors.white}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon name="check" size={12} color="white" />
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                  margin: 0,
                  marginBottom: '2px',
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                }}>
                  {contractor.name}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  marginBottom: '4px',
                }}>
                  {contractor.company}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
                  <Icon name="star" size={14} color="#F59E0B" />
                  <span style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.textPrimary,
                  }}>
                    {contractor.rating}
                  </span>
                  <span style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                  }}>
                    ({contractor.reviewCount} reviews)
                  </span>
                </div>
              </div>
            </div>

            {/* Specialties */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: theme.spacing[2],
              marginBottom: theme.spacing[4],
            }}>
              {contractor.specialties.map((specialty, index) => (
                <span
                  key={index}
                  style={{
                    padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: theme.colors.backgroundSecondary,
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.medium,
                  }}
                >
                  {specialty}
                </span>
              ))}
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: theme.spacing[3],
              marginBottom: theme.spacing[4],
              paddingBottom: theme.spacing[4],
              borderBottom: `1px solid ${theme.colors.border}`,
            }}>
              <div>
                <div style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                  marginBottom: '2px',
                }}>
                  Completed Jobs
                </div>
                <div style={{
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {contractor.completedJobs}
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                  marginBottom: '2px',
                }}>
                  Response Time
                </div>
                <div style={{
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                }}>
                  {contractor.responseTime}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textTertiary,
                }}>
                  {contractor.location}
                </span>
                {contractor.hourlyRate && (
                  <span style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.textPrimary,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    ${contractor.hourlyRate}/hr
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: theme.spacing[2], alignItems: 'center' }}>
                <div style={{
                  padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: getAvailabilityColor(contractor.availability).bg,
                  color: getAvailabilityColor(contractor.availability).text,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  textTransform: 'capitalize',
                }}>
                  {contractor.availability}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: theme.spacing[2],
              marginTop: theme.spacing[4],
            }}>
              <Link href={`/contractors/${contractor.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                <button className="w-full h-10 px-4 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400">
                  View Profile
                </button>
              </Link>
              <Link
                href={`/contractors/${contractor.id}`}
                className="flex-1 h-10 px-4 rounded-xl border-none bg-secondary text-white text-sm font-semibold cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-secondary-600 active:scale-95 shadow-md hover:shadow-lg"
              >
                Contact
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    user ? (
      <HomeownerLayoutShell
        currentPath="/contractors"
        userName={user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}`.trim() : undefined}
        userEmail={user?.email}
      >
        {content}
      </HomeownerLayoutShell>
    ) : (
      <PublicLayout>
        {content}
      </PublicLayout>
    )
  );
}

export default function ContractorsPage() {
  return (
    <Suspense fallback={
      <HomeownerLayoutShell currentPath="/contractors">
        <div style={{ padding: theme.spacing[6], textAlign: 'center' }}>
          <div className="animate-pulse">Loading contractors...</div>
        </div>
      </HomeownerLayoutShell>
    }>
      <ContractorsPageContent />
    </Suspense>
  );
}
