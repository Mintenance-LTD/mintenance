'use client';

import React, { FormEvent, useState } from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { NotificationBanner } from '@/components/ui/NotificationBanner';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusChip } from '@/components/ui/StatusChip';

interface PhotoUploadModalProps {
  onClose: () => void;
  onUpload: (data: { files: File[]; title: string; category: string }) => Promise<void>;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const CATEGORIES = [
  'General',
  'Kitchen Remodeling',
  'Bathroom Renovation',
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Tiling',
  'Painting',
  'Flooring',
  'Roofing',
  'Landscaping',
  'Before & After',
];

export function PhotoUploadModal({ onClose, onUpload }: PhotoUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const uploadProgress = Math.min(100, Math.round((selectedFiles.length / MAX_FILES) * 100));

  const handleFilesSelected = (files: File[]) => {
    const nextFiles = [...selectedFiles];
    const nextPreviews = [...previews];

    for (const file of files) {
      if (nextFiles.length >= MAX_FILES) {
        setError(`You can upload up to ${MAX_FILES} photos per batch.`);
        break;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError('Each image must be smaller than 5MB.');
        continue;
      }

      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed.');
        continue;
      }

      nextFiles.push(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }

    setSelectedFiles(nextFiles);
    if (!files.length) {
      setPreviews(nextPreviews);
    }
    if (!files.some((file) => file.size > MAX_FILE_SIZE || !file.type.startsWith('image/'))) {
      setError(null);
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFilesSelected(Array.from(event.target.files || []));
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleFilesSelected(Array.from(event.dataTransfer.files || []));
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
    setPreviews((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedFiles.length) {
      setError('Select at least one photo.');
      return;
    }

    if (!title.trim()) {
      setError('Add a title to describe this upload.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onUpload({
        files: selectedFiles,
        title: title.trim(),
        category,
      });
      onClose();
    } catch (uploadError: any) {
      setError(uploadError.message || 'Failed to upload photos. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.52)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing[4],
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: '24px',
          maxWidth: '720px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${theme.colors.border}`,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <header
          style={{
            padding: theme.spacing[6],
            borderBottom: `1px solid ${theme.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}
            >
              Upload photos
            </h2>
            <p style={{ margin: 0, fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
              Showcase before/after work, progress shots, or highlight your craftsmanship.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: theme.spacing[2],
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="x" size={18} color={theme.colors.textSecondary} />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          style={{ padding: theme.spacing[6], overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}
        >
          {error && (
            <NotificationBanner
              tone="error"
              message={error}
              onDismiss={() => setError(null)}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <StatusChip
              label={`${selectedFiles.length}/${MAX_FILES} selected`}
              tone={selectedFiles.length ? 'info' : 'neutral'}
              withDot
            />
            <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
              Max file size {Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB
            </span>
          </div>

          <ProgressBar
            value={uploadProgress}
            tone={uploadProgress === 100 ? 'success' : 'primary'}
            showValue
          />

          <div>
            <label
              htmlFor="photo-upload-input"
              style={{
                display: 'block',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[3],
              }}
            >
              Select photos (max {MAX_FILES}, 5MB each)
            </label>
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('photo-upload-input')?.click()}
              style={{
                border: `2px dashed ${theme.colors.border}`,
                borderRadius: '16px',
                padding: theme.spacing[12],
                textAlign: 'center',
                backgroundColor: theme.colors.backgroundSecondary,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: theme.spacing[3] }}>
                <Icon name="collection" size={40} color={theme.colors.textSecondary} />
              </div>
              <p style={{ margin: 0, fontWeight: theme.typography.fontWeight.semibold }}>
                Click to upload or drag and drop
              </p>
              <p style={{ margin: 0, fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                PNG or JPG, up to 5MB each
              </p>
              <input
                id="photo-upload-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {previews.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: theme.spacing[3] }}>
              {previews.map((preview, index) => (
                <div
                  key={`${preview}-${index}`}
                  style={{
                    position: 'relative',
                    paddingBottom: '100%',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: theme.colors.backgroundSecondary,
                  }}
                >
                  <img
                    src={preview}
                    alt={`Upload preview ${index + 1}`}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    aria-label="Remove photo"
                    style={{
                      position: 'absolute',
                      top: theme.spacing[2],
                      right: theme.spacing[2],
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: theme.colors.error,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon name="x" size={14} color={theme.colors.white} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
              <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>
                Title
              </span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={100}
                style={{
                  width: '100%',
                  padding: theme.spacing[3],
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.border}`,
                  fontSize: theme.typography.fontSize.base,
                }}
                placeholder="e.g. Loft conversion in Camden"
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
              <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>
                Category
              </span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                style={{
                  width: '100%',
                  padding: theme.spacing[3],
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.border}`,
                  fontSize: theme.typography.fontSize.base,
                }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing[3] }}>
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Uploading...' : 'Upload photos'}
            </Button>
          </footer>
        </form>
      </div>
    </div>
  );
}
