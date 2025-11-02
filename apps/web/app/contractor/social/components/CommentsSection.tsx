'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

interface Comment {
  id: string;
  post_id: string;
  contractor_id: string;
  comment_text: string;
  parent_comment_id?: string | null;
  is_solution?: boolean;
  likes_count?: number;
  created_at: string;
  updated_at?: string;
  contractor?: {
    id: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  };
  replies?: Comment[];
}

interface CommentsSectionProps {
  postId: string;
  currentUserId?: string;
  onCommentAdded?: () => void;
  autoLoad?: boolean; // If true, automatically load comments on mount
}

export function CommentsSection({ postId, currentUserId, onCommentAdded, autoLoad = false }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(autoLoad);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contractor/posts/${postId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments, fetchComments]);

  const handleSubmitComment = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    const text = parentId ? replyText : newComment;
    
    if (!text.trim() || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/contractor/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment_text: text.trim(),
          parent_comment_id: parentId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add comment');
      }

      // Clear form
      if (parentId) {
        setReplyText('');
        setReplyingTo(null);
      } else {
        setNewComment('');
      }

      // Refresh comments
      await fetchComments();
      onCommentAdded?.();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert(error instanceof Error ? error.message : 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/contractor/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      await fetchComments();
      onCommentAdded?.();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/contractor/posts/${postId}/comments/${commentId}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchComments();
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const renderComment = (comment: Comment, depth: number = 0): React.ReactNode => {
    const initials = `${comment.contractor?.first_name?.[0] ?? 'C'}${comment.contractor?.last_name?.[0] ?? ''}`;
    const isOwnComment = comment.contractor_id === currentUserId;
    const canMarkSolution = currentUserId && !comment.is_solution; // Simplified - should check if user is post author

    return (
      <div
        key={comment.id}
        style={{
          marginLeft: depth > 0 ? theme.spacing[6] : 0,
          marginBottom: theme.spacing[4],
          paddingBottom: theme.spacing[4],
          borderBottom: depth === 0 ? `1px solid ${theme.colors.border}` : 'none',
        }}
      >
        <div style={{ display: 'flex', gap: theme.spacing[3], alignItems: 'flex-start' }}>
          {comment.contractor?.profile_image_url ? (
            <img
              src={comment.contractor.profile_image_url}
              alt={`${comment.contractor.first_name} ${comment.contractor.last_name}`}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                objectFit: 'cover',
                border: `1px solid ${theme.colors.border}`,
              }}
            />
          ) : (
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: theme.colors.backgroundSecondary,
                border: `1px solid ${theme.colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.primary,
                fontSize: theme.typography.fontSize.sm,
              }}
            >
              {initials}
            </div>
          )}

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[1] }}>
              <span style={{ fontWeight: theme.typography.fontWeight.semibold, fontSize: theme.typography.fontSize.sm }}>
                {comment.contractor?.first_name ?? 'Contractor'} {comment.contractor?.last_name ?? ''}
              </span>
              {comment.is_solution && (
                <span
                  style={{
                    padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                    backgroundColor: theme.colors.success + '20',
                    color: theme.colors.success,
                    borderRadius: theme.borderRadius.md,
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.semibold,
                  }}
                >
                  ✓ Solution
                </span>
              )}
              <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                {new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>

            <p style={{ marginBottom: theme.spacing[2], fontSize: theme.typography.fontSize.sm, lineHeight: 1.6 }}>
              {comment.comment_text}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[4] }}>
              <button
                type="button"
                onClick={() => handleLikeComment(comment.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: theme.spacing[1],
                  background: 'transparent',
                  border: 'none',
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  fontSize: theme.typography.fontSize.xs,
                  padding: 0,
                }}
              >
                <Icon name="heart" size={14} color={theme.colors.textSecondary} />
                {comment.likes_count || 0}
              </button>

              {depth < 2 && (
                <button
                  type="button"
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: theme.colors.textSecondary,
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.xs,
                    padding: 0,
                  }}
                >
                  Reply
                </button>
              )}

              {isOwnComment && (
                <button
                  type="button"
                  onClick={() => handleDeleteComment(comment.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: theme.colors.error,
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.xs,
                    padding: 0,
                  }}
                >
                  Delete
                </button>
              )}
            </div>

            {/* Reply form */}
            {replyingTo === comment.id && (
              <form
                onSubmit={(e) => handleSubmitComment(e, comment.id)}
                style={{ marginTop: theme.spacing[3], display: 'flex', gap: theme.spacing[2] }}
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  maxLength={2000}
                  style={{
                    flex: 1,
                    padding: theme.spacing[2],
                    fontSize: theme.typography.fontSize.sm,
                    borderRadius: theme.borderRadius.md,
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: theme.colors.backgroundSecondary,
                  }}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={!replyText.trim() || submitting}
                  style={{ fontSize: theme.typography.fontSize.sm, padding: `${theme.spacing[2]} ${theme.spacing[3]}` }}
                >
                  {submitting ? 'Posting...' : 'Post'}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText('');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: theme.colors.textSecondary,
                    cursor: 'pointer',
                    padding: theme.spacing[2],
                  }}
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Render nested replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div style={{ marginTop: theme.spacing[4] }}>
                {comment.replies.map((reply) => renderComment(reply, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!showComments) {
    return null;
  }

  return (
    <div
      style={{
        padding: theme.spacing[4],
        borderTop: `1px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.backgroundSecondary,
      }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: theme.spacing[4], color: theme.colors.textSecondary }}>
          Loading comments...
        </div>
      ) : (
        <>
          {/* Comments list */}
          {comments.length > 0 ? (
            <div style={{ marginBottom: theme.spacing[4] }}>
              {comments.map((comment) => renderComment(comment))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: theme.spacing[4], color: theme.colors.textSecondary }}>
              No comments yet. Be the first to comment!
            </div>
          )}

          {/* Add comment form */}
          <form onSubmit={(e) => handleSubmitComment(e)} style={{ display: 'flex', gap: theme.spacing[2] }}>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              maxLength={2000}
              style={{
                flex: 1,
                padding: theme.spacing[3],
                fontSize: theme.typography.fontSize.sm,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.surface,
              }}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? 'Posting...' : 'Post'}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}

