'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';
import {
  Star,
  User,
  Shield,
  CalendarDays,
  Clock,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { formatRelativeDate } from './JobDetailHelpers';
import type { Contractor } from './JobDetailHelpers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/* ==========================================
   TYPE DEFINITIONS
   ========================================== */

interface BidLineItem {
  type: 'labor' | 'material' | 'equipment';
  total: number;
}

/**
 * Per-bid quote breakdown. Populated by submit-bid (writes a row
 * into `contractor_quotes`, FK'd via `bids.quote_id`). 2026-05-13
 * audit: surfaced on the card so the homeowner can see whether the
 * headline amount is VAT-inclusive before comparing bids.
 */
export interface BidQuoteSummary {
  subtotal: number | null;
  taxRate: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  terms: string | null;
  quoteNumber: string | null;
}

export interface Bid {
  id: string;
  amount: number;
  description?: string;
  status: string;
  created_at: string;
  contractor: Contractor;
  lineItems?: BidLineItem[];
  // 2026-05-13 BidCard upgrade — comparison axes the homeowner
  // needs alongside price/rating. Stored on the bid since the
  // 2026-03-20 schema migration; previously never rendered.
  estimatedDurationDays?: number | null;
  proposedStartDate?: string | null;
  warrantyMonths?: number | null;
  materialsIncluded?: boolean | null;
  quote?: BidQuoteSummary | null;
}

/* ==========================================
   BID CARD COMPONENT
   ========================================== */

export function BidCard({ bid, jobId }: { bid: Bid; jobId: string }) {
  const [accepting, setAccepting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // 2026-07-06 audit #8: replaced native confirm()/alert() with accessible
  // Radix dialogs (focus-trapped, Escape-dismissable, screen-reader announced
  // as role="alertdialog"). `feedback` drives the result dialog; the reload
  // side effects that used to follow the blocking alert() now run when that
  // dialog is dismissed.
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    reloadOnDismiss?: boolean;
  } | null>(null);

  const contractorName =
    bid.contractor.company_name ||
    (bid.contractor.first_name && bid.contractor.last_name
      ? `${bid.contractor.first_name} ${bid.contractor.last_name}`
      : bid.contractor.email);

  const performAccept = async () => {
    setAccepting(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const apiUrl = `/api/jobs/${jobId}/bids/${bid.id}/accept`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders,
        },
      });

      if (!response.ok) {
        const data = await response.json();

        // Extract error message from API response (handles both { error: "string" } and { error: { message: "string" } })
        const errorMsg =
          typeof data.error === 'object' && data.error?.message
            ? data.error.message
            : typeof data.error === 'string'
              ? data.error
              : data.message ||
                'An unexpected error occurred. Please try again.';

        // Handle payment setup required (check error message content)
        if (
          errorMsg.includes('payment account setup') ||
          errorMsg.includes('payment setup')
        ) {
          setFeedback({
            title: 'Payment setup required',
            message:
              `This contractor has not completed their payment account setup yet. ` +
              `They need to set up their Stripe Connect account to receive payments before you can accept their bid.\n\n` +
              `What to do:\n` +
              `- Contact the contractor and ask them to complete payment setup\n` +
              `- Or choose a different contractor who has completed payment setup`,
          });
        } else if (response.status === 409) {
          setFeedback({
            title: 'Bid already accepted',
            message:
              'A bid has already been accepted for this job. The page will refresh so you can see the latest status.',
            reloadOnDismiss: true,
          });
        } else if (response.status === 403) {
          setFeedback({ title: 'Access denied', message: errorMsg });
        } else if (response.status === 404) {
          setFeedback({
            title: 'Bid not found',
            message: errorMsg,
            reloadOnDismiss: true,
          });
        } else {
          setFeedback({ title: 'Could not accept bid', message: errorMsg });
        }

        setAccepting(false);
        return;
      }

      await response.json();

      // Success \u2014 announce, then reload when the dialog is dismissed. Keep
      // `accepting` true so the button stays disabled through the reload.
      setFeedback({
        title: 'Bid accepted',
        message: 'The contractor has been notified.',
        reloadOnDismiss: true,
      });
    } catch (error) {
      logger.error('Error accepting bid:', error, { service: 'ui' });
      setFeedback({
        title: 'Could not accept bid',
        message: `${
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred. Please try again.'
        }\n\nIf this problem persists, please refresh the page and try again.`,
      });
      setAccepting(false);
    }
  };

  // Fires once when the feedback dialog closes (OK, Escape, or overlay),
  // running the reload side effect that used to follow the blocking alert().
  const handleFeedbackClose = (open: boolean) => {
    if (open) return;
    const shouldReload = feedback?.reloadOnDismiss;
    setFeedback(null);
    if (shouldReload) {
      window.location.reload();
    }
  };

  return (
    <div className='p-6 border border-gray-200 rounded-xl hover:border-teal-300 hover:shadow-md transition-all'>
      <div className='flex items-start justify-between gap-4 mb-4'>
        <div className='flex items-start gap-3 flex-1'>
          {/* Avatar */}
          {bid.contractor.profile_image_url ? (
            <div className='relative w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0'>
              <Image
                src={bid.contractor.profile_image_url}
                alt={contractorName}
                fill
                className='object-cover'
                sizes='48px'
              />
            </div>
          ) : (
            <div className='w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center border-2 border-gray-200 flex-shrink-0'>
              <User className='w-6 h-6 text-teal-600' />
            </div>
          )}

          {/* Contractor Info */}
          <div className='flex-1'>
            <div className='flex items-center gap-2 mb-1'>
              <h4 className='font-semibold text-gray-900'>{contractorName}</h4>
              {bid.contractor.admin_verified && (
                <Shield className='w-4 h-4 text-teal-600' />
              )}
            </div>
            {/* Rating + reviews line — shows quality signal alongside price
                so the homeowner can weigh the bid before accepting.
                Falls back to "New on Mintenance" when the contractor
                hasn't completed a reviewed job yet. */}
            {bid.contractor.rating != null && bid.contractor.rating > 0 ? (
              <div className='flex items-center gap-1.5 mb-1 text-sm'>
                <Star className='w-4 h-4 fill-amber-400 text-amber-400' />
                <span className='font-semibold text-gray-900'>
                  {bid.contractor.rating.toFixed(1)}
                </span>
                <span className='text-gray-500'>
                  ({bid.contractor.reviews_count ?? 0}{' '}
                  {bid.contractor.reviews_count === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            ) : (
              <div className='flex items-center gap-1 mb-1 text-sm text-teal-700'>
                <Star className='w-3.5 h-3.5 text-teal-600' />
                <span>New on Mintenance</span>
              </div>
            )}
            <p className='text-sm text-gray-600'>
              Bid submitted {formatRelativeDate(bid.created_at)}
            </p>
          </div>
        </div>

        {/* Bid Amount */}
        <div className='text-right'>
          <div className='text-2xl font-bold text-gray-900'>
            £{bid.amount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Description */}
      {bid.description &&
        !bid.description.toLowerCase().includes('ffff') &&
        !bid.description.toLowerCase().includes('lorem') &&
        bid.description.trim().length > 5 && (
          <p className='text-gray-700 text-sm mb-4 line-clamp-3'>
            {bid.description}
          </p>
        )}
      {(!bid.description ||
        bid.description.toLowerCase().includes('ffff') ||
        bid.description.toLowerCase().includes('lorem') ||
        bid.description.trim().length <= 5) && (
        <p className='text-gray-500 text-sm mb-4 italic'>
          No description provided
        </p>
      )}

      {/* Cost Breakdown - Labor vs Materials vs Equipment */}
      {bid.lineItems &&
        bid.lineItems.length > 0 &&
        (() => {
          const laborTotal = bid.lineItems
            .filter((item) => item.type === 'labor')
            .reduce((sum, item) => sum + item.total, 0);
          const materialTotal = bid.lineItems
            .filter((item) => item.type === 'material')
            .reduce((sum, item) => sum + item.total, 0);
          const equipmentTotal = bid.lineItems
            .filter((item) => item.type === 'equipment')
            .reduce((sum, item) => sum + item.total, 0);

          return laborTotal > 0 || materialTotal > 0 || equipmentTotal > 0 ? (
            <div className='mb-4 flex gap-4 flex-wrap text-sm text-gray-600'>
              {laborTotal > 0 && (
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 rounded-full bg-blue-500' />
                  <span>Labor: £{laborTotal.toFixed(2)}</span>
                </div>
              )}
              {materialTotal > 0 && (
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 rounded-full bg-amber-500' />
                  <span>Materials: £{materialTotal.toFixed(2)}</span>
                </div>
              )}
              {equipmentTotal > 0 && (
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 rounded-full bg-emerald-500' />
                  <span>Equipment: £{equipmentTotal.toFixed(2)}</span>
                </div>
              )}
            </div>
          ) : null;
        })()}

      {/* Schedule + warranty + materials chips. Renders only when at
          least one comparison axis is present — keeps the card tidy
          for sparse bids. 2026-05-13: previously these fields were
          stored on the bid but never surfaced on the homeowner UI. */}
      {(bid.proposedStartDate ||
        (typeof bid.estimatedDurationDays === 'number' &&
          bid.estimatedDurationDays > 0) ||
        (typeof bid.warrantyMonths === 'number' && bid.warrantyMonths > 0) ||
        bid.materialsIncluded === true) && (
        <div className='mb-4 flex flex-wrap gap-2'>
          {bid.proposedStartDate && (
            <div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100 text-xs text-gray-700'>
              <CalendarDays className='w-3.5 h-3.5 text-teal-600' />
              <span>
                Start{' '}
                {new Date(bid.proposedStartDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>
          )}
          {typeof bid.estimatedDurationDays === 'number' &&
            bid.estimatedDurationDays > 0 && (
              <div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100 text-xs text-gray-700'>
                <Clock className='w-3.5 h-3.5 text-teal-600' />
                <span>
                  ~{bid.estimatedDurationDays}{' '}
                  {bid.estimatedDurationDays === 1 ? 'day' : 'days'}
                </span>
              </div>
            )}
          {typeof bid.warrantyMonths === 'number' && bid.warrantyMonths > 0 && (
            <div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100 text-xs text-gray-700'>
              <ShieldCheck className='w-3.5 h-3.5 text-teal-600' />
              <span>{bid.warrantyMonths}-month warranty</span>
            </div>
          )}
          {bid.materialsIncluded === true && (
            <div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100 text-xs text-gray-700'>
              <Package className='w-3.5 h-3.5 text-teal-600' />
              <span>Materials included</span>
            </div>
          )}
        </div>
      )}

      {/* VAT breakdown — show only when the contractor explicitly
          declared VAT on the linked quote (tax_rate > 0 + tax_amount
          > 0). Otherwise homeowners are left guessing whether the
          headline `amount` is inclusive or exclusive. */}
      {bid.quote &&
        typeof bid.quote.taxAmount === 'number' &&
        bid.quote.taxAmount > 0 && (
          <div className='mb-4 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-600 space-y-0.5'>
            {typeof bid.quote.subtotal === 'number' && (
              <div className='flex justify-between'>
                <span>Subtotal</span>
                <span>£{bid.quote.subtotal.toLocaleString()}</span>
              </div>
            )}
            <div className='flex justify-between'>
              <span>
                VAT
                {typeof bid.quote.taxRate === 'number' && bid.quote.taxRate > 0
                  ? ` (${bid.quote.taxRate}%)`
                  : ''}
              </span>
              <span>£{bid.quote.taxAmount.toLocaleString()}</span>
            </div>
            {typeof bid.quote.totalAmount === 'number' && (
              <div className='flex justify-between font-semibold text-gray-900 pt-0.5'>
                <span>Total inc. VAT</span>
                <span>£{bid.quote.totalAmount.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

      {/* Actions */}
      <div className='flex gap-3'>
        <Link
          href={`/contractors/${bid.contractor.id}?returnTo=job&jobId=${jobId}&bidId=${bid.id}&bidAmount=${bid.amount}`}
          className={`btn-secondary text-sm ${bid.status === 'pending' ? 'flex-1' : 'inline-block'}`}
        >
          View Profile
        </Link>
        {bid.status === 'pending' && (
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={accepting}
            className='btn-primary text-sm flex-1 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {accepting ? 'Accepting...' : 'Accept Bid'}
          </button>
        )}
      </div>

      {/* Accessible confirmation (replaces window.confirm) */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept this bid?</AlertDialogTitle>
            <AlertDialogDescription>
              Accept {contractorName}&apos;s bid of £
              {bid.amount.toLocaleString()}? The contractor will be notified and
              the other bids on this job will be declined.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performAccept}>
              Accept bid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Accessible result dialog (replaces window.alert) */}
      <AlertDialog open={feedback !== null} onOpenChange={handleFeedbackClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{feedback?.title}</AlertDialogTitle>
            <AlertDialogDescription className='whitespace-pre-line'>
              {feedback?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
