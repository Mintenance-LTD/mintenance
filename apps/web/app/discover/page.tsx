'use client';

import React, { useEffect, useState } from 'react';
import { fetchCurrentUser } from '@/lib/auth-client';
import { ContractorService } from '@/lib/services/ContractorService';
import { SwipeableCard } from '@/components/SwipeableCard';
import { Button } from '@/components/ui';
import { theme } from '@/lib/theme';
import type { ContractorProfile, User, LocationData } from '@mintenance/types';

export default function DiscoverPage() {
  const [user, setUser] = useState<User | null>(null);
  const [contractors, setContractors] = useState<ContractorProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userLocation] = useState<LocationData>({
    latitude: 47.6062,
    longitude: -122.3321
  }); // Mock Seattle location for web

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadContractors();
    }
  }, [user]);

  const loadContractors = async () => {
    setLoading(true);
    try {
      const data = await ContractorService.getNearbyContractors(userLocation);
      setContractors(data);
    } catch (error) {
      console.error('Error loading contractors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (action: 'like' | 'pass' | 'super_like' | 'maybe') => {
    const currentContractor = contractors[currentIndex];
    if (!currentContractor || !user) return;

    // Record the match
    if (action === 'like' || action === 'super_like') {
      await ContractorService.recordMatch(user.id, currentContractor.id, 'like');
    } else if (action === 'pass') {
      await ContractorService.recordMatch(user.id, currentContractor.id, 'pass');
    }

    // Move to next contractor
    setCurrentIndex(prev => prev + 1);
  };

  const currentContractor = contractors[currentIndex];
  const hasMoreContractors = currentIndex < contractors.length;

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
          alignItems: 'center',
          paddingLeft: '20px',
          paddingRight: '20px'
        }}>
          <div>
            <h1 style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textInverse,
              margin: 0,
              marginBottom: '4px'
            }}>
              Discover Contractors
            </h1>
            <p style={{
              fontSize: theme.typography.fontSize.xl,
              color: theme.colors.textInverseMuted,
              fontWeight: theme.typography.fontWeight.medium,
              margin: 0
            }}>
              Swipe to find your perfect match
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textInverseMuted,
              margin: 0
            }}>
              {contractors.length - currentIndex} remaining
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: 'calc(100vh - 140px)'
      }}>
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
            <p style={{ color: theme.colors.textSecondary }}>Finding contractors...</p>
          </div>
        ) : !hasMoreContractors ? (
          <div style={{ textAlign: 'center', padding: '80px 40px' }}>
            <h2 style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: '16px'
            }}>
              🎉 All Done!
            </h2>
            <p style={{
              fontSize: theme.typography.fontSize.xl,
              color: theme.colors.textSecondary,
              lineHeight: theme.typography.lineHeight.relaxed,
              marginBottom: '24px'
            }}>
              You&apos;ve seen all available contractors in your area.
            </p>
            <Button
              onClick={() => {
                setCurrentIndex(0);
                loadContractors();
              }}
              variant="primary"
            >
              Start Over
            </Button>
          </div>
        ) : (
          <>
            {/* Card Stack Container */}
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: '400px',
              aspectRatio: '3/4',
              marginBottom: '30px'
            }}>
              {/* Background Cards */}
              {contractors.slice(currentIndex + 1, currentIndex + 3).map((contractor, index) => (
                <div
                  key={contractor.id}
                  style={{
                    position: 'absolute',
                    top: `${(index + 1) * 4}px`,
                    left: `${(index + 1) * 2}px`,
                    right: `${(index + 1) * 2}px`,
                    bottom: 0,
                    backgroundColor: theme.colors.white,
                    borderRadius: theme.borderRadius.xl,
                    boxShadow: theme.shadows.base,
                    zIndex: index + 1,
                    opacity: 1 - (index + 1) * 0.2,
                  }}
                />
              ))}

              {/* Active Card */}
              {currentContractor && (
                <SwipeableCard
                  onSwipeLeft={() => handleSwipe('pass')}
                  onSwipeRight={() => handleSwipe('like')}
                  onSwipeUp={() => handleSwipe('super_like')}
                  onSwipeDown={() => handleSwipe('maybe')}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 10,
                  }}
                >
                  <ContractorCard contractor={currentContractor} />
                </SwipeableCard>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <button
                onClick={() => handleSwipe('pass')}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: theme.colors.error,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: theme.shadows.lg,
                  transition: 'transform 0.1s ease'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <svg width="24" height="24" fill={theme.colors.white} viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              <button
                onClick={() => handleSwipe('super_like')}
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  backgroundColor: theme.colors.info,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: theme.shadows.lg,
                  transition: 'transform 0.1s ease'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <svg width="20" height="20" fill={theme.colors.white} viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>

              <button
                onClick={() => handleSwipe('like')}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: theme.colors.success,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: theme.shadows.lg,
                  transition: 'transform 0.1s ease'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <svg width="24" height="24" fill={theme.colors.white} viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Instructions */}
            <div style={{
              textAlign: 'center',
              marginTop: '20px',
              opacity: 0.7
            }}>
              <p style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textTertiary,
                margin: 0
              }}>
                ← Swipe left to pass • Swipe right to like →<br />
                ↑ Swipe up for super like • Tap buttons to choose
              </p>
            </div>
          </>
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
}

const ContractorCard: React.FC<ContractorCardProps> = ({ contractor }) => {
  const averageRating = contractor.reviews?.length
    ? contractor.reviews.reduce((sum, review) => sum + review.rating, 0) / contractor.reviews.length
    : contractor.rating || 0;

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={i} style={{ color: theme.colors.warning }}>★</span>
      );
    }

    if (hasHalfStar) {
      stars.push(
        <span key="half" style={{ color: theme.colors.warning }}>☆</span>
      );
    }

    const remainingStars = 5 - stars.length;
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <span key={`empty-${i}`} style={{ color: theme.colors.border }}>☆</span>
      );
    }

    return stars;
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.white,
      borderRadius: theme.borderRadius.xl,
      boxShadow: theme.shadows.xl,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header with Photo */}
      <div style={{
        position: 'relative',
        height: '200px',
        background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryLight})`
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}>
          <img
            src={contractor.profileImageUrl || 'https://via.placeholder.com/120x120/6B7280/FFFFFF?text=?'}
            alt={`${contractor.first_name} ${contractor.last_name}`}
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: `4px solid ${theme.colors.white}`,
              boxShadow: theme.shadows.lg
            }}
          />
          {/* Verified Badge */}
          <div style={{
            position: 'absolute',
            bottom: '5px',
            right: '5px',
            backgroundColor: theme.colors.success,
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${theme.colors.white}`
          }}>
            <svg width="14" height="14" fill={theme.colors.white} viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Basic Info */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2 style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            margin: 0,
            marginBottom: '4px'
          }}>
            {contractor.first_name} {contractor.last_name}
          </h2>
          <p style={{
            fontSize: theme.typography.fontSize.lg,
            color: theme.colors.textSecondary,
            margin: 0,
            marginBottom: '8px'
          }}>
            {contractor.companyName}
          </p>
          <p style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.primary,
            fontWeight: theme.typography.fontWeight.semibold,
            margin: 0
          }}>
            {contractor.skills?.[0]?.skillName || 'General Contractor'}
          </p>
        </div>

        {/* Rating */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            {renderStars(averageRating)}
          </div>
          <span style={{
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary
          }}>
            {averageRating.toFixed(1)}
          </span>
          <span style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textTertiary
          }}>
            ({contractor.reviews?.length || 0} reviews)
          </span>
        </div>

        {/* Quick Info */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginBottom: '20px',
          padding: '16px',
          backgroundColor: theme.colors.surfaceSecondary,
          borderRadius: theme.borderRadius.lg
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary
            }}>
              {contractor.distance?.toFixed(1)} km
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textTertiary
            }}>
              Away
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary
            }}>
              ${contractor.hourlyRate}
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textTertiary
            }}>
              Per Hour
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary
            }}>
              {contractor.yearsExperience}
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textTertiary
            }}>
              Years Exp
            </div>
          </div>
        </div>

        {/* Specialties */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
            margin: '0 0 8px 0'
          }}>
            Specialties
          </h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {contractor.specialties?.slice(0, 3).map((specialty, index) => (
              <span
                key={index}
                style={{
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.white,
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium
                }}
              >
                {specialty}
              </span>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div style={{
          textAlign: 'center',
          marginTop: 'auto'
        }}>
          <div style={{
            backgroundColor: contractor.availability === 'immediate' ? theme.colors.success :
                            contractor.availability === 'this_week' ? theme.colors.warning :
                            contractor.availability === 'this_month' ? theme.colors.info :
                            theme.colors.textTertiary,
            color: theme.colors.white,
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            display: 'inline-block'
          }}>
            {contractor.availability === 'immediate' ? '🟢 Available Now' :
             contractor.availability === 'this_week' ? '🟡 This Week' :
             contractor.availability === 'this_month' ? '🔵 This Month' :
             '🔴 Busy'}
          </div>
        </div>
      </div>
    </div>
  );
};