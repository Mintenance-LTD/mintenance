import React from 'react';
import { theme } from '@/lib/theme';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface ContractorCardProps {
  contractor: any;
}

export function ContractorCard({ contractor }: ContractorCardProps) {
  const avgRating = contractor.reviews?.length
    ? contractor.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / contractor.reviews.length
    : contractor.rating || 0;

  const cardId = `contractor-card-${contractor.id}`;

  return (
    <>
      <Link
        href={`/contractor/${contractor.id}`}
        style={{
          textDecoration: 'none',
          display: 'block',
        }}
        className={`contractor-card-link-${cardId}`}
      >
        <div
          className={`contractor-card-${cardId}`}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: '20px',
            padding: theme.spacing[6],
            border: `1px solid ${theme.colors.border}`,
            cursor: 'pointer',
            height: '100%',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
        >
          {/* Profile Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[4],
            marginBottom: theme.spacing[4],
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: theme.colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: 'white',
              backgroundImage: contractor.profile_image_url ? `url(${contractor.profile_image_url})` : undefined,
              backgroundSize: 'cover',
              flexShrink: 0,
            }}>
              {!contractor.profile_image_url && (
                <>
                  {contractor.first_name?.[0]}{contractor.last_name?.[0]}
                </>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[1] }}>
                <h3 style={{
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.text,
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {contractor.first_name} {contractor.last_name}
                </h3>
                {contractor.admin_verified && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      padding: '2px',
                      flexShrink: 0,
                    }}
                    title="Verified Contractor - License and company verified by admin"
                  >
                    <Icon name="mintLeaf" size={18} color="white" />
                  </div>
                )}
                {contractor.email_verified && !contractor.admin_verified && (
                  <Icon name="badge" size={18} color="#3B82F6" title="Email Verified" />
                )}
              </div>

              <p style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {contractor.city}, {contractor.country || 'UK'}
              </p>
            </div>
          </div>

          {/* Bio */}
          {contractor.bio && (
            <p style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[4],
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: '1.5',
            }}>
              {contractor.bio}
            </p>
          )}

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: theme.spacing[4],
            marginBottom: theme.spacing[4],
            paddingTop: theme.spacing[4],
            borderTop: `1px solid ${theme.colors.border}`,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: theme.spacing[1], fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.primary }}>
                <Icon name="star" size={18} color={theme.colors.warning} />
                <span>{avgRating.toFixed(1)}</span>
              </div>
              <p style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}>
                Rating
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.primary,
              }}>
                {contractor.total_jobs_completed || 0}
              </p>
              <p style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}>
                Jobs
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={contractor.is_available ? 'checkCircle' : 'xCircle'} size={18} color={contractor.is_available ? theme.colors.success : theme.colors.error} />
              </div>
              <p style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}>
                Available
              </p>
            </div>
          </div>

          {/* Skills */}
          {contractor.contractor_skills?.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: theme.spacing[2],
            }}>
              {contractor.contractor_skills.slice(0, 3).map((skill: any, index: number) => (
                <span
                  key={index}
                  style={{
                    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                    backgroundColor: theme.colors.backgroundSecondary,
                    color: theme.colors.text,
                    borderRadius: theme.borderRadius.full,
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.medium,
                  }}
                >
                  {skill.skill_name}
                </span>
              ))}
              {contractor.contractor_skills.length > 3 && (
                <span style={{
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.xs,
                }}>
                  +{contractor.contractor_skills.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
      <style jsx>{`
        .contractor-card-link-${cardId}:hover .contractor-card-${cardId} {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
      `}</style>
    </>
  );
}
