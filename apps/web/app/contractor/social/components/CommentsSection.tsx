'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '@/lib/theme';
import { logger } from '@mintenance/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Trash2, AlertCircle } from 'lucide-react';
import { fetchWithCSRF, useCSRF } from '@/lib/hooks/useCSRF';

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
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; commentId: string | null }>({ open: false, commentId: null });
  const { csrfToken, loading: csrfLoading, error: csrfError } = useCSRF();

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contractor/posts/${postId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      logger.error('Error fetching comments:', error);
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

    if (!csrfToken || csrfLoading || csrfError) {
      setError('Unable to verify request. Please try again.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetchWithCSRF(`/api/contractor/posts/${postId}/comments`, {
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
      setError(null);
    } catch (error) {
      logger.error('Error adding comment:', error);
      setError(error instanceof Error ? error.message : 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setDeleteDialog({ open: true, commentId });
  };

  const confirmDeleteComment = async () => {
    if (!deleteDialog.commentId) return;

    try {
      const response = await fetchWithCSRF(`/api/contractor/posts/${postId}/comments/${deleteDialog.commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      await fetchComments();
      onCommentAdded?.();
      setDeleteDialog({ open: false, commentId: null });
    } catch (error) {
      logger.error('Error deleting comment:', error);
      setDeleteDialog({ open: false, commentId: null });
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const response = await fetchWithCSRF(`/api/contractor/posts/${postId}/comments/${commentId}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchComments();
      }
    } catch (error) {
      logger.error('Error liking comment:', error);
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleLikeComment(comment.id)}
                className="p-0 h-auto"
              >
                <Heart className="h-3.5 w-3.5" />
                {comment.likes_count || 0}
              </Button>

              {depth < 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="p-0 h-auto"
                >
                  Reply
                </Button>
              )}

              {isOwnComment && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteComment(comment.id)}
                  className="p-0 h-auto text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
            </div>

            {/* Reply form */}
            {replyingTo === comment.id && (
              <form
                onSubmit={(e) => handleSubmitComment(e, comment.id)}
                style={{ marginTop: theme.spacing[3], display: 'flex', gap: theme.spacing[2] }}
              >
                <Input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  maxLength={2000}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={!replyText.trim() || submitting}
                  size="sm"
                >
                  {submitting ? 'Posting...' : 'Post'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText('');
                  }}
                >
                  Cancel
                </Button>
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
            <Input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              maxLength={2000}
              className="flex-1"
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
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open: boolean) => setDeleteDialog({ open, commentId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteComment} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

