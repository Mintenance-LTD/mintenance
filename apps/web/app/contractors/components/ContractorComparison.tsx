'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { theme } from '@/lib/theme';
import { Star, Clock, Briefcase, MapPin, ShieldCheck } from 'lucide-react';

interface ContractorData {
  id: string;
  name: string;
  company?: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  completedJobs: number;
  location: string;
  avatar?: string;
  verified: boolean;
  bio?: string;
  responseTime?: string;
  portfolio?: string[];
  distance?: number;
  priceRange?: string;
  yearsExperience?: number;
}

interface ContractorComparisonProps {
  contractors: ContractorData[];
  onClose: () => void;
}

function MetricRow({
  label,
  icon,
  values,
  highlight,
}: {
  label: string;
  icon: React.ReactNode;
  values: (string | number | React.ReactNode)[];
  highlight?: 'max' | 'min';
}) {
  // Determine best value index for highlighting
  let bestIndex = -1;
  if (highlight && values.length > 1) {
    const numericValues = values.map((v) =>
      typeof v === 'number' ? v : parseFloat(String(v)) || 0
    );
    if (highlight === 'max') {
      bestIndex = numericValues.indexOf(Math.max(...numericValues));
    } else {
      const nonZero = numericValues.filter((n) => n > 0);
      if (nonZero.length > 0) {
        bestIndex = numericValues.indexOf(Math.min(...nonZero));
      }
    }
  }

  return (
    <tr>
      <td
        style={{
          padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
          fontWeight: theme.typography.fontWeight.medium,
          whiteSpace: 'nowrap',
        }}
      >
        {icon}
        {label}
      </td>
      {values.map((val, i) => (
        <td
          key={i}
          style={{
            padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
            textAlign: 'center',
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textPrimary,
            fontWeight:
              i === bestIndex
                ? theme.typography.fontWeight.bold
                : theme.typography.fontWeight.medium,
            backgroundColor:
              i === bestIndex ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
          }}
        >
          {val}
        </td>
      ))}
    </tr>
  );
}

export function ContractorComparison({
  contractors,
  onClose,
}: ContractorComparisonProps) {
  if (contractors.length === 0) return null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title='Compare Contractors'
      maxWidth={900}
    >
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}
          role='table'
          aria-label='Contractor comparison'
        >
          {/* Header row with contractor names */}
          <thead>
            <tr>
              <th
                style={{
                  padding: theme.spacing[4],
                  textAlign: 'left',
                  minWidth: '140px',
                }}
              />
              {contractors.map((c) => (
                <th
                  key={c.id}
                  style={{
                    padding: theme.spacing[4],
                    textAlign: 'center',
                    minWidth: '160px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: theme.spacing[2],
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: theme.colors.surfaceSecondary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        border: `2px solid ${theme.colors.border}`,
                      }}
                    >
                      {c.avatar ? (
                        <img
                          src={c.avatar}
                          alt={c.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: theme.typography.fontSize.lg,
                            fontWeight: theme.typography.fontWeight.bold,
                            color: theme.colors.textSecondary,
                          }}
                        >
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: theme.typography.fontWeight.bold,
                          color: theme.colors.textPrimary,
                          fontSize: theme.typography.fontSize.base,
                        }}
                      >
                        {c.name}
                      </div>
                      {c.company && (
                        <div
                          style={{
                            fontSize: theme.typography.fontSize.xs,
                            color: theme.colors.textSecondary,
                          }}
                        >
                          {c.company}
                        </div>
                      )}
                      {c.verified && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            marginTop: theme.spacing[1],
                            color: '#10B981',
                            fontSize: theme.typography.fontSize.xs,
                            fontWeight: theme.typography.fontWeight.semibold,
                          }}
                        >
                          <ShieldCheck size={12} />
                          Verified
                        </div>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Divider */}
            <tr>
              <td
                colSpan={contractors.length + 1}
                style={{
                  height: '1px',
                  backgroundColor: theme.colors.border,
                  padding: 0,
                }}
              />
            </tr>

            <MetricRow
              label='Rating'
              icon={<Star size={16} />}
              values={contractors.map((c) =>
                c.rating > 0 ? `${c.rating.toFixed(1)} / 5` : 'N/A'
              )}
              highlight='max'
            />

            <MetricRow
              label='Reviews'
              icon={<Star size={16} />}
              values={contractors.map((c) => c.reviewCount)}
              highlight='max'
            />

            <MetricRow
              label='Completed Jobs'
              icon={<Briefcase size={16} />}
              values={contractors.map((c) => c.completedJobs)}
              highlight='max'
            />

            <MetricRow
              label='Response Time'
              icon={<Clock size={16} />}
              values={contractors.map((c) => c.responseTime || 'N/A')}
            />

            <MetricRow
              label='Price Range'
              icon={<Briefcase size={16} />}
              values={contractors.map((c) => c.priceRange || 'N/A')}
            />

            <MetricRow
              label='Experience'
              icon={<Briefcase size={16} />}
              values={contractors.map((c) =>
                c.yearsExperience
                  ? `${c.yearsExperience} yr${c.yearsExperience !== 1 ? 's' : ''}`
                  : 'N/A'
              )}
              highlight='max'
            />

            <MetricRow
              label='Location'
              icon={<MapPin size={16} />}
              values={contractors.map((c) => c.location || 'N/A')}
            />

            {/* Divider */}
            <tr>
              <td
                colSpan={contractors.length + 1}
                style={{
                  height: '1px',
                  backgroundColor: theme.colors.border,
                  padding: 0,
                }}
              />
            </tr>

            {/* Specialties row */}
            <tr>
              <td
                style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  fontWeight: theme.typography.fontWeight.medium,
                  verticalAlign: 'top',
                }}
              >
                Specialties
              </td>
              {contractors.map((c) => (
                <td
                  key={c.id}
                  style={{
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    textAlign: 'center',
                    verticalAlign: 'top',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: theme.spacing[1],
                      justifyContent: 'center',
                    }}
                  >
                    {c.specialties.length > 0
                      ? c.specialties.map((s) => (
                          <span
                            key={s}
                            style={{
                              display: 'inline-block',
                              padding: `${theme.spacing[0.5]} ${theme.spacing[2]}`,
                              borderRadius: theme.borderRadius.md,
                              backgroundColor: theme.colors.surfaceSecondary,
                              fontSize: theme.typography.fontSize.xs,
                              color: theme.colors.textSecondary,
                            }}
                          >
                            {s}
                          </span>
                        ))
                      : 'N/A'}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
