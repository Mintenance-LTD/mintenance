'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { NotificationBanner } from '@/components/ui/NotificationBanner';
import { CommentsSection } from '../../../components/CommentsSection';
import { ShareDialog } from '../../../components/ShareDialog';
import { FollowButton } from '../../../components/FollowButton';

interface PostDetail {
  id: string;
  title: string;
  content: string;
  images?: string[];
  post_type?: string;
  created_at: string;
  updated_at?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  liked?: boolean;
  isFollowing?: boolean;
  contractor?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
    city?: string;
    country?: string;
  };
  skills_used?: string[];
  materials_used?: string[];
  project_duration?: number;
  project_cost?: number;
  help_category?: string;
  urgency_level?: string;
  budget_range?: number;
  item_name?: string;
  item_condition?: string;
  rental_price?: number;
}

interface PostDetailClientProps {
  post: PostDetail;
  currentUserId?: string;
}

export function PostDetailClient({ post: initialPost, currentUserId }: PostDetailClientProps) {
  const router = useRouter();
  const [post, setPost] = useState<PostDetail>(initialPost);
  const [loading, setLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [notification, setNotification] = useState<{ tone: 'info' | 'success' | 'warning'; message: string } | null>(null);

  useEffect(() => {
    const baseUrl = window.location.origin;
    setShareLink(`${baseUrl}/contractor/social/post/${post.id}`);
  }, [post.id]);

  const handleLike = async () => {
    const wasLiked = post.liked;
    setPost((prev) => ({
      ...prev,
      liked: !prev.liked,
      likes_count: (prev.likes_count || 0) + (prev.liked ? -1 : 1),
    }));

    try {
      const response = await fetch(`/api/contractor/posts/${post.id}/like`, {
        method: 'POST',
      });

      if (!response.ok) {
        setPost((prev) => ({
          ...prev,
          liked: wasLiked,
          likes_count: (prev.likes_count || 0) + (wasLiked ? 1 : -1),
        }));
        throw new Error('Failed to like post');
      }

      const data = await response.json();
      setPost((prev) => ({
        ...prev,
        liked: data.liked,
        likes_count: data.likes_count,
      }));
    } catch (error) {
      console.error('Error liking post:', error);
      setNotification({ tone: 'warning', message: 'Failed to update like. Please try again.' });
    }
  };

  const handleShare = async () => {
    try {
      const response = await fetch(`/api/contractor/posts/${post.id}/share`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setPost((prev) => ({
          ...prev,
          shares_count: (prev.shares_count || 0) + 1,
        }));
        setShareLink(data.share_link || shareLink);
        setShowShareModal(true);
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      setNotification({ tone: 'warning', message: 'Failed to share post' });
    }
  };

  const handleFollowChange = (following: boolean) => {
    setPost((prev) => ({ ...prev, isFollowing: following }));
  };

  const initials = `${post.contractor?.first_name?.[0] ?? 'C'}${post.contractor?.last_name?.[0] ?? ''}`;

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: theme.spacing[6] }}>
      {notification && (
        <NotificationBanner
          tone={notification.tone === 'warning' ? 'warning' : notification.tone === 'success' ? 'success' : 'info'}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Back Button */}
      <button
        type="button"
        onClick={() => router.back()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: theme.spacing[2],
          background: 'transparent',
          border: 'none',
          color: theme.colors.textSecondary,
          cursor: 'pointer',
          fontSize: theme.typography.fontSize.sm,
          marginBottom: theme.spacing[4],
          padding: 0,
        }}
      >
        <Icon name="arrowLeft" size={16} color={theme.colors.textSecondary} />
        Back to Feed
      </button>

      {/* Post Card */}
      <article
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: '20px',
          border: `1px solid ${theme.colors.border}`,
          padding: theme.spacing[6],
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[4],
        }}
      >
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing[3] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], flex: 1 }}>
            {post.contractor?.profile_image_url ? (
              <img
                src={post.contractor.profile_image_url}
                alt={`${post.contractor.first_name} ${post.contractor.last_name}`}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  objectFit: 'cover',
                  border: `1px solid ${theme.colors.border}`,
                }}
              />
            ) : (
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  backgroundColor: theme.colors.backgroundSecondary,
                  border: `1px solid ${theme.colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.primary,
                }}
              >
                {initials}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: theme.typography.fontWeight.semibold, fontSize: theme.typography.fontSize.base }}>
                {post.contractor?.first_name ?? 'Contractor'} {post.contractor?.last_name ?? ''}
              </div>
              <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                {post.contractor?.city && `${post.contractor.city}, `}
                {post.contractor?.country ?? ''} • {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
          {post.contractor?.id && post.contractor.id !== currentUserId && (
            <FollowButton
              contractorId={post.contractor.id}
              currentUserId={currentUserId}
              variant="small"
              onFollowChange={handleFollowChange}
            />
          )}
        </header>

        {/* Post Type Badge */}
        {post.post_type && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing[1],
              padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
              backgroundColor: theme.colors.primary + '20',
              color: theme.colors.primary,
              borderRadius: theme.borderRadius.full,
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.semibold,
              width: 'fit-content',
            }}
          >
            {post.post_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </div>
        )}

        {/* Title */}
        <h1
          style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            marginBottom: theme.spacing[2],
            color: theme.colors.textPrimary,
          }}
        >
          {post.title}
        </h1>

        {/* Content */}
        <p style={{ color: theme.colors.textSecondary, lineHeight: 1.6, fontSize: theme.typography.fontSize.base }}>
          {post.content}
        </p>

        {/* Additional Post Type Info */}
        {post.post_type === 'work_showcase' && (
          <div
            style={{
              padding: theme.spacing[4],
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.borderRadius.md,
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[2],
            }}
          >
            {post.skills_used && post.skills_used.length > 0 && (
              <div>
                <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>
                  Skills Used:{' '}
                </span>
                <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                  {post.skills_used.join(', ')}
                </span>
              </div>
            )}
            {post.materials_used && post.materials_used.length > 0 && (
              <div>
                <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>
                  Materials:{' '}
                </span>
                <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                  {post.materials_used.join(', ')}
                </span>
              </div>
            )}
            {(post.project_duration || post.project_cost) && (
              <div style={{ display: 'flex', gap: theme.spacing[4] }}>
                {post.project_duration && (
                  <div>
                    <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>
                      Duration:{' '}
                    </span>
                    <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                      {post.project_duration} hours
                    </span>
                  </div>
                )}
                {post.project_cost && (
                  <div>
                    <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>
                      Cost:{' '}
                    </span>
                    <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                      £{post.project_cost.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {post.post_type === 'help_request' && (
          <div
            style={{
              padding: theme.spacing[4],
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.borderRadius.md,
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[2],
            }}
          >
            {post.help_category && (
              <div>
                <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>
                  Category:{' '}
                </span>
                <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                  {post.help_category}
                </span>
              </div>
            )}
            {post.urgency_level && (
              <div>
                <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>
                  Urgency:{' '}
                </span>
                <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                  {post.urgency_level}
                </span>
              </div>
            )}
            {post.budget_range && (
              <div>
                <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>
                  Budget:{' '}
                </span>
                <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                  £{post.budget_range.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {post.post_type === 'equipment_share' && (
          <div
            style={{
              padding: theme.spacing[4],
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.borderRadius.md,
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[2],
            }}
          >
            {post.item_name && (
              <div>
                <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>
                  Item:{' '}
                </span>
                <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                  {post.item_name}
                </span>
              </div>
            )}
            {post.item_condition && (
              <div>
                <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>
                  Condition:{' '}
                </span>
                <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                  {post.item_condition}
                </span>
              </div>
            )}
            {post.rental_price && (
              <div>
                <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>
                  Rental Price:{' '}
                </span>
                <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                  £{post.rental_price}/day
                </span>
              </div>
            )}
          </div>
        )}

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: theme.spacing[3],
            }}
          >
            {post.images.map((image, index) => (
              <div
                key={`${post.id}-image-${index}`}
                style={{
                  position: 'relative',
                  paddingBottom: '100%',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  backgroundColor: theme.colors.backgroundSecondary,
                }}
              >
                <img
                  src={image || 'https://via.placeholder.com/300'}
                  alt={post.title}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <footer
          style={{
            display: 'flex',
            gap: theme.spacing[4],
            paddingTop: theme.spacing[4],
            borderTop: `1px solid ${theme.colors.border}`,
          }}
        >
          <button
            type='button'
            onClick={handleLike}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              background: 'transparent',
              border: 'none',
              color: post.liked ? theme.colors.error : theme.colors.textSecondary,
              cursor: 'pointer',
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            <Icon name='heart' size={16} color={post.liked ? theme.colors.error : theme.colors.textSecondary} />
            {post.likes_count ?? 0}
          </button>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            <Icon name='messages' size={16} color={theme.colors.textSecondary} />
            {post.comments_count ?? 0}
          </div>
          <button
            type='button'
            onClick={handleShare}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              background: 'transparent',
              border: 'none',
              color: theme.colors.textSecondary,
              cursor: 'pointer',
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            <Icon name='share' size={16} color={theme.colors.textSecondary} />
            {post.shares_count ?? 0}
          </button>
          <div
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            <Icon name='eye' size={16} color={theme.colors.textSecondary} />
            {post.views_count ?? 0} views
          </div>
        </footer>

        {/* Comments Section - Always visible on detail page */}
        <CommentsSection
          postId={post.id}
          currentUserId={currentUserId}
          autoLoad={true}
          onCommentAdded={() => {
            // Refresh post to update comment count
            fetch(`/api/contractor/posts/${post.id}`)
              .then(res => res.json())
              .then(data => {
                if (data.post) {
                  setPost((prev) => ({
                    ...prev,
                    comments_count: data.post.comments_count,
                  }));
                }
              });
          }}
        />
      </article>

      <ShareDialog
        open={showShareModal}
        onOpenChange={setShowShareModal}
        postId={post.id}
        postTitle={post.title}
        shareLink={shareLink}
      />
    </div>
  );
}

