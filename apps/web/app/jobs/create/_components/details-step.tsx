import React from 'react';
import Image from 'next/image';
import {
  Droplets,
  Zap,
  Flame,
  Hammer,
  Paintbrush,
  Home,
  Ruler,
  Sprout,
  Sparkles,
  Wrench,
  Snowflake,
  Settings,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { SmartJobAnalysis } from '../components/SmartJobAnalysis';
import { SERVICE_CATEGORIES } from './types';
import type { Property, JobFormData } from './types';
import { TenancyFields } from './tenancy-fields';

/**
 * Job-creation details step — Direction A · Mint Editorial.
 */

const ICON_MAP: Record<string, React.ReactNode> = {
  droplets: <Droplets size={26} />,
  zap: <Zap size={26} />,
  flame: <Flame size={26} />,
  hammer: <Hammer size={26} />,
  paintbrush: <Paintbrush size={26} />,
  home: <Home size={26} />,
  ruler: <Ruler size={26} />,
  sprout: <Sprout size={26} />,
  sparkles: <Sparkles size={26} />,
  wrench: <Wrench size={26} />,
  snowflake: <Snowflake size={26} />,
  settings: <Settings size={26} />,
};

interface DetailsStepProps {
  formData: JobFormData;
  setFormData: React.Dispatch<React.SetStateAction<JobFormData>>;
  properties: Property[];
  loadingProperties: boolean;
  validationErrors: Record<string, string>;
  uploadedImageUrls: string[];
  onNavigateToAddProperty: () => void;
}

const sectionLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--me-ink)',
  marginBottom: 10,
};

export function DetailsStep({
  formData,
  setFormData,
  properties,
  loadingProperties,
  validationErrors,
  uploadedImageUrls,
  onNavigateToAddProperty,
}: DetailsStepProps) {
  const descriptionOk = formData.description.length >= 20;

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 28 }}
      data-testid='step-1-details'
    >
      <div>
        <h2 className='t-h2' style={{ marginBottom: 4 }}>
          What do you need done?
        </h2>
        <p className='t-body' style={{ margin: 0 }}>
          Tell us about your project
        </p>
      </div>

      {/* Property Selection */}
      <div>
        <span style={sectionLabelStyle}>Select your property</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loadingProperties ? (
            <div
              style={{
                padding: 16,
                fontSize: 14,
                color: 'var(--me-ink-3)',
              }}
            >
              Loading properties…
            </div>
          ) : properties.length === 0 ? (
            <div
              style={{
                padding: 24,
                border: '2px dashed var(--me-line)',
                borderRadius: 'var(--me-radius-card)',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: 14,
                  color: 'var(--me-ink-2)',
                }}
              >
                No properties found
              </p>
              <button
                type='button'
                onClick={onNavigateToAddProperty}
                style={{
                  background: 'transparent',
                  border: 0,
                  padding: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--me-brand)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Add a property first
              </button>
            </div>
          ) : (
            properties.map((property) => {
              const active = formData.property_id === property.id;
              return (
                <button
                  key={property.id}
                  type='button'
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      property_id: property.id,
                      location: property.address || prev.location,
                    }));
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: 14,
                    borderRadius: 'var(--me-radius-card)',
                    border: `1.5px solid ${
                      active ? 'var(--me-brand)' : 'var(--me-line)'
                    }`,
                    background: active
                      ? 'var(--me-brand-soft)'
                      : 'var(--me-surface)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: 72,
                      height: 72,
                      borderRadius: 'var(--me-radius-input)',
                      overflow: 'hidden',
                      background: 'var(--me-bg-2)',
                      flexShrink: 0,
                    }}
                  >
                    <Image
                      src={property.photos?.[0] || '/placeholder-property.svg'}
                      alt={property.property_name || 'Property'}
                      fill
                      style={{ objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-property.svg';
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 600,
                        color: 'var(--me-ink)',
                      }}
                    >
                      {property.property_name || 'Unnamed Property'}
                    </h3>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: 13,
                        color: 'var(--me-ink-2)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {property.address}
                    </p>
                  </div>
                  {active && (
                    <CheckCircle2
                      className='w-6 h-6'
                      style={{ color: 'var(--me-brand)', flexShrink: 0 }}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Service Category */}
      <div>
        <span style={sectionLabelStyle}>What type of service do you need?</span>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 12,
          }}
        >
          {SERVICE_CATEGORIES.map((category) => {
            const active = formData.category === category.value;
            return (
              <button
                key={category.value}
                type='button'
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    category: category.value,
                  }))
                }
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 20,
                  borderRadius: 'var(--me-radius-card)',
                  border: `1.5px solid ${
                    active ? 'var(--me-brand)' : 'var(--me-line)'
                  }`,
                  background: active
                    ? 'var(--me-brand-soft)'
                    : 'var(--me-surface)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ marginBottom: 8, color: 'var(--me-brand)' }}>
                  {ICON_MAP[category.icon]}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--me-ink)',
                    textAlign: 'center',
                  }}
                >
                  {category.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Job Title */}
      <div>
        <label htmlFor='job-title' style={sectionLabelStyle}>
          Give your job a title
        </label>
        <input
          id='job-title'
          type='text'
          className='field'
          placeholder='e.g., Fix leaking kitchen sink'
          value={formData.title}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, title: e.target.value }))
          }
        />
      </div>

      {/* Description — minimum 20 chars, matching the canonical
          createJobRequestSchema in packages/api-contracts/jobs.ts. */}
      <div>
        <label htmlFor='job-description' style={sectionLabelStyle}>
          Describe the work needed
        </label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            marginBottom: 8,
            color: descriptionOk ? 'var(--me-ok-fg)' : 'var(--me-ink-3)',
            fontWeight: descriptionOk ? 600 : 400,
          }}
        >
          {descriptionOk ? (
            <>
              <CheckCircle2 className='w-4 h-4' />
              Description is detailed enough ({formData.description.length}
              /5000)
            </>
          ) : (
            <>
              Minimum 20 characters ({formData.description.length}/20 —{' '}
              {20 - formData.description.length} more needed)
            </>
          )}
        </div>
        <textarea
          id='job-description'
          className='field'
          rows={5}
          placeholder='Please provide details about what needs to be done…'
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              description: e.target.value,
            }))
          }
          style={{
            resize: 'none',
            borderColor: validationErrors.description
              ? 'var(--me-err-fg)'
              : undefined,
          }}
        />
        {validationErrors.description && (
          <p
            role='alert'
            style={{
              margin: '8px 0 0',
              fontSize: 13,
              color: 'var(--me-err-fg)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <AlertCircle className='w-4 h-4' />
            {validationErrors.description}
          </p>
        )}
      </div>

      {/* Smart Job Analysis — AI suggestions based on description.
          Legacy component, palette-mapped via the page's
          .me-legacy-fit wrapper. */}
      <SmartJobAnalysis
        title={formData.title}
        description={formData.description}
        location={formData.location}
        imageUrls={uploadedImageUrls}
        onCategorySelect={(category) =>
          setFormData((prev) => ({ ...prev, category }))
        }
        onBudgetSelect={(budget) =>
          setFormData((prev) => ({ ...prev, budget: budget.toString() }))
        }
        onUrgencySelect={(urgency) =>
          setFormData((prev) => ({ ...prev, urgency }))
        }
      />

      {/* R6 #19 landlord / tenancy questions */}
      <TenancyFields formData={formData} setFormData={setFormData} />
    </div>
  );
}
