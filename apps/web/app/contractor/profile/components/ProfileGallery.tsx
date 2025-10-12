'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';

interface ProfileGalleryProps {
  completedJobs: any[];
  posts: any[];
  onAddPhotos?: () => void;
}

export function ProfileGallery({ completedJobs, posts, onAddPhotos }: ProfileGalleryProps) {
  const [activeTab, setActiveTab] = useState<'jobs' | 'posts'>('jobs');

  // Extract all photos from jobs and posts
  const jobPhotos = completedJobs?.flatMap(job => 
    Array.isArray(job.photos) ? job.photos.map((photo: any) => ({
      url: typeof photo === 'string' ? photo : photo.url,
      title: job.title,
      category: job.category,
      type: 'job'
    })) : []
  ) || [];

  const postPhotos = posts?.flatMap(post => 
    Array.isArray(post.images) ? post.images.map((img: any) => ({
      url: typeof img === 'string' ? img : img.url,
      title: post.title,
      category: post.help_category || 'Showcase',
      type: 'post'
    })) : []
  ) || [];

  const allPhotos = activeTab === 'jobs' ? jobPhotos : postPhotos;

  return (
    <div style={{
      backgroundColor: theme.colors.surface,
      borderRadius: '24px',
      padding: theme.spacing[8],
      border: `1px solid ${theme.colors.border}`,
      boxShadow: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing[6],
    }}>
      {/* Header with Tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing[6],
        flexWrap: 'wrap',
        gap: theme.spacing[4],
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2 style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            margin: 0,
          }}>
          Portfolio Gallery
          </h2>
          <p style={{
            margin: 0,
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary,
          }}>
            Share before-and-after projects and social showcases.
          </p>
        </div>

        <div style={{ display: 'flex', gap: theme.spacing[3], alignItems: 'center' }}>
          {/* Add Photos Button */}
          {onAddPhotos && (
            <button
              type="button"
              onClick={onAddPhotos}
              style={{
                padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                backgroundColor: theme.colors.backgroundSecondary,
                color: theme.colors.textPrimary,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '14px',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
                transition: `background-color ${theme.animation.duration.fast} ${theme.animation.easing.easeOut}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.background;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
              }}
            >
              <span style={{ fontSize: theme.typography.fontSize.lg }}>+</span>
              Add Photos
            </button>
          )}

          {/* Tab Buttons */}
          <button
            type="button"
            onClick={() => setActiveTab('jobs')}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              backgroundColor: activeTab === 'jobs' ? theme.colors.primary : theme.colors.backgroundSecondary,
              color: activeTab === 'jobs' ? theme.colors.textInverse : theme.colors.text,
              border: `1px solid ${activeTab === 'jobs' ? theme.colors.primary : theme.colors.border}`,
              borderRadius: '999px',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              cursor: 'pointer',
              transition: `all ${theme.animation.duration.fast} ${theme.animation.easing.easeOut}`,
            }}
          >
            Completed Jobs ({jobPhotos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('posts')}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              backgroundColor: activeTab === 'posts' ? theme.colors.primary : theme.colors.backgroundSecondary,
              color: activeTab === 'posts' ? theme.colors.textInverse : theme.colors.text,
              border: `1px solid ${activeTab === 'posts' ? theme.colors.primary : theme.colors.border}`,
              borderRadius: '999px',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              cursor: 'pointer',
              transition: `all ${theme.animation.duration.fast} ${theme.animation.easing.easeOut}`,
            }}
          >
            Showcases ({postPhotos.length})
          </button>
        </div>
      </div>

      {/* Gallery Grid */}
      {allPhotos.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: theme.spacing[4],
        }}>
          {allPhotos.map((photo, index) => (
            <div
              key={index}
              style={{
                position: 'relative',
                paddingBottom: '100%',
                borderRadius: '20px',
                overflow: 'hidden',
                backgroundColor: theme.colors.backgroundSecondary,
                cursor: 'pointer',
                border: `1px solid ${theme.colors.border}`,
              }}
            >
              <img
                src={photo.url || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400'}
                alt={photo.title}
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
                  marginBottom: theme.spacing[1],
                }}>
                  {photo.title}
                </p>
                <p style={{
                  fontSize: theme.typography.fontSize.xs,
                  opacity: 0.9,
                }}>
                  {photo.category}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: theme.spacing[12],
          color: theme.colors.textSecondary,
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: '20px',
          border: `1px dashed ${theme.colors.border}`,
        }}>
          <p style={{ fontSize: theme.typography.fontSize.lg, marginBottom: theme.spacing[2] }}>
            No photos yet
          </p>
          <p style={{ fontSize: theme.typography.fontSize.sm }}>
            Complete jobs and add photos to showcase your work
          </p>
        </div>
      )}
    </div>
  );
}

