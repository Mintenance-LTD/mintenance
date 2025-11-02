'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';
import { formatMoney } from '@/lib/utils/currency';

interface MatchedContractor {
  contractor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    profileImageUrl?: string;
    location?: string;
    companyName?: string;
    yearsExperience?: number;
    hourlyRate?: number;
    skills: string[];
    rating: number | null;
    reviewCount: number;
  };
  matchScore: number;
  matchBreakdown: {
    skillMatch: number;
    locationScore: number;
    budgetAlignment: number;
    availabilityMatch: number;
    ratingScore: number;
    experienceScore: number;
    overallScore: number;
  };
  estimatedRate: number;
  availability: 'immediate' | 'this_week' | 'this_month' | 'busy';
  distance: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  reasons: string[];
  concerns: string[];
}

interface IntelligentMatchingProps {
  jobId: string;
}

export function IntelligentMatching({ jobId }: IntelligentMatchingProps) {
  const [matches, setMatches] = useState<MatchedContractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatches() {
      try {
        setLoading(true);
        const response = await fetch(`/api/jobs/${jobId}/matched-contractors`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch matched contractors');
        }

        const data = await response.json();
        setMatches(data.matches || []);
      } catch (err) {
        console.error('Error fetching matched contractors:', err);
        setError('Failed to load matched contractors');
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, [jobId]);

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return '#10B981'; // Green
    if (score >= 60) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  const getConfidenceBadgeColor = (level: string) => {
    switch (level) {
      case 'high':
        return { bg: '#10B98115', color: '#10B981' };
      case 'medium':
        return { bg: '#F59E0B15', color: '#F59E0B' };
      default:
        return { bg: '#EF444415', color: '#EF4444' };
    }
  };

  const getAvailabilityLabel = (availability: string) => {
    switch (availability) {
      case 'immediate':
        return 'Available Now';
      case 'this_week':
        return 'Available This Week';
      case 'this_month':
        return 'Available This Month';
      default:
        return 'Limited Availability';
    }
  };

  if (loading) {
    return (
      <div style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[6],
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[3],
          marginBottom: theme.spacing[4],
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: theme.borderRadius.lg,
            backgroundColor: theme.colors.backgroundSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.primary,
          }}>
            <Icon name="search" size={24} />
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              Intelligent Matching
            </h2>
            <p style={{
              margin: 0,
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              Finding the best contractors for this job...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[6],
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[3],
          marginBottom: theme.spacing[4],
        }}>
          <Icon name="alert" size={24} color={theme.colors.error} />
          <div>
            <h2 style={{
              margin: 0,
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              Intelligent Matching
            </h2>
            <p style={{
              margin: 0,
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[6],
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[3],
          marginBottom: theme.spacing[4],
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: theme.borderRadius.lg,
            backgroundColor: theme.colors.backgroundSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.primary,
          }}>
            <Icon name="search" size={24} />
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              Intelligent Matching
            </h2>
            <p style={{
              margin: 0,
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              No matches found. Try adjusting your job requirements.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[6],
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing[4],
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[3],
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: theme.borderRadius.lg,
            backgroundColor: theme.colors.backgroundSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.primary,
          }}>
            <Icon name="search" size={24} />
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              Intelligent Matching
            </h2>
            <p style={{
              margin: 0,
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              Top {matches.length} contractors matched based on skills, location, ratings, and availability
            </p>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[4],
      }}>
        {matches.map((match, index) => {
          const contractor = match.contractor;
          const confidenceColors = getConfidenceBadgeColor(match.confidenceLevel);
          
          return (
            <div
              key={contractor.id}
              style={{
                padding: theme.spacing[4],
                backgroundColor: theme.colors.backgroundSecondary,
                borderRadius: theme.borderRadius.lg,
                border: `1px solid ${theme.colors.border}`,
                display: 'flex',
                gap: theme.spacing[4],
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
                e.currentTarget.style.borderColor = theme.colors.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                e.currentTarget.style.borderColor = theme.colors.border;
              }}
            >
              {/* Match Rank Badge */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: theme.spacing[2],
                flexShrink: 0,
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: getMatchScoreColor(match.matchScore) + '15',
                  border: `2px solid ${getMatchScoreColor(match.matchScore)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: getMatchScoreColor(match.matchScore),
                }}>
                  #{index + 1}
                </div>
                <div style={{
                  padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                  backgroundColor: confidenceColors.bg,
                  color: confidenceColors.color,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  textTransform: 'capitalize',
                }}>
                  {match.confidenceLevel}
                </div>
              </div>

              {/* Contractor Info */}
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[3],
                  marginBottom: theme.spacing[2],
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: theme.borderRadius.full,
                    backgroundColor: theme.colors.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: theme.typography.fontSize.xl,
                    fontWeight: theme.typography.fontWeight.bold,
                    flexShrink: 0,
                  }}>
                    {contractor.profileImageUrl ? (
                      <img
                        src={contractor.profileImageUrl}
                        alt={`${contractor.firstName} ${contractor.lastName}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: theme.borderRadius.full,
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      `${contractor.firstName[0]}${contractor.lastName[0]}`
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing[2],
                      marginBottom: theme.spacing[1],
                    }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: theme.typography.fontSize.lg,
                        fontWeight: theme.typography.fontWeight.bold,
                        color: theme.colors.textPrimary,
                      }}>
                        {contractor.firstName} {contractor.lastName}
                      </h3>
                      {contractor.rating && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing[1],
                        }}>
                          <Icon name="starFilled" size={16} color="#F59E0B" />
                          <span style={{
                            fontSize: theme.typography.fontSize.sm,
                            fontWeight: theme.typography.fontWeight.semibold,
                            color: theme.colors.textPrimary,
                          }}>
                            {contractor.rating.toFixed(1)}
                          </span>
                          <span style={{
                            fontSize: theme.typography.fontSize.xs,
                            color: theme.colors.textSecondary,
                          }}>
                            ({contractor.reviewCount})
                          </span>
                        </div>
                      )}
                    </div>
                    {contractor.companyName && (
                      <p style={{
                        margin: 0,
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.textSecondary,
                      }}>
                        {contractor.companyName}
                      </p>
                    )}
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: theme.spacing[1],
                  }}>
                    <div style={{
                      fontSize: theme.typography.fontSize['2xl'],
                      fontWeight: theme.typography.fontWeight.bold,
                      color: getMatchScoreColor(match.matchScore),
                    }}>
                      {match.matchScore}%
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary,
                    }}>
                      Match Score
                    </div>
                  </div>
                </div>

                {/* Match Breakdown */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: theme.spacing[2],
                  marginBottom: theme.spacing[3],
                  padding: theme.spacing[3],
                  backgroundColor: theme.colors.backgroundTertiary,
                  borderRadius: theme.borderRadius.md,
                }}>
                  <div>
                    <div style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing[1],
                    }}>
                      Skills Match
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize.base,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                    }}>
                      {match.matchBreakdown.skillMatch}%
                    </div>
                  </div>
                  <div>
                    <div style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing[1],
                    }}>
                      Location
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize.base,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                    }}>
                      {match.distance.toFixed(1)} mi
                    </div>
                  </div>
                  <div>
                    <div style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing[1],
                    }}>
                      Availability
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize.base,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                    }}>
                      {getAvailabilityLabel(match.availability)}
                    </div>
                  </div>
                </div>

                {/* Skills & Details */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: theme.spacing[2],
                  marginBottom: theme.spacing[2],
                }}>
                  {contractor.skills.slice(0, 5).map((skill) => (
                    <span
                      key={skill}
                      style={{
                        padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                        backgroundColor: theme.colors.backgroundTertiary,
                        borderRadius: theme.borderRadius.md,
                        fontSize: theme.typography.fontSize.xs,
                        color: theme.colors.textSecondary,
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                  {contractor.yearsExperience && (
                    <span style={{
                      padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                      backgroundColor: theme.colors.backgroundTertiary,
                      borderRadius: theme.borderRadius.md,
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing[1],
                    }}>
                      <Icon name="badge" size={12} />
                      {contractor.yearsExperience} years
                    </span>
                  )}
                  {contractor.hourlyRate && (
                    <span style={{
                      padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                      backgroundColor: theme.colors.backgroundTertiary,
                      borderRadius: theme.borderRadius.md,
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary,
                    }}>
                      {formatMoney(contractor.hourlyRate)}/hr
                    </span>
                  )}
                </div>

                {/* Match Reasons */}
                {match.reasons.length > 0 && (
                  <div style={{
                    marginTop: theme.spacing[2],
                    padding: theme.spacing[2],
                    backgroundColor: '#10B98115',
                    borderRadius: theme.borderRadius.md,
                    borderLeft: `3px solid #10B981`,
                  }}>
                    <div style={{
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: '#10B981',
                      marginBottom: theme.spacing[1],
                    }}>
                      Why this match:
                    </div>
                    <ul style={{
                      margin: 0,
                      paddingLeft: theme.spacing[4],
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                    }}>
                      {match.reasons.slice(0, 3).map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: theme.spacing[2],
                flexShrink: 0,
              }}>
                <Link
                  href={`/contractors/${contractor.id}`}
                  style={{
                    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                    backgroundColor: theme.colors.primary,
                    color: 'white',
                    borderRadius: theme.borderRadius.md,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.semibold,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#374151';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.primary;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  View Profile
                  <Icon name="arrowRight" size={14} />
                </Link>
                {match.estimatedRate && (
                  <div style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                    textAlign: 'center',
                  }}>
                    Est. {formatMoney(match.estimatedRate)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

