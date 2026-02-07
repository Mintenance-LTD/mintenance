'use client';

import { Card } from '@/components/ui';
import { theme } from '@/lib/theme';
import type { ContractorProfile, ContractorSkill } from '@mintenance/types';

interface ContractorResultCardProps {
  contractor: ContractorProfile;
  onClick: (contractorId: string) => void;
}

export function ContractorResultCard({ contractor, onClick }: ContractorResultCardProps) {
  return (
    <Card
      key={contractor.id}
      style={{
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        cursor: 'pointer'
      }}
      onClick={() => onClick(contractor.id)}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: theme.spacing.md
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: theme.colors.backgroundSecondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: theme.typography.fontSize['2xl'],
          flexShrink: 0
        }}>
          {contractor.profile_image_url ? (
            <img
              src={contractor.profile_image_url}
              alt={contractor.first_name}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <span aria-hidden="true">&#128100;</span>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: theme.spacing.xs
          }}>
            <div>
              <h3 style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
                margin: 0
              }}>
                {contractor.first_name} {contractor.last_name}
              </h3>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                marginTop: '4px'
              }}>
                <span style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.warning
                }}>
                  {'⭐'.repeat(Math.floor((contractor as ContractorProfile).rating || 0))} {(contractor as ContractorProfile).rating?.toFixed(1) || 'N/A'}
                </span>
                <span style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary
                }}>
                  {(contractor as ContractorProfile).total_jobs_completed || 0} jobs completed
                </span>
              </div>
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.success
            }}>
              ${contractor.hourlyRate}/hr
            </div>
          </div>

          <p style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.text,
            lineHeight: theme.typography.lineHeight.relaxed,
            margin: 0,
            marginBottom: theme.spacing.sm,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {contractor.first_name} {contractor.last_name} - Licensed contractor
          </p>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: theme.spacing.xs,
            marginBottom: theme.spacing.sm
          }}>
            {contractor.skills?.slice(0, 4).map((skill: ContractorSkill) => (
              <span
                key={skill.id}
                style={{
                  backgroundColor: `${theme.colors.primary}15`,
                  color: theme.colors.primary,
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  borderRadius: theme.borderRadius.full,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.medium
                }}
              >
                {skill.skillName}
              </span>
            ))}
            {(contractor.skills?.length || 0) > 4 && (
              <span style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.xs
              }}>
                +{(contractor.skills?.length || 0) - 4} more
              </span>
            )}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary
            }}>
              Available: {contractor.availability}
            </span>
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.info,
              fontWeight: theme.typography.fontWeight.medium
            }}>
              {contractor.yearsExperience} years experience
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
