import React from 'react';
import Image from 'next/image';
import { AlertTriangle, UploadCloud, X } from 'lucide-react';
import type { ImagePreviewItem, BuildingAssessmentData } from './types';

/**
 * Job-creation photos step — Direction A · Mint Editorial.
 */

interface PhotosStepProps {
  imagePreviews: ImagePreviewItem[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  isAssessing: boolean;
  assessment: BuildingAssessmentData | null;
}

export function PhotosStep({
  imagePreviews,
  onFileChange,
  onRemoveImage,
  isAssessing,
  assessment,
}: PhotosStepProps) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 28 }}
      data-testid='step-2-photos'
    >
      <div>
        <h2 className='t-h2' style={{ marginBottom: 4 }}>
          Add photos of your project
        </h2>
        <p className='t-body' style={{ margin: 0 }}>
          Help contractors understand the scope of work (optional)
        </p>
      </div>

      {/* Drag & Drop Zone */}
      <label
        htmlFor='photo-upload'
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: 232,
          border: '2px dashed var(--me-line)',
          borderRadius: 'var(--me-radius-card)',
          cursor: 'pointer',
          background: 'var(--me-bg-2)',
          textAlign: 'center',
        }}
      >
        <UploadCloud
          className='w-10 h-10'
          style={{ color: 'var(--me-ink-3)', marginBottom: 14 }}
        />
        <p
          style={{
            margin: '0 0 4px',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--me-ink)',
          }}
        >
          <span style={{ color: 'var(--me-brand)' }}>Click to upload</span> or
          drag and drop
        </p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--me-ink-3)' }}>
          PNG, JPG, JPEG up to 10MB (max 10 photos)
        </p>
        <input
          id='photo-upload'
          type='file'
          style={{ display: 'none' }}
          multiple
          accept='image/*'
          onChange={onFileChange}
        />
      </label>

      {/* Photo Previews */}
      {imagePreviews.length > 0 && (
        <div>
          <h3 className='t-h4' style={{ marginBottom: 12 }}>
            Uploaded photos ({imagePreviews.length}/10)
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 14,
            }}
          >
            {imagePreviews.map((previewItem, index) => (
              <div
                key={index}
                style={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  borderRadius: 'var(--me-radius-card)',
                  overflow: 'hidden',
                  background: 'var(--me-bg-2)',
                  border: '1px solid var(--me-line)',
                }}
              >
                <Image
                  src={previewItem.preview}
                  alt={`Preview ${index + 1}`}
                  fill
                  style={{ objectFit: 'cover' }}
                />
                <button
                  type='button'
                  onClick={() => onRemoveImage(index)}
                  aria-label={`Remove photo ${index + 1}`}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 30,
                    height: 30,
                    borderRadius: 9999,
                    border: 0,
                    background: 'var(--me-err-fg)',
                    color: 'var(--me-on-brand)',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X className='w-4 h-4' />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Assessment Loading State */}
      {isAssessing && <AssessmentLoadingState />}

      {/* AI Assessment Results */}
      {assessment && !isAssessing && (
        <AssessmentResults assessment={assessment} />
      )}
    </div>
  );
}

function AssessmentLoadingState() {
  return (
    <div
      style={{
        background: 'var(--me-brand-soft)',
        border: '1px solid var(--me-brand)',
        borderRadius: 'var(--me-radius-card)',
        padding: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        className='animate-spin'
        style={{
          width: 36,
          height: 36,
          borderRadius: 9999,
          border: '4px solid var(--me-surface)',
          borderTopColor: 'var(--me-brand)',
          flexShrink: 0,
        }}
      />
      <div>
        <h3 className='t-h4' style={{ marginBottom: 2 }}>
          AI analysis in progress
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--me-ink-2)' }}>
          Analysing images for damage assessment…
        </p>
      </div>
    </div>
  );
}

function AssessmentResults({
  assessment,
}: {
  assessment: BuildingAssessmentData;
}) {
  return (
    <div
      style={{
        background: 'var(--me-brand-soft)',
        border: '1px solid var(--me-brand)',
        borderRadius: 'var(--me-radius-card)',
        padding: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: 'var(--me-brand)',
            color: 'var(--me-on-brand)',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          AI
        </div>
        <div style={{ flex: 1 }}>
          <h3 className='t-h4'>Building damage assessment</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--me-ink-2)' }}>
            AI-powered analysis complete
          </p>
        </div>
        <span className='badge badge-brand'>
          {assessment.damageAssessment.confidence}% confidence
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
        }}
      >
        <InfoTile
          label='Damage type'
          value={assessment.damageAssessment.damageType}
        />
        <InfoTile
          label='Severity'
          value={assessment.damageAssessment.severity}
        />

        {assessment.safetyHazards.hasSafetyHazards && (
          <div
            style={{
              gridColumn: '1 / -1',
              background: 'var(--me-err-bg)',
              border: '1px solid var(--me-err-fg)',
              borderRadius: 'var(--me-radius-input)',
              padding: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 4,
              }}
            >
              <AlertTriangle
                className='w-4 h-4'
                style={{ color: 'var(--me-err-fg)' }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--me-err-fg)',
                }}
              >
                Safety hazards detected
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--me-err-fg)',
                marginLeft: 24,
              }}
            >
              {assessment.safetyHazards.criticalFlags.join(', ')}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 14,
          padding: 14,
          background: 'var(--me-surface)',
          borderRadius: 'var(--me-radius-input)',
          border: '1px solid var(--me-line)',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--me-ink-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 6,
          }}
        >
          Description
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.55,
            color: 'var(--me-ink-2)',
          }}
        >
          {assessment.damageAssessment.description}
        </p>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'var(--me-surface)',
        borderRadius: 'var(--me-radius-input)',
        padding: 14,
        border: '1px solid var(--me-line)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--me-ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--me-ink)',
          textTransform: 'capitalize',
        }}
      >
        {value}
      </div>
    </div>
  );
}
