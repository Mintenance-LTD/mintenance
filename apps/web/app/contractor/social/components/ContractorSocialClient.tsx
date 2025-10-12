'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { NotificationBanner } from '@/components/ui/NotificationBanner';

interface SocialPost {
  id: string;
  title: string;
  content: string;
  images?: string[];
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  liked?: boolean;
  contractor?: {
    first_name?: string;
    last_name?: string;
  };
}

export function ContractorSocialClient({ posts: initialPosts }: { posts: SocialPost[] }) {
  const [posts, setPosts] = useState<SocialPost[]>(initialPosts);
  const [notification, setNotification] = useState<{ tone: 'info' | 'success' | 'warning'; message: string } | null>(null);

  const handleLike = (postId: string) => {
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

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing[4] }}>
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
          onClick={() => setNotification({ tone: 'info', message: 'Post composer coming soon.' })}
        >
          <Icon name='plus' size={16} color={theme.colors.white} />
          Create post
        </Button>
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
                  borderRadius: '20px',
                  border: `1px solid ${theme.colors.border}`,
                  padding: theme.spacing[6],
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing[4],
                }}
              >
                <header style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
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
                  <div>
                    <div style={{ fontWeight: theme.typography.fontWeight.semibold }}>
                      {post.contractor?.first_name ?? 'Contractor'} {post.contractor?.last_name ?? ''}
                    </div>
                    <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                      {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
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
                    <Icon name='messages' size={16} color={theme.colors.textSecondary} />
                    {post.comments_count ?? 0}
                  </button>
                  <button
                    type='button'
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
                    Share
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
