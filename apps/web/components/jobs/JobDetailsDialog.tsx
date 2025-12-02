'use client';

import React, { useState } from 'react';
import { logger } from '@mintenance/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/Badge.unified';
import { Icon } from '@/components/ui/Icon';
import { formatMoney } from '@/lib/utils/currency';

interface Job {
  id: string;
  title: string;
  description?: string;
  budget?: string;
  location?: string;
  category?: string;
  status: string;
  createdAt: string;
  photos?: string[];
  postedBy?: {
    name: string;
  };
}

interface JobDetailsDialogProps {
  job: Job;
  trigger?: React.ReactNode;
  onBid?: (jobId: string, amount: number) => void | Promise<void>;
  existingBid?: {
    amount: number;
    status: string;
  };
}

/**
 * Job Details Dialog Component
 * Shows full job details in a modal dialog
 */
export function JobDetailsDialog({
  job,
  trigger,
  onBid,
  existingBid,
}: JobDetailsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBid = async () => {
    if (!bidAmount || !onBid) return;

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsSubmitting(true);
    try {
      await onBid(job.id, amount);
      setIsOpen(false);
      setBidAmount('');
    } catch (error) {
      logger.error('Error submitting bid:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColors: Record<string, string> = {
    posted: 'bg-blue-100 text-blue-800',
    assigned: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            View Details
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{job.title}</DialogTitle>
              <DialogDescription>
                Job ID: {job.id.slice(0, 8)}...
              </DialogDescription>
            </div>
            <Badge
              variant={job.status === 'completed' ? 'success' : 'default'}
              className={statusColors[job.status] || 'bg-gray-100 text-gray-800'}
            >
              {job.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Job Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-sm text-gray-600">
                {job.description || 'No description provided.'}
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Budget</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {job.budget ? formatMoney(parseFloat(job.budget), 'GBP') : 'Not specified'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Category</h3>
                <p className="text-sm text-gray-600 capitalize">
                  {job.category || 'General'}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Icon name="mapPin" size={16} />
                Location
              </h3>
              <p className="text-sm text-gray-600">{job.location || 'Location not specified'}</p>
            </div>

            {job.postedBy && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Posted By</h3>
                  <p className="text-sm text-gray-600">{job.postedBy.name}</p>
                </div>
              </>
            )}
          </div>

          {/* Bid Section */}
          {onBid && job.status === 'posted' && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Submit a Bid</h3>
                
                {existingBid ? (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      You have an existing bid: {formatMoney(existingBid.amount, 'GBP')}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Status: {existingBid.status}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700 mb-2">
                        Your Bid Amount (£)
                      </label>
                      <input
                        id="bidAmount"
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <Button
                      onClick={handleBid}
                      variant="primary"
                      disabled={!bidAmount || isSubmitting}
                      loading={isSubmitting}
                      fullWidth
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Bid'}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

