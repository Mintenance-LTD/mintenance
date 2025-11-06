'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { NotificationBanner } from '@/components/ui/NotificationBanner';
import { CreatePostModal } from './CreatePostModal';
import { CommentsSection } from './CommentsSection';
import { FollowButton } from './FollowButton';
import { ShareModal } from './ShareModal';
import { useCSRF } from '@/lib/hooks/useCSRF';

interface SocialPost {
  id: string;
  title: string;
  content: string;
  images?: string[];
  post_type?: string;
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  liked?: boolean;
  contractor?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
    city?: string;
    country?: string;
  };
}

export function ContractorSocialClient({ posts: initialPosts, currentUserId }: { posts: SocialPost[]; currentUserId?: string }) {
  const [posts, setPosts] = useState<SocialPost[]>(initialPosts);
  const [notification, setNotification] = useState<{ tone: 'info' | 'success' | 'warning'; message: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { csrfToken } = useCSRF();
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [postTypeFilter, setPostTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'most_commented'>('newest');
  const [feedTab, setFeedTab] = useState<'all' | 'following'>('all');
  const [shareModalPost, setShareModalPost] = useState<{ id: string; title: string; shareLink: string } | null>(null);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (postTypeFilter !== 'all') {
        params.append('post_type', postTypeFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      params.append('sort', sortBy);
      if (feedTab === 'following') {
        params.append('following', 'true');
      }

      const response = await fetch(`/api/contractor/posts?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postTypeFilter, searchQuery, sortBy, feedTab]);

  const handleLike = async (postId: string) => {
    // Optimistic update
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const wasLiked = post.liked;
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: !post.liked,
              likes_count: (post.likes_count ?? 0) + (post.liked ? -1 : 1),
            }
          : post,
      ),
    );

    try {
      if (!csrfToken) {
        setNotification({ tone: 'warning', message: 'Security token not available. Please refresh the page.' });
        return;
      }

      const response = await fetch(`/api/contractor/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        // Revert on error
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  liked: wasLiked,
                  likes_count: (post.likes_count ?? 0) + (wasLiked ? 1 : -1),
                }
              : post,
          ),
        );
        throw new Error('Failed to like post');
      }

      const data = await response.json();
      // Update with server response
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                liked: data.liked,
                likes_count: data.likes_count,
              }
            : post,
        ),
      );
    } catch (error) {
      console.error('Error liking post:', error);
      setNotification({ tone: 'warning', message: 'Failed to update like. Please try again.' });
    }
  };

  const handlePostCreated = () => {
    setShowCreateModal(false);
    fetchPosts(); // Refresh posts
    setNotification({ tone: 'success', message: 'Post created successfully!' });
  };

  const handleSharePost = async (postId: string) => {
    try {
      const response = await fetch(`/api/contractor/posts/${postId}/share`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        const post = posts.find(p => p.id === postId);
        
        // Update local post shares_count
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, shares_count: (post.shares_count || 0) + 1 }
              : post
          )
        );
        
        // Show share modal
        setShareModalPost({
          id: postId,
          title: post?.title || '',
          shareLink: data.share_link || (typeof window !== 'undefined' ? `${window.location.origin}/contractor/social/post/${postId}` : `/contractor/social/post/${postId}`),
        });
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      setNotification({ tone: 'warning', message: 'Failed to share post' });
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
      {notification && (
        <NotificationBanner
          tone={notification.tone === 'warning' ? 'warning' : notification.tone === 'success' ? 'success' : 'info'}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      <header style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing[4] }}>
          <div>
            <h1
              style={{
                fontSize: theme.typography.fontSize['3xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}
            >
              Community feed
            </h1>
            <p style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>
              Share wins, showcase projects, and stay visible in the contractor network.
            </p>
          </div>
          <Button
            variant='primary'
            style={{ display: 'inline-flex', alignItems: 'center', gap: theme.spacing[2] }}
            onClick={() => setShowCreateModal(true)}
          >
            <Icon name='plus' size={16} color={theme.colors.white} />
            Create post
          </Button>
        </div>

        {/* Feed Tabs */}
        <div style={{ display: 'flex', gap: theme.spacing[2], borderBottom: `1px solid ${theme.colors.border}` }}>
          <button
            type="button"
            onClick={() => setFeedTab('all')}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              background: 'transparent',
              border: 'none',
              borderBottom: feedTab === 'all' ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
              color: feedTab === 'all' ? theme.colors.primary : theme.colors.textSecondary,
              fontWeight: feedTab === 'all' ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.normal,
              cursor: 'pointer',
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            All Posts
          </button>
          <button
            type="button"
            onClick={() => setFeedTab('following')}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              background: 'transparent',
              border: 'none',
              borderBottom: feedTab === 'following' ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
              color: feedTab === 'following' ? theme.colors.primary : theme.colors.textSecondary,
              fontWeight: feedTab === 'following' ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.normal,
              cursor: 'pointer',
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            Following
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: theme.spacing[3], flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Post Type Filter */}
          <select
            value={postTypeFilter}
            onChange={(e) => setPostTypeFilter(e.target.value)}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
              fontSize: theme.typography.fontSize.sm,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
            }}
          >
            <option value="all">All Types</option>
            <option value="work_showcase">Work Showcase</option>
            <option value="help_request">Help Request</option>
            <option value="tip_share">Tip Share</option>
            <option value="equipment_share">Equipment Share</option>
            <option value="referral_request">Referral Request</option>
          </select>

          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts..."
            style={{
              flex: 1,
              minWidth: '200px',
              padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
              fontSize: theme.typography.fontSize.sm,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
            }}
          />

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'popular' | 'most_commented')}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
              fontSize: theme.typography.fontSize.sm,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
            }}
          >
            <option value="newest">Newest</option>
            <option value="popular">Most Liked</option>
            <option value="most_commented">Most Commented</option>
          </select>
        </div>
      </header>

      {posts.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: '20px',
            border: `1px dashed ${theme.colors.border}`,
            padding: `${theme.spacing[12]} ${theme.spacing[6]}`,
            color: theme.colors.textSecondary,
          }}
        >
          <div style={{ marginBottom: theme.spacing[4], display: 'flex', justifyContent: 'center' }}>
            <Icon name='megaphone' size={48} color={theme.colors.textQuaternary} />
          </div>
          <h3 style={{ marginBottom: theme.spacing[2], fontSize: theme.typography.fontSize.xl, color: theme.colors.textPrimary }}>
            No posts yet
          </h3>
          <p>Share updates, advice, or progress shots to engage homeowners and your peers.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
          {posts.map((post) => {
            const initials = `${post.contractor?.first_name?.[0] ?? 'C'}${post.contractor?.last_name?.[0] ?? ''}`;
            return (
              <article
                key={post.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.xl,
                  border: `1px solid ${theme.colors.border}`,
                  padding: theme.spacing[6],
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing[4],
                  boxShadow: theme.shadows.sm,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = theme.shadows.md;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = theme.shadows.sm;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <header style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
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
                        <div style={{ fontWeight: theme.typography.fontWeight.semibold }}>
                          {post.contractor?.first_name ?? 'Contractor'} {post.contractor?.last_name ?? ''}
                        </div>
                        <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                          {post.contractor?.city && `${post.contractor.city}, `}
                          {post.contractor?.country ?? ''} • {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      {post.contractor?.id && post.contractor.id !== currentUserId && (
                        <FollowButton
                          contractorId={post.contractor.id}
                          currentUserId={currentUserId}
                          variant="minimal"
                        />
                      )}
                </header>

                <div>
                  <h2
                    style={{
                      fontSize: theme.typography.fontSize.xl,
                      fontWeight: theme.typography.fontWeight.bold,
                      marginBottom: theme.spacing[2],
                    }}
                  >
                    {post.title}
                  </h2>
                  <p style={{ color: theme.colors.textSecondary, lineHeight: 1.6 }}>{post.content}</p>
                </div>

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
                    onClick={() => handleLike(post.id)}
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
                  <button
                    type='button'
                    onClick={() => toggleComments(post.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: theme.spacing[2],
                      background: 'transparent',
                      border: 'none',
                      color: expandedComments.has(post.id) ? theme.colors.primary : theme.colors.textSecondary,
                      cursor: 'pointer',
                      fontSize: theme.typography.fontSize.sm,
                    }}
                  >
                    <Icon name='messages' size={16} color={expandedComments.has(post.id) ? theme.colors.primary : theme.colors.textSecondary} />
                    {post.comments_count ?? 0}
                  </button>
                  <button
                    type='button'
                    onClick={() => handleSharePost(post.id)}
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
                </footer>

                {/* Comments Section */}
                {expandedComments.has(post.id) && (
                  <CommentsSection
                    postId={post.id}
                    currentUserId={currentUserId}
                    onCommentAdded={() => {
                      fetchPosts();
                    }}
                  />
                )}
              </article>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}

      {shareModalPost && (
        <ShareModal
          postId={shareModalPost.id}
          postTitle={shareModalPost.title}
          shareLink={shareModalPost.shareLink}
          onClose={() => setShareModalPost(null)}
        />
      )}
    </div>
  );
}
