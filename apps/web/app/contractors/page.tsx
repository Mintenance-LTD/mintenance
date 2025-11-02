'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
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

export default function ContractorsPage() {
  const { user } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [contractors] = useState<Contractor[]>(mockContractors);

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

  return (
    <HomeownerLayoutShell
      currentPath="/contractors"
      userName={user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}`.trim() : undefined}
      userEmail={user?.email}
    >
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: theme.spacing[6],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[6],
      }}>
        {/* Header */}
        <div>
          <h1 style={{
            margin: 0,
            marginBottom: theme.spacing[1],
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            Find Contractors
          </h1>
          <p style={{
            margin: 0,
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
          }}>
            {filteredContractors.length} verified contractors in your area
          </p>
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
            }}>
              <Icon name="search" size={18} color={theme.colors.textTertiary} />
            </div>
            <input
              type="text"
              placeholder="Search by name, company, or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                padding: `0 ${theme.spacing[3]} 0 ${theme.spacing[10]}`,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.lg,
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.white,
                outline: 'none',
              }}
            />
          </div>

          {/* Specialty Filters */}
          <div style={{
            display: 'flex',
            gap: theme.spacing[2],
            flexWrap: 'wrap',
          }}>
            {specialties.map((specialty) => (
              <button
                key={specialty}
                onClick={() => setSelectedSpecialty(specialty.toLowerCase())}
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  borderRadius: theme.borderRadius.full,
                  border: `1px solid ${selectedSpecialty === specialty.toLowerCase() ? theme.colors.primary : theme.colors.border}`,
                  backgroundColor: selectedSpecialty === specialty.toLowerCase() ? theme.colors.primary : theme.colors.white,
                  color: selectedSpecialty === specialty.toLowerCase() ? 'white' : theme.colors.textPrimary,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {specialty}
              </button>
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
              style={{
                backgroundColor: theme.colors.white,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.xl,
                padding: theme.spacing[5],
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = theme.shadows.md;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
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
                  <button style={{
                    width: '100%',
                    height: '40px',
                    padding: `0 ${theme.spacing[4]}`,
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: 'transparent',
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.semibold,
                    cursor: 'pointer',
                  }}>
                    View Profile
                  </button>
                </Link>
                <button style={{
                  flex: 1,
                  height: '40px',
                  padding: `0 ${theme.spacing[4]}`,
                  borderRadius: theme.borderRadius.lg,
                  border: 'none',
                  backgroundColor: theme.colors.primary,
                  color: 'white',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  cursor: 'pointer',
                }}>
                  Contact
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </HomeownerLayoutShell>
  );
}
