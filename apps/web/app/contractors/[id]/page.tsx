import Link from 'next/link';
import { theme } from '@/lib/theme';
import Logo from '../../components/Logo';
import { Icon } from '@/components/ui/Icon';
import { notFound } from 'next/navigation';
import { HomeownerLayoutShell } from '../../dashboard/components/HomeownerLayoutShell';
import { getCurrentUserFromCookies } from '@/lib/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

async function createClient() {
  const { serverSupabase } = await import('@/lib/api/supabaseServer');
  return serverSupabase;
}

export default async function ContractorDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const supabase = await createClient();
  const user = await getCurrentUserFromCookies();

  // Fetch contractor data
  const { data: contractor, error } = await supabase
    .from('users')
    .select(`
      *,
      contractor_skills(skill_name)
    `)
    .eq('id', params.id)
    .eq('role', 'contractor')
    .is('deleted_at', null)
    .single();

  if (error || !contractor) {
    notFound();
  }

  // Fetch reviews with proper relationship
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      *,
      reviewer:reviewer_id (
        first_name,
        last_name,
        profile_image_url
      ),
      job:job_id (
        title,
        category
      )
    `)
    .eq('reviewed_id', params.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch completed jobs
  const { data: completedJobs } = await supabase
    .from('jobs')
    .select('id, title, category, photos, completed_at')
    .eq('contractor_id', params.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(12);

  // Fetch contractor posts (portfolio)
  const { data: posts } = await supabase
    .from('contractor_posts')
    .select('id, title, images, post_type, project_duration, project_cost')
    .eq('contractor_id', params.id)
    .eq('post_type', 'work_showcase')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(12);

  // Calculate average rating from reviews
  const avgRating = reviews?.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : contractor.rating || 0;

  return (
    <HomeownerLayoutShell
      currentPath="/contractors"
      userName={user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}`.trim() : undefined}
      userEmail={user?.email}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: theme.spacing[8] }}>
        {/* Back Button */}
        <Link 
          href="/contractors" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: theme.spacing[2],
            marginBottom: theme.spacing[6],
            color: theme.colors.textSecondary,
            textDecoration: 'none',
          }}
        >
          <Icon name="arrowLeft" size={16} color={theme.colors.textSecondary} />
          Back to Contractors
        </Link>

        {/* Profile Header */}
        <div style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing[8],
          marginBottom: theme.spacing[6],
          border: `1px solid ${theme.colors.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[6] }}>
            {/* Avatar */}
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              backgroundColor: theme.colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: theme.typography.fontSize['4xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: 'white',
            }}>
              {contractor.first_name?.[0]}{contractor.last_name?.[0]}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: theme.typography.fontSize['3xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[2],
              }}>
                {contractor.first_name} {contractor.last_name}
                {contractor.email_verified && (
                  <Icon name="badge" size={20} color="#3B82F6" style={{ marginLeft: theme.spacing[3] }} />
                )}
              </h1>

              <p style={{
                fontSize: theme.typography.fontSize.lg,
                color: theme.colors.textSecondary,
                marginBottom: theme.spacing[4],
              }}>
                {contractor.company_name || contractor.city || 'Location not set'}, {contractor.country || 'UK'}
              </p>

              {contractor.bio && (
                <p style={{
                  color: theme.colors.textSecondary,
                  lineHeight: '1.6',
                  marginBottom: theme.spacing[4],
                }}>
                  {contractor.bio}
                </p>
              )}

              <div style={{ display: 'flex', gap: theme.spacing[3], alignItems: 'center' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  backgroundColor: contractor.is_available ? theme.colors.success : '#FEE2E2',
                  color: contractor.is_available ? '#065F46' : '#991B1B',
                  borderRadius: theme.borderRadius.full,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                }}>
                  <Icon name={contractor.is_available ? 'checkCircle' : 'xCircle'} size={14} color={contractor.is_available ? '#065F46' : '#991B1B'} />
                  {contractor.is_available ? 'Available' : 'Unavailable'}
                </span>
              </div>
            </div>

            {/* Contact Button */}
            <Link
              href={`/messages?contractor=${params.id}`}
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                backgroundColor: theme.colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: theme.borderRadius.lg,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.medium,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Contact Contractor
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: theme.spacing[6],
          marginBottom: theme.spacing[8],
        }}>
          <div style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing[6],
            border: `1px solid ${theme.colors.border}`,
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: theme.typography.fontSize['4xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.primary,
              marginBottom: theme.spacing[2],
            }}>
              {contractor.total_jobs_completed || 0}
            </div>
            <div style={{ fontSize: theme.typography.fontSize.base, color: theme.colors.textSecondary }}>
              Jobs Completed
            </div>
          </div>

          <div style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing[6],
            border: `1px solid ${theme.colors.border}`,
            textAlign: 'center',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: theme.spacing[2],
              marginBottom: theme.spacing[2],
            }}>
              <Icon name="star" size={24} color={theme.colors.warning} />
              <span style={{ fontSize: theme.typography.fontSize['3xl'], fontWeight: theme.typography.fontWeight.bold, color: theme.colors.primary }}>
                {avgRating.toFixed(1)}
              </span>
            </div>
            <div style={{ fontSize: theme.typography.fontSize.base, color: theme.colors.textSecondary }}>
              Average Rating ({reviews?.length || 0} reviews)
            </div>
          </div>

          {contractor.hourly_rate && (
            <div style={{
              backgroundColor: theme.colors.white,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing[6],
              border: `1px solid ${theme.colors.border}`,
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: theme.typography.fontSize['4xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.primary,
                marginBottom: theme.spacing[2],
              }}>
                £{contractor.hourly_rate}
              </div>
              <div style={{ fontSize: theme.typography.fontSize.base, color: theme.colors.textSecondary }}>
                Hourly Rate
              </div>
            </div>
          )}
        </div>

        {/* Skills */}
        {contractor.contractor_skills && contractor.contractor_skills.length > 0 && (
          <div style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing[6],
            marginBottom: theme.spacing[8],
            border: `1px solid ${theme.colors.border}`,
          }}>
            <h2 style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[4],
            }}>
              Skills & Expertise
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2] }}>
              {contractor.contractor_skills.map((skill: any, index: number) => (
                <span
                  key={index}
                  style={{
                    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                    backgroundColor: theme.colors.backgroundSecondary,
                    color: theme.colors.textPrimary,
                    borderRadius: theme.borderRadius.full,
                    fontSize: theme.typography.fontSize.sm,
                  }}
                >
                  {skill.skill_name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews && reviews.length > 0 && (
          <div style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing[8],
            border: `1px solid ${theme.colors.border}`,
            marginBottom: theme.spacing[8],
          }}>
            <h2 style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[6],
            }}>
              Reviews ({reviews.length})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
              {reviews.map((review: any) => (
                <div
                  key={review.id}
                  style={{
                    padding: theme.spacing[6],
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${theme.colors.border}`,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[4],
                    marginBottom: theme.spacing[4],
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: theme.colors.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: theme.typography.fontWeight.bold,
                    }}>
                      {review.reviewer?.first_name?.[0]}{review.reviewer?.last_name?.[0]}
                    </div>

                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontSize: theme.typography.fontSize.base,
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.textPrimary,
                      }}>
                        {review.reviewer?.first_name} {review.reviewer?.last_name}
                      </p>
                      <p style={{
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.textSecondary,
                      }}>
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing[1],
                      fontSize: theme.typography.fontSize.xl,
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.primary,
                    }}>
                      <Icon name="star" size={18} color={theme.colors.warning} />
                      <span>{review.rating}</span>
                    </div>
                  </div>

                  {review.job && (
                    <p style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing[3],
                      fontStyle: 'italic',
                    }}>
                      Job: {review.job.title}
                    </p>
                  )}

                  {review.comment && (
                    <p style={{
                      fontSize: theme.typography.fontSize.base,
                      color: theme.colors.textPrimary,
                      lineHeight: '1.6',
                    }}>
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio */}
        {(posts && posts.length > 0 || completedJobs && completedJobs.length > 0) && (
          <div style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing[8],
            border: `1px solid ${theme.colors.border}`,
          }}>
            <h2 style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[6],
            }}>
              Portfolio
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: theme.spacing[4],
            }}>
              {posts?.map((post: any) => (
                post.images && Array.isArray(post.images) && post.images.length > 0 && (
                  <div
                    key={post.id}
                    style={{
                      position: 'relative',
                      paddingBottom: '100%',
                      borderRadius: theme.borderRadius.lg,
                      overflow: 'hidden',
                      backgroundColor: theme.colors.backgroundSecondary,
                    }}
                  >
                    <img
                      src={post.images[0]}
                      alt={post.title}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: theme.spacing[3],
                      background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                      color: 'white',
                    }}>
                      <p style={{
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                      }}>
                        {post.title}
                      </p>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </HomeownerLayoutShell>
  );
}

