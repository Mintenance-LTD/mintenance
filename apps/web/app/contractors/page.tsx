'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { ContractorService } from '@/lib/services/ContractorService';
import { SearchBar } from '@/components/SearchBar';
import { Button, Card } from '@/components/ui';
import { theme } from '@/lib/theme';
import type { ContractorProfile, User } from '@mintenance/types';

type ViewMode = 'list' | 'cards';
type FilterOption = 'all' | 'immediate' | 'this_week' | 'this_month';

export default function ContractorsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [contractors, setContractors] = useState<ContractorProfile[]>([]);
  const [filteredContractors, setFilteredContractors] = useState<ContractorProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUserFromCookies();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadContractors();
    }
  }, [user]);

  useEffect(() => {
    filterContractors();
  }, [contractors, searchQuery, selectedFilter]);

  const loadContractors = async () => {
    setLoading(true);
    try {
      const data = await ContractorService.getAllContractors();
      setContractors(data);
    } catch (error) {
      console.error('Error loading contractors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterContractors = () => {
    let filtered = contractors;

    // Filter by availability
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(contractor => contractor.availability === selectedFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contractor =>
        contractor.first_name.toLowerCase().includes(query) ||
        contractor.last_name.toLowerCase().includes(query) ||
        contractor.companyName?.toLowerCase().includes(query) ||
        contractor.specialties?.some(specialty => specialty.toLowerCase().includes(query)) ||
        contractor.skills?.some(skill => skill.skillName.toLowerCase().includes(query))
      );
    }

    setFilteredContractors(filtered);
  };

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary }}>
            Access Denied
          </h1>
          <p style={{ color: theme.colors.textSecondary }}>You must be logged in to view this page.</p>
          <a href="/login" style={{ color: theme.colors.primary, textDecoration: 'none' }}>
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.surfaceSecondary }}>
      {/* Header */}
      <div style={{ backgroundColor: theme.colors.primary, paddingTop: '60px', paddingBottom: '20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingLeft: '20px',
          paddingRight: '20px',
          marginBottom: '20px'
        }}>
          <div>
            <h1 style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textInverse,
              marginBottom: '4px',
              margin: 0
            }}>
              Find Contractors
            </h1>
            <p style={{
              fontSize: theme.typography.fontSize.xl,
              color: theme.colors.textInverseMuted,
              fontWeight: theme.typography.fontWeight.medium,
              margin: 0
            }}>
              {filteredContractors.length} professionals available
            </p>
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                backgroundColor: viewMode === 'cards' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.15)',
                border: `1px solid ${viewMode === 'cards' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)'}`,
                borderRadius: '8px',
                padding: '8px 12px',
                color: theme.colors.textInverse,
                cursor: 'pointer'
              }}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                backgroundColor: viewMode === 'list' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.15)',
                border: `1px solid ${viewMode === 'list' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)'}`,
                borderRadius: '8px',
                padding: '8px 12px',
                color: theme.colors.textInverse,
                cursor: 'pointer'
              }}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div style={{ paddingLeft: '20px', paddingRight: '20px', paddingBottom: '16px' }}>
          <div style={{ marginBottom: '12px' }}>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search contractors, companies, or skills..."
            />
          </div>

          {/* Filter Chips */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {(['all', 'immediate', 'this_week', 'this_month'] as FilterOption[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                style={{
                  backgroundColor: selectedFilter === filter
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'rgba(255, 255, 255, 0.15)',
                  paddingLeft: '12px',
                  paddingRight: '12px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  borderRadius: '20px',
                  border: `1px solid ${
                    selectedFilter === filter
                      ? 'rgba(255, 255, 255, 0.5)'
                      : 'rgba(255, 255, 255, 0.3)'
                  }`,
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textInverse,
                  fontWeight: theme.typography.fontWeight.medium,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                {filter === 'all' ? 'All' :
                 filter === 'this_week' ? 'This Week' :
                 filter === 'this_month' ? 'This Month' :
                 filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contractors List */}
      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 40px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: `3px solid ${theme.colors.border}`,
              borderTop: `3px solid ${theme.colors.primary}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ color: theme.colors.textSecondary }}>Loading contractors...</p>
          </div>
        ) : filteredContractors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 40px' }}>
            <h2 style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: '12px'
            }}>
              No Contractors Found
            </h2>
            <p style={{
              fontSize: theme.typography.fontSize.xl,
              color: theme.colors.textSecondary,
              lineHeight: theme.typography.lineHeight.relaxed,
              maxWidth: '280px',
              margin: '0 auto'
            }}>
              Try adjusting your search criteria or filters
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'cards'
              ? 'repeat(auto-fill, minmax(350px, 1fr))'
              : '1fr',
            gap: viewMode === 'cards' ? '20px' : '12px'
          }}>
            {filteredContractors.map((contractor) => (
              <ContractorCard
                key={contractor.id}
                contractor={contractor}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

interface ContractorCardProps {
  contractor: ContractorProfile;
  viewMode: ViewMode;
}

const ContractorCard: React.FC<ContractorCardProps> = ({ contractor, viewMode }) => {
  const getAvailabilityColor = (availability?: string) => {
    switch (availability) {
      case 'immediate': return theme.colors.success;
      case 'this_week': return theme.colors.warning;
      case 'this_month': return theme.colors.info;
      default: return theme.colors.textTertiary;
    }
  };

  const formatAvailability = (availability?: string) => {
    switch (availability) {
      case 'immediate': return 'Available Now';
      case 'this_week': return 'This Week';
      case 'this_month': return 'This Month';
      default: return 'Busy';
    }
  };

  const averageRating = contractor.reviews?.length
    ? contractor.reviews.reduce((sum, review) => sum + review.rating, 0) / contractor.reviews.length
    : contractor.rating || 0;

  if (viewMode === 'list') {
    return (
      <Card
        style={{
          padding: '16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}
        hover={true}
        onClick={() => console.log('Navigate to contractor:', contractor.id)}
      >
        {/* Profile Image */}
        <img
          src={contractor.profileImageUrl || 'https://via.placeholder.com/60x60/6B7280/FFFFFF?text=?'}
          alt={`${contractor.first_name} ${contractor.last_name}`}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0
          }}
        />

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <h3 style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                margin: 0,
                marginBottom: '4px'
              }}>
                {contractor.first_name} {contractor.last_name}
              </h3>
              <p style={{
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textSecondary,
                margin: 0,
                fontWeight: theme.typography.fontWeight.medium
              }}>
                {contractor.companyName}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <span style={{ color: theme.colors.warning }}>★</span>
                <span style={{ fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold }}>
                  {averageRating.toFixed(1)}
                </span>
                <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textTertiary }}>
                  ({contractor.reviews?.length || 0})
                </span>
              </div>
              <span style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.primary
              }}>
                ${contractor.hourlyRate}/hr
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {contractor.specialties?.slice(0, 3).map((specialty, index) => (
                <span
                  key={index}
                  style={{
                    backgroundColor: theme.colors.surfaceTertiary,
                    color: theme.colors.textSecondary,
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium
                  }}
                >
                  {specialty}
                </span>
              ))}
            </div>
            <div style={{
              backgroundColor: getAvailabilityColor(contractor.availability),
              color: theme.colors.white,
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold
            }}>
              {formatAvailability(contractor.availability)}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Card view
  return (
    <Card
      style={{ padding: '20px', cursor: 'pointer' }}
      hover={true}
      onClick={() => console.log('Navigate to contractor:', contractor.id)}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <img
          src={contractor.profileImageUrl || 'https://via.placeholder.com/80x80/6B7280/FFFFFF?text=?'}
          alt={`${contractor.first_name} ${contractor.last_name}`}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            objectFit: 'cover'
          }}
        />
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            margin: 0,
            marginBottom: '4px'
          }}>
            {contractor.first_name} {contractor.last_name}
          </h3>
          <p style={{
            fontSize: theme.typography.fontSize.lg,
            color: theme.colors.textSecondary,
            margin: 0,
            fontWeight: theme.typography.fontWeight.medium,
            marginBottom: '8px'
          }}>
            {contractor.companyName}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: theme.colors.warning, fontSize: '18px' }}>★</span>
              <span style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold }}>
                {averageRating.toFixed(1)}
              </span>
              <span style={{ fontSize: theme.typography.fontSize.base, color: theme.colors.textTertiary }}>
                ({contractor.reviews?.length || 0} reviews)
              </span>
            </div>
            <span style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.primary
            }}>
              ${contractor.hourlyRate}/hr
            </span>
          </div>
        </div>
      </div>

      {/* Experience & Stats */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '24px', marginBottom: '12px' }}>
          <div>
            <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textTertiary }}>Experience</span>
            <p style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold, margin: 0 }}>
              {contractor.yearsExperience} years
            </p>
          </div>
          <div>
            <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textTertiary }}>Jobs Completed</span>
            <p style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold, margin: 0 }}>
              {contractor.totalJobsCompleted}
            </p>
          </div>
        </div>
      </div>

      {/* Specialties */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{
          fontSize: theme.typography.fontSize.base,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
          margin: '0 0 8px 0'
        }}>
          Specialties
        </h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {contractor.specialties?.map((specialty, index) => (
            <span
              key={index}
              style={{
                backgroundColor: theme.colors.primary,
                color: theme.colors.white,
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium
              }}
            >
              {specialty}
            </span>
          ))}
        </div>
      </div>

      {/* Portfolio Images */}
      {contractor.portfolioImages && contractor.portfolioImages.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
            margin: '0 0 8px 0'
          }}>
            Recent Work
          </h4>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {contractor.portfolioImages.slice(0, 3).map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Portfolio ${index + 1}`}
                style={{
                  width: '100px',
                  height: '80px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  flexShrink: 0
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="16" height="16" fill={theme.colors.textTertiary} viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textSecondary,
            fontWeight: theme.typography.fontWeight.medium
          }}>
            {contractor.serviceRadius}km radius
          </span>
        </div>
        <div style={{
          backgroundColor: getAvailabilityColor(contractor.availability),
          color: theme.colors.white,
          padding: '6px 16px',
          borderRadius: '20px',
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.semibold
        }}>
          {formatAvailability(contractor.availability)}
        </div>
      </div>
    </Card>
  );
};