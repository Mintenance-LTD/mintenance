'use client';

import React from 'react';
import {
  MapPin,
  Navigation,
  MapPinned,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  useLocationPrompt,
  type LocationPromptModalProps,
} from './useLocationPrompt';

export function LocationPromptModal(props: LocationPromptModalProps) {
  const {
    isOpen = false,
    onClose = () => {},
    onLocationSet = () => {},
    contractorId = '',
  } = props || {};
  const {
    isLoadingGeo,
    isLoadingManual,
    showManualForm,
    setShowManualForm,
    error,
    setError,
    manualAddress,
    setManualAddress,
    handleUseCurrentLocation,
    handleManualSubmit,
  } = useLocationPrompt({ isOpen, onClose, onLocationSet, contractorId });
  // Don't render if not open
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fadeIn'
        onClick={onClose}
        aria-hidden='true'
      />

      {/* Modal */}
      <div
        data-theme='mint-editorial'
        className='fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none'
        style={{ fontFamily: 'var(--me-font-body)' }}
      >
        <div
          className='rounded-2xl max-w-md w-full pointer-events-auto animate-slideUp'
          style={{
            background: 'var(--me-surface)',
            boxShadow: 'var(--me-shadow-pop)',
          }}
          onClick={(e) => e.stopPropagation()}
          role='dialog'
          aria-modal='true'
          aria-labelledby='location-modal-title'
        >
          {/* Header */}
          <div
            className='relative px-6 pt-6 pb-4'
            style={{ borderBottom: '1px solid var(--me-line)' }}
          >
            <button
              onClick={onClose}
              className='absolute top-4 right-4 p-2 rounded-lg transition-colors'
              style={{ color: 'var(--me-ink-3)' }}
              aria-label='Close modal'
            >
              <X className='w-5 h-5' />
            </button>

            <div className='flex items-center gap-4'>
              <div
                className='w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0'
                style={{ background: 'var(--me-brand-soft)' }}
              >
                <MapPin
                  className='w-7 h-7'
                  style={{ color: 'var(--me-brand)' }}
                />
              </div>
              <div>
                <h2
                  id='location-modal-title'
                  className='text-2xl font-bold'
                  style={{
                    color: 'var(--me-ink)',
                    fontFamily: 'var(--me-font-display)',
                  }}
                >
                  Set Your Location
                </h2>
                <p
                  className='text-sm mt-1'
                  style={{ color: 'var(--me-ink-2)' }}
                >
                  Get personalized job recommendations near you
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className='px-6 py-6'>
            {/* Error Message */}
            {error && (
              <div
                className='mb-4 p-3 rounded-lg flex items-start gap-3'
                style={{
                  background: 'var(--me-err-bg)',
                  border: '1px solid var(--me-err-bg)',
                }}
              >
                <AlertCircle
                  className='w-5 h-5 flex-shrink-0 mt-0.5'
                  style={{ color: 'var(--me-err-fg)' }}
                />
                <div className='flex-1'>
                  <p className='text-sm' style={{ color: 'var(--me-err-fg)' }}>
                    {error}
                  </p>
                </div>
              </div>
            )}

            {!showManualForm ? (
              <>
                {/* Benefits List */}
                <div className='mb-6 space-y-3'>
                  <div className='flex items-start gap-3'>
                    <div
                      className='w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'
                      style={{ background: 'var(--me-brand-soft)' }}
                    >
                      <svg
                        className='w-4 h-4'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                        style={{ color: 'var(--me-brand)' }}
                      >
                        <path
                          fillRule='evenodd'
                          d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </div>
                    <p className='text-sm' style={{ color: 'var(--me-ink-2)' }}>
                      See jobs in your area first
                    </p>
                  </div>
                  <div className='flex items-start gap-3'>
                    <div
                      className='w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'
                      style={{ background: 'var(--me-brand-soft)' }}
                    >
                      <svg
                        className='w-4 h-4'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                        style={{ color: 'var(--me-brand)' }}
                      >
                        <path
                          fillRule='evenodd'
                          d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </div>
                    <p className='text-sm' style={{ color: 'var(--me-ink-2)' }}>
                      Filter by distance from your location
                    </p>
                  </div>
                  <div className='flex items-start gap-3'>
                    <div
                      className='w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'
                      style={{ background: 'var(--me-brand-soft)' }}
                    >
                      <svg
                        className='w-4 h-4'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                        style={{ color: 'var(--me-brand)' }}
                      >
                        <path
                          fillRule='evenodd'
                          d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </div>
                    <p className='text-sm' style={{ color: 'var(--me-ink-2)' }}>
                      Better match with local homeowners
                    </p>
                  </div>
                </div>

                {/* Primary Action - Use Current Location */}
                <button
                  onClick={handleUseCurrentLocation}
                  disabled={isLoadingGeo}
                  className='w-full py-3.5 px-4 rounded-xl font-semibold transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
                  style={{
                    background:
                      'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
                    color: 'var(--me-on-brand)',
                    boxShadow: 'var(--me-shadow-btn)',
                  }}
                >
                  {isLoadingGeo ? (
                    <>
                      <Loader2 className='w-5 h-5 animate-spin' />
                      Getting Your Location...
                    </>
                  ) : (
                    <>
                      <Navigation className='w-5 h-5' />
                      Use My Current Location
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className='relative my-4'>
                  <div className='absolute inset-0 flex items-center'>
                    <div
                      className='w-full'
                      style={{ borderTop: '1px solid var(--me-line)' }}
                    />
                  </div>
                  <div className='relative flex justify-center text-sm'>
                    <span
                      className='px-3'
                      style={{
                        background: 'var(--me-surface)',
                        color: 'var(--me-ink-3)',
                      }}
                    >
                      or
                    </span>
                  </div>
                </div>

                {/* Secondary Action - Manual Entry */}
                <button
                  onClick={() => setShowManualForm(true)}
                  className='w-full py-3.5 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2'
                  style={{
                    background: 'var(--me-surface)',
                    border: '2px solid var(--me-line)',
                    color: 'var(--me-ink-2)',
                  }}
                >
                  <MapPinned className='w-5 h-5' />
                  Enter Address Manually
                </button>
              </>
            ) : (
              <>
                {/* Manual Address Form */}
                <form onSubmit={handleManualSubmit}>
                  <div className='mb-4'>
                    <label
                      htmlFor='manual-address'
                      className='block text-sm font-medium mb-2'
                      style={{ color: 'var(--me-ink-2)' }}
                    >
                      Enter your address or postcode
                    </label>
                    <input
                      id='manual-address'
                      type='text'
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder='e.g., SW1A 1AA or 10 Downing Street, London'
                      className='w-full px-4 py-3 rounded-lg transition-all'
                      style={{
                        background: 'var(--me-surface)',
                        border: '1px solid var(--me-line)',
                        color: 'var(--me-ink)',
                      }}
                      disabled={isLoadingManual}
                      autoFocus
                    />
                  </div>

                  <div className='flex gap-3'>
                    <button
                      type='button'
                      onClick={() => {
                        setShowManualForm(false);
                        setManualAddress('');
                        setError(null);
                      }}
                      className='flex-1 py-3 px-4 rounded-lg font-semibold transition-colors'
                      style={{
                        background: 'var(--me-bg-2)',
                        color: 'var(--me-ink-2)',
                      }}
                      disabled={isLoadingManual}
                    >
                      Back
                    </button>
                    <button
                      type='submit'
                      disabled={isLoadingManual || !manualAddress.trim()}
                      className='flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                      style={{
                        background:
                          'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
                        color: 'var(--me-on-brand)',
                        boxShadow: 'var(--me-shadow-btn)',
                      }}
                    >
                      {isLoadingManual ? (
                        <>
                          <Loader2 className='w-5 h-5 animate-spin' />
                          Saving...
                        </>
                      ) : (
                        'Save Location'
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          {/* Footer */}
          <div
            className='px-6 py-4 rounded-b-2xl'
            style={{
              background: 'var(--me-bg-2)',
              borderTop: '1px solid var(--me-line)',
            }}
          >
            <button
              onClick={() => {
                localStorage.setItem('location-prompt-dismissed', 'true');
                onClose();
              }}
              className='w-full text-sm font-medium transition-colors'
              style={{ color: 'var(--me-ink-2)' }}
            >
              Skip for now
            </button>
            <p
              className='text-xs text-center mt-2'
              style={{ color: 'var(--me-ink-3)' }}
            >
              You can always set your location later in settings
            </p>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 200ms ease-out;
        }

        .animate-slideUp {
          animation: slideUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </>
  );
}

export default LocationPromptModal;
