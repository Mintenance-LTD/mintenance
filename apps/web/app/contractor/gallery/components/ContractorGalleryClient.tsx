'use client';

import React, { useMemo, useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card.unified';
import { Badge as StatusBadge } from '@/components/ui/Badge.unified';

interface GalleryImage {
  id: string;
  uri: string;
  title: string;
  description: string;
  category: string;
  projectType: string;
  date: string;
  likes: number;
  liked: boolean;
}

const CATEGORIES = [
  { id: 'all', name: 'All work', icon: 'collection' },
  { id: 'before_after', name: 'Before/after', icon: 'activity' },
  { id: 'completed', name: 'Completed', icon: 'check' },
  { id: 'process', name: 'In progress', icon: 'progress' },
  { id: 'tools', name: 'Tools & setup', icon: 'briefcase' },
] as const;

export function ContractorGalleryClient({ images: initialImages }: { images: GalleryImage[] }) {
  const [images, setImages] = useState(initialImages);
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORIES)[number]['id']>('all');
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  const filteredImages = useMemo(() => {
    if (selectedCategory === 'all') return images;
    return images.filter((image) => image.category === selectedCategory);
  }, [images, selectedCategory]);

  const handleLike = (imageId: string) => {
    setImages((prev) =>
      prev.map((image) =>
        image.id === imageId
          ? { ...image, liked: !image.liked, likes: image.liked ? image.likes - 1 : image.likes + 1 }
          : image,
      ),
    );
  };

  const totalLikes = images.reduce((sum, img) => sum + img.likes, 0);
  const completedImages = images.filter(img => img.category === 'completed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing[4] }}>
        <div>
          <h1
            style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}
          >
            Work Portfolio Gallery
          </h1>
          <p style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>
            Highlight your craftsmanship with curated project imagery.
          </p>
        </div>
        <Button variant="primary" size="sm">
          <Icon name="plus" size={16} color="#FFFFFF" />
          Upload Photo
        </Button>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: theme.spacing[4],
        }}
      >
        <Card.Metric
          label="Total Photos"
          value={images.length.toString()}
          subtitle="In your portfolio"
          icon="collection"
          color={theme.colors.primary}
        />

        <Card.Metric
          label="Completed Projects"
          value={completedImages.toString()}
          subtitle="Showcased work"
          icon="checkCircle"
          color={theme.colors.success}
        />

        <Card.Metric
          label="Total Likes"
          value={totalLikes.toString()}
          subtitle="Client appreciation"
          icon="heart"
          color={theme.colors.error || '#EF4444'}
        />
      </section>

      <nav style={{ display: 'flex', gap: theme.spacing[3], flexWrap: 'wrap' }}>
        {CATEGORIES.map((category) => {
          const isActive = category.id === selectedCategory;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: theme.spacing[2],
                padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                borderRadius: '999px',
                border: `1px solid ${isActive ? theme.colors.primary : theme.colors.border}`,
                backgroundColor: isActive ? theme.colors.backgroundSecondary : theme.colors.surface,
                color: isActive ? theme.colors.primary : theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                cursor: 'pointer',
              }}
            >
              <Icon name={category.icon} size={16} color={isActive ? theme.colors.primary : theme.colors.textSecondary} />
              {category.name}
            </button>
          );
        })}
      </nav>

      {filteredImages.length === 0 ? (
        <div
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: '20px',
            border: `1px dashed ${theme.colors.border}`,
            padding: `${theme.spacing[12]} ${theme.spacing[6]}`,
            textAlign: 'center',
            color: theme.colors.textSecondary,
          }}
        >
          <div style={{ marginBottom: theme.spacing[4], display: 'flex', justifyContent: 'center' }}>
            <Icon name='collection' size={48} color={theme.colors.textQuaternary} />
          </div>
          <h3 style={{ marginBottom: theme.spacing[2], fontSize: theme.typography.fontSize.xl, color: theme.colors.textPrimary }}>
            No photos yet
          </h3>
          <p>Complete jobs and upload photos to showcase your portfolio.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: theme.spacing[5],
          }}
        >
          {filteredImages.map((image) => (
            <div
              key={image.id}
              onClick={() => setSelectedImage(image)}
              style={{
                position: 'relative',
                paddingBottom: '100%',
                borderRadius: '20px',
                overflow: 'hidden',
                backgroundColor: theme.colors.backgroundSecondary,
                border: `1px solid ${theme.colors.border}`,
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <img
                src={image.uri || 'https://via.placeholder.com/300'}
                alt={image.title}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: theme.spacing[3],
                  right: theme.spacing[3],
                  display: 'flex',
                  gap: theme.spacing[2],
                }}
              >
                <div
                  style={{
                    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                    borderRadius: '999px',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: theme.spacing[1],
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.semibold,
                  }}
                >
                  <Icon name="heart" size={14} color={theme.colors.error} />
                  {image.likes}
                </div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: theme.spacing[4],
                  color: theme.colors.white,
                  gap: theme.spacing[1],
                }}
              >
                <span style={{ fontWeight: theme.typography.fontWeight.bold, fontSize: theme.typography.fontSize.base }}>
                  {image.title}
                </span>
                <span style={{ fontSize: theme.typography.fontSize.xs, opacity: 0.9 }}>{image.projectType}</span>
                <div style={{ marginTop: theme.spacing[1] }}>
                  <StatusBadge status={image.category} size="sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: theme.spacing[6],
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '960px',
              width: '100%',
              backgroundColor: theme.colors.surface,
              borderRadius: '20px',
              border: `1px solid ${theme.colors.border}`,
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: '1fr 320px',
              gap: theme.spacing[5],
            }}
          >
            <div style={{ position: 'relative', minHeight: '360px' }}>
              <img
                src={selectedImage.uri}
                alt={selectedImage.title}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ padding: theme.spacing[5], display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
              <header>
                <h3
                  style={{
                    margin: 0,
                    fontSize: theme.typography.fontSize.xl,
                    fontWeight: theme.typography.fontWeight.bold,
                  }}
                >
                  {selectedImage.title}
                </h3>
                <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                  {selectedImage.projectType} - {selectedImage.date}
                </span>
              </header>
              <p style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 1.6 }}>
                {selectedImage.description}
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: theme.spacing[2] }}>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={() => handleLike(selectedImage.id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: theme.spacing[2] }}
                >
                  <Icon
                    name='heart'
                    size={16}
                    color={selectedImage.liked ? theme.colors.error : theme.colors.textSecondary}
                    style={{ stroke: selectedImage.liked ? theme.colors.error : theme.colors.textSecondary }}
                  />
                  {selectedImage.likes}
                </Button>
                <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                  Tap outside to close
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
