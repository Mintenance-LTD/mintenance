import React from 'react';
import Image from 'next/image';
import { URGENCY_OPTIONS } from './types';
import type {
  Property,
  ImagePreviewItem,
  BuildingAssessmentData,
  JobFormData,
} from './types';
import { AssessmentSummary } from './review-step-assessment';

/**
 * Job-creation review step — Direction A · Mint Editorial.
 */

interface ReviewStepProps {
  formData: JobFormData;
  selectedProperty: Property | undefined;
  imagePreviews: ImagePreviewItem[];
  assessment: BuildingAssessmentData | null;
  onEditStep: (step: number) => void;
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--me-ink-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 4,
};

function EditButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 0,
        padding: 0,
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--me-brand)',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {label ?? 'Edit'}
    </button>
  );
}

const dividerSection: React.CSSProperties = {
  paddingBottom: 22,
  borderBottom: '1px solid var(--me-line-2)',
};

export function ReviewStep({
  formData,
  selectedProperty,
  imagePreviews,
  assessment,
  onEditStep,
}: ReviewStepProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h2 className='t-h2' style={{ marginBottom: 4 }}>
          Review and post your job
        </h2>
        <p className='t-body' style={{ margin: 0 }}>
          Make sure everything looks good before posting
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <PropertySummary
          selectedProperty={selectedProperty}
          onEdit={() => onEditStep(1)}
        />
        <JobDetailsSummary formData={formData} onEdit={() => onEditStep(1)} />
        {imagePreviews.length > 0 && (
          <PhotosSummary
            imagePreviews={imagePreviews}
            onEdit={() => onEditStep(2)}
          />
        )}
        <TimelineSummary formData={formData} onEdit={() => onEditStep(3)} />
        {assessment && (
          <AssessmentSummary
            assessment={assessment}
            onViewDetails={() => onEditStep(2)}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function PropertySummary({
  selectedProperty,
  onEdit,
}: {
  selectedProperty: Property | undefined;
  onEdit: () => void;
}) {
  return (
    <div style={{ ...dividerSection, display: 'flex', gap: 16 }}>
      {selectedProperty && (
        <div
          style={{
            position: 'relative',
            width: 88,
            height: 88,
            borderRadius: 'var(--me-radius-input)',
            overflow: 'hidden',
            background: 'var(--me-bg-2)',
            flexShrink: 0,
          }}
        >
          <Image
            src={selectedProperty.photos?.[0] || '/placeholder-property.svg'}
            alt={selectedProperty.property_name || 'Property'}
            fill
            style={{ objectFit: 'cover' }}
            onError={(e) => {
              e.currentTarget.src = '/placeholder-property.svg';
            }}
          />
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={fieldLabelStyle}>Property</div>
        <p
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 600,
            color: 'var(--me-ink)',
          }}
        >
          {selectedProperty?.property_name || 'Property'}
        </p>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: 13,
            color: 'var(--me-ink-2)',
          }}
        >
          {selectedProperty?.address}
        </p>
      </div>
      <EditButton onClick={onEdit} />
    </div>
  );
}

function JobDetailsSummary({
  formData,
  onEdit,
}: {
  formData: JobFormData;
  onEdit: () => void;
}) {
  return (
    <div style={dividerSection}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={fieldLabelStyle}>Job title</div>
          <p
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 600,
              color: 'var(--me-ink)',
            }}
          >
            {formData.title}
          </p>
        </div>
        <EditButton onClick={onEdit} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={fieldLabelStyle}>Category</div>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: 'var(--me-ink)',
            textTransform: 'capitalize',
          }}
        >
          {formData.category}
        </p>
      </div>
      <div>
        <div style={fieldLabelStyle}>Description</div>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: 'var(--me-ink)',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.55,
          }}
        >
          {formData.description}
        </p>
      </div>
    </div>
  );
}

function PhotosSummary({
  imagePreviews,
  onEdit,
}: {
  imagePreviews: ImagePreviewItem[];
  onEdit: () => void;
}) {
  return (
    <div style={dividerSection}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ ...fieldLabelStyle, marginBottom: 0 }}>
          Photos ({imagePreviews.length})
        </div>
        <EditButton onClick={onEdit} />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        {imagePreviews.slice(0, 4).map((previewItem, index) => (
          <div
            key={index}
            style={{
              position: 'relative',
              aspectRatio: '1 / 1',
              borderRadius: 'var(--me-radius-input)',
              overflow: 'hidden',
              background: 'var(--me-bg-2)',
            }}
          >
            <Image
              src={previewItem.preview}
              alt={`Photo ${index + 1}`}
              fill
              style={{ objectFit: 'cover' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineSummary({
  formData,
  onEdit,
}: {
  formData: JobFormData;
  onEdit: () => void;
}) {
  return (
    <div style={dividerSection}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <div style={{ ...fieldLabelStyle, marginBottom: 0 }}>Timeline</div>
        <EditButton onClick={onEdit} />
      </div>
      <div>
        <div style={fieldLabelStyle}>Urgency</div>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--me-ink)',
            textTransform: 'capitalize',
          }}
        >
          {URGENCY_OPTIONS.find((o) => o.value === formData.urgency)?.label ||
            formData.urgency}
        </p>
      </div>
    </div>
  );
}
