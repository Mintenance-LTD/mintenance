'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { MoreVertical } from 'lucide-react';
import Image from 'next/image';
import { formatMoney } from '@/lib/utils/currency';

interface PropertyCardProps {
  property: {
    id: string;
    property_name: string | null;
    address: string | null;
    property_type: string | null;
    is_primary: boolean | null;
    photos?: string[] | null;
    activeJobs: number;
    completedJobs: number;
    totalSpent: number;
    lastServiceDate: string | null;
  };
}

export function PropertyCard({ property }: PropertyCardProps) {
  const router = useRouter();
  const hasPhotos = property.photos && property.photos.length > 0;
  const firstPhoto = property.photos?.[0] || null;
  const totalJobs = property.activeJobs + property.completedJobs;
  const isActive = property.activeJobs > 0 || property.completedJobs > 0;

  const handleEllipsisClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Open menu
  };

  const handleCardClick = () => {
    router.push(`/properties/${property.id}`);
  };

  return (
    <Link
      href={`/properties/${property.id}`}
      onClick={handleCardClick}
      className="block bg-white rounded-xl border border-gray-200 p-6 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-gray-300 relative"
    >
      {/* Card Layout: Image on left, content on right */}
      <div style={{ display: 'flex', gap: theme.spacing[4], alignItems: 'flex-start' }}>
        {/* Image Section - Left Side (Square) */}
        <div style={{ flexShrink: 0 }}>
          {firstPhoto ? (
            <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 relative" style={{ width: '150px', height: '150px' }}>
              <Image
                src={firstPhoto}
                alt={property.property_name || 'Property'}
                width={150}
                height={150}
                className="object-cover"
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%'
                }}
                loading="lazy"
              />
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center" style={{ width: '150px', height: '150px' }}>
              <Icon name="info" size={48} color={theme.colors.textSecondary} />
            </div>
          )}
        </div>

        {/* Content Section - Right Side */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: theme.spacing[2], position: 'relative' }}>
          {/* Top Row: Title, Tag, Ellipsis */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing[2] }}>
            <div style={{ flex: 1 }}>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-1">
                {property.property_name || 'Unnamed Property'}
              </h3>
              <p style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                lineHeight: 1.5,
                margin: 0,
                marginBottom: theme.spacing[1],
              }}>
                {property.address || 'Address not specified'}
              </p>
              {/* Green Tag */}
              <div
                style={{
                  display: 'inline-block',
                  padding: `${theme.spacing[0.5]} ${theme.spacing[2]}`,
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: '#D1FAE5',
                  border: '1px solid #10B981',
                  marginTop: theme.spacing[1],
                }}
              >
                <span style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: '#065F46',
                  fontWeight: theme.typography.fontWeight.semibold,
                }}>
                  My Properties
                </span>
              </div>
            </div>
            {/* Ellipsis Menu */}
            <button
              onClick={handleEllipsisClick}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Details Section - Horizontal Layout */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[6],
            paddingTop: theme.spacing[3],
            borderTop: `1px solid ${theme.colors.border}`,
            flexWrap: 'wrap',
          }}>
            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
              <span style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}>
                Status
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
                {isActive && (
                  <Icon name="check" size={16} color="#10B981" />
                )}
                <span style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: isActive ? '#10B981' : theme.colors.textSecondary,
                  fontWeight: theme.typography.fontWeight.medium,
                }}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Jobs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[0.5] }}>
              <span style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}>
                Jobs
              </span>
              <span style={{
                fontSize: theme.typography.fontSize.lg,
                color: theme.colors.textPrimary,
                fontWeight: theme.typography.fontWeight.bold,
              }}>
                {totalJobs}
              </span>
            </div>

            {/* Spend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[0.5] }}>
              <span style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}>
                Spend
              </span>
              <span style={{
                fontSize: theme.typography.fontSize.lg,
                color: theme.colors.textPrimary,
                fontWeight: theme.typography.fontWeight.bold,
              }}>
                {formatMoney(Number(property.totalSpent || 0), 'GBP')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

