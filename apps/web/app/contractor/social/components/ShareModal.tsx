'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface ShareModalProps {
  postId: string;
  postTitle: string;
  shareLink: string;
  onClose: () => void;
}

export function ShareModal({ postId, postTitle, shareLink, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: postTitle,
          text: `Check out this post: ${postTitle}`,
          url: shareLink,
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed:', error);
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: theme.spacing[4],
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: '20px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: theme.shadows.lg,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: theme.spacing[6],
            borderBottom: `1px solid ${theme.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              margin: 0,
            }}
          >
            Share Post
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: theme.spacing[1],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="x" size={20} color={theme.colors.textSecondary} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: theme.spacing[6], display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.text,
                marginBottom: theme.spacing[2],
              }}
            >
              Share Link
            </label>
            <div style={{ display: 'flex', gap: theme.spacing[2] }}>
              <input
                type="text"
                value={shareLink}
                readOnly
                style={{
                  flex: 1,
                  padding: theme.spacing[3],
                  fontSize: theme.typography.fontSize.sm,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.border}`,
                  backgroundColor: theme.colors.backgroundSecondary,
                  color: theme.colors.text,
                }}
              />
              <Button
                variant={copied ? 'secondary' : 'primary'}
                onClick={handleCopyLink}
                style={{ whiteSpace: 'nowrap' }}
              >
                {copied ? (
                  <>
                    <Icon name="check" size={16} color={theme.colors.success} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Icon name="copy" size={16} color={theme.colors.white} />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Native Share Button (if available) */}
          {navigator.share && (
            <Button
              variant="primary"
              onClick={handleShareNative}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing[2],
              }}
            >
              <Icon name="share" size={16} color={theme.colors.white} />
              Share via...
            </Button>
          )}

          {/* Social Media Share Options */}
          <div>
            <p
              style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.text,
                marginBottom: theme.spacing[3],
              }}
            >
              Share on social media
            </p>
            <div style={{ display: 'flex', gap: theme.spacing[2], flexWrap: 'wrap' }}>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(postTitle)}&url=${encodeURIComponent(shareLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  backgroundColor: '#1DA1F2',
                  color: 'white',
                  borderRadius: theme.borderRadius.md,
                  textDecoration: 'none',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                }}
              >
                <Icon name="share" size={16} color="white" />
                Twitter
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  backgroundColor: '#1877F2',
                  color: 'white',
                  borderRadius: theme.borderRadius.md,
                  textDecoration: 'none',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                }}
              >
                <Icon name="share" size={16} color="white" />
                Facebook
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  backgroundColor: '#0077B5',
                  color: 'white',
                  borderRadius: theme.borderRadius.md,
                  textDecoration: 'none',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                }}
              >
                <Icon name="share" size={16} color="white" />
                LinkedIn
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: theme.spacing[6],
            borderTop: `1px solid ${theme.colors.border}`,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

