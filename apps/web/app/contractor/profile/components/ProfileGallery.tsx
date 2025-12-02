'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';

interface JobWithPhotos {
  photos?: Array<string | { url: string }>;
  title?: string;
  category?: string;
  created_at?: string;
}

interface PostWithImages {
  images?: Array<string | { url: string }>;
  title?: string;
  help_category?: string;
  created_at?: string;
}

interface ProfileGalleryProps {
  completedJobs: JobWithPhotos[];
  posts: PostWithImages[];
  onAddPhotos?: () => void;
}

export function ProfileGallery({ completedJobs, posts, onAddPhotos }: ProfileGalleryProps) {
  const [activeTab, setActiveTab] = useState<'jobs' | 'posts'>('jobs');

  // Extract all photos from jobs and posts
  const jobPhotos = completedJobs?.flatMap(job => 
    Array.isArray(job.photos) ? job.photos.map((photo: string | { url: string }) => ({
      url: typeof photo === 'string' ? photo : photo.url,
      title: job.title,
      category: job.category,
      type: 'job'
    })) : []
  ) || [];

  const postPhotos = posts?.flatMap(post => 
    Array.isArray(post.images) ? post.images.map((img: string | { url: string }) => ({
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
          <h2 className="text-xl font-[560] text-gray-900 m-0 tracking-normal">
            Portfolio Gallery
          </h2>
          <p className="text-xs font-[460] text-gray-600 m-0">
            Share before-and-after projects and social showcases.
          </p>
        </div>

        <div style={{ display: 'flex', gap: theme.spacing[3], alignItems: 'center' }}>
          {/* Add Photos Button */}
          {onAddPhotos && (
            <Button
              type="button"
              onClick={onAddPhotos}
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add Photos
            </Button>
          )}

          {/* Tab Buttons */}
          <Button
            type="button"
            onClick={() => setActiveTab('jobs')}
            variant={activeTab === 'jobs' ? 'primary' : 'ghost'}
            size="sm"
            className="rounded-full"
          >
            Completed Jobs ({jobPhotos.length})
          </Button>
          <Button
            type="button"
            onClick={() => setActiveTab('posts')}
            variant={activeTab === 'posts' ? 'primary' : 'ghost'}
            size="sm"
            className="rounded-full"
          >
            Showcases ({postPhotos.length})
          </Button>
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
              <Image
                src={photo.url || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400'}
                alt={photo.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                loading="lazy"
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

