'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import {
  PenTool,
  RotateCcw,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { Contract } from './useContractData';
import {
  ContractConsentChoices,
  emptyConsent,
  type ConsentChoices,
} from '@/components/legal/ContractConsentChoices';
import { CUSTOMER_TERMS_VERSION } from '@mintenance/shared';
import { ContractCancellation } from '@/components/legal/ContractCancellation';

interface ContractActionsProps {
  contract: Contract;
  userRole: 'homeowner' | 'contractor';
  isDraft: boolean;
  canSign: boolean | null | undefined;
  canDelete: boolean | null | undefined;
  isSigning: boolean;
  isRejecting: boolean;
  isDeleting: boolean;
  showRejectForm: boolean;
  rejectReason: string;
  error: string | null;
  onSign: (
    consent: ConsentChoices & {
      termsVersion: string;
      expectedUpdatedAt: string;
      expectedReviewToken: string;
    }
  ) => void;
  onReject: () => void;
  onDelete: () => void;
  onDownloadPdf: () => void;
  onShowRejectForm: (show: boolean) => void;
  onRejectReasonChange: (reason: string) => void;
}

export function ContractActions({
  contract,
  userRole,
  isDraft,
  canSign,
  canDelete,
  isSigning,
  isRejecting,
  isDeleting,
  showRejectForm,
  rejectReason,
  error,
  onSign,
  onReject,
  onDelete,
  onDownloadPdf,
  onShowRejectForm,
  onRejectReasonChange,
}: ContractActionsProps) {
  // Hydration-safe theme detection — swap Sign-button gradient
  // for canonical `.btn-primary` on editorial.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  const [consent, setConsent] = useState(emptyConsent);
  useEffect(
    () => setConsent(emptyConsent),
    [contract.id, contract.updated_at, contract.review_token]
  );
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  const legacyReview =
    userRole === 'homeowner' &&
    contract.status === 'accepted' &&
    !contract.cancellation_deadline;
  return (
    <>
      {(canSign || legacyReview) && (
        <ContractConsentChoices
          value={consent}
          onChange={setConsent}
          homeowner={userRole === 'homeowner'}
        />
      )}
      {userRole === 'homeowner' && !isDraft && (
        <ContractCancellation contractId={contract.id} />
      )}
      {legacyReview && (
        <p className='text-sm'>
          This older agreement needs cancellation information before work
          starts. Recording your choices provides a fresh 14-day review period
          from today; it does not change the original agreement date.
        </p>
      )}
      {/* Actions Bar */}
      {!isDraft && (
        <div className='flex items-center gap-2 justify-end'>
          <button
            onClick={onDownloadPdf}
            className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200'
            type='button'
          >
            <Download className='w-3.5 h-3.5' /> Download PDF
          </button>
          {canDelete && (
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 disabled:opacity-50'
              type='button'
            >
              <Trash2 className='w-3.5 h-3.5' />{' '}
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      )}

      {/* Draft Banner */}
      {isDraft && (
        <div className='bg-blue-50/80 border border-blue-100 rounded-xl p-4 flex items-start gap-3'>
          <AlertCircle className='w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5' />
          <p className='text-sm text-blue-700'>
            {userRole === 'homeowner'
              ? "The contractor is preparing the contract details. You'll be notified when it's ready for review."
              : 'This is a draft. Use "Prepare Contract" to fill in the details and send it to the homeowner.'}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className='bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3'>
          <AlertCircle className='w-5 h-5 text-red-500 flex-shrink-0' />
          <p className='text-sm text-red-700'>{error}</p>
        </div>
      )}

      {/* Sign / Request Changes Buttons */}
      {(canSign || legacyReview) && !isDraft && (
        <div className='space-y-3'>
          <button
            onClick={() =>
              onSign({
                ...consent,
                termsVersion: CUSTOMER_TERMS_VERSION,
                expectedUpdatedAt: contract.updated_at,
                expectedReviewToken: contract.review_token,
              })
            }
            disabled={isSigning || isRejecting || !consent.termsAccepted}
            className={
              isMintEditorial
                ? 'btn btn-primary'
                : 'w-full py-3.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2'
            }
            style={
              isMintEditorial
                ? { width: '100%', justifyContent: 'center' }
                : undefined
            }
            type='button'
          >
            {isSigning ? (
              <>
                <Icon name='loader' size={20} color='white' /> Signing...
              </>
            ) : (
              <>
                <PenTool className='w-5 h-5' />{' '}
                {legacyReview
                  ? 'Record cancellation choices for this agreement'
                  : 'Sign Contract'}
              </>
            )}
          </button>
          {userRole === 'homeowner' &&
            contract.status === 'pending_homeowner' && (
              <>
                {!showRejectForm ? (
                  <button
                    onClick={() => onShowRejectForm(true)}
                    disabled={isSigning || isRejecting}
                    className='w-full py-3 px-4 border border-gray-200 hover:border-amber-300 hover:bg-amber-50 text-gray-600 hover:text-amber-700 font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-sm'
                    type='button'
                  >
                    <RotateCcw className='w-4 h-4' /> Request Changes
                  </button>
                ) : (
                  <div className='border border-amber-200 bg-amber-50/50 rounded-xl p-4 space-y-3'>
                    <p className='text-sm font-medium text-amber-800'>
                      What changes would you like?
                    </p>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => onRejectReasonChange(e.target.value)}
                      placeholder="Describe the changes you'd like the contractor to make..."
                      className='w-full border border-amber-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none'
                      rows={3}
                    />
                    <div className='flex gap-2 justify-end'>
                      <button
                        onClick={() => {
                          onShowRejectForm(false);
                          onRejectReasonChange('');
                        }}
                        className='px-4 py-2 text-sm text-gray-500 hover:text-gray-700'
                        type='button'
                      >
                        Cancel
                      </button>
                      <button
                        onClick={onReject}
                        disabled={isRejecting}
                        className='px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5'
                        type='button'
                      >
                        {isRejecting ? (
                          <>
                            <Icon name='loader' size={16} color='white' />{' '}
                            Sending...
                          </>
                        ) : (
                          <>
                            <RotateCcw className='w-3.5 h-3.5' /> Send Back to
                            Contractor
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
        </div>
      )}

      {/* Accepted */}
      {contract.status === 'accepted' && (
        <div className='bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-center gap-2'>
          <CheckCircle2 className='w-5 h-5 text-emerald-600' />
          <p className='text-sm font-medium text-emerald-700'>
            Contract executed — both parties have signed.
          </p>
        </div>
      )}
    </>
  );
}
