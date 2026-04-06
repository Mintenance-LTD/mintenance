'use client';

import React from 'react';
import { Badge, Button } from '@/components/airbnb-system';
import {
  Calendar,
  Edit3,
  CheckCircle,
  MessageCircle,
  TrendingUp,
} from 'lucide-react';
import { formatMoney } from '@/lib/utils/currency';
import {
  JobDetailsAirbnbJob,
  JobDetailsAirbnbBid,
  getStatusBadgeVariant,
  formatDate,
} from './types';

interface SidebarProps {
  job: JobDetailsAirbnbJob;
  bids: JobDetailsAirbnbBid[];
  userRole: 'homeowner' | 'contractor';
  isOwner: boolean;
  onEdit?: () => void;
  onComplete?: () => void;
  onContact?: () => void;
}

export function Sidebar({
  job,
  bids,
  userRole,
  isOwner,
  onEdit,
  onComplete,
  onContact,
}: SidebarProps) {
  return (
    <div className="lg:col-span-1">
      <div className="sticky top-8 space-y-6">
        {/* Budget Card */}
        <div className="card-airbnb p-6 shadow-lg">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold text-gray-900">
              {formatMoney(job.budget, 'GBP')}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-6">Total budget</p>

          {/* Action Buttons */}
          <div className="space-y-3">
            {isOwner && onEdit && (
              <Button
                variant="secondary"
                fullWidth
                size="lg"
                onClick={onEdit}
                className="flex items-center justify-center gap-2"
              >
                <Edit3 className="w-5 h-5" />
                Edit Job
              </Button>
            )}

            {isOwner && onComplete && job.status === 'in_progress' && (
              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={onComplete}
                className="flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Mark Complete
              </Button>
            )}

            {!isOwner && userRole === 'contractor' && job.status === 'posted' && (
              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={() => window.location.href = `/contractor/bid/${job.id}`}
              >
                Submit Bid
              </Button>
            )}

            {onContact && !isOwner && (
              <Button
                variant="secondary"
                fullWidth
                size="lg"
                onClick={onContact}
                className="flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Contact Homeowner
              </Button>
            )}
          </div>
        </div>

        {/* Schedule Card */}
        {(job.scheduledStartDate || job.scheduledEndDate) && (
          <div className="card-airbnb p-6">
            <h3 className="font-bold text-gray-900 mb-4">Schedule</h3>
            <div className="space-y-3">
              {job.scheduledStartDate && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Start Date</div>
                    <div className="font-semibold text-gray-900">
                      {formatDate(job.scheduledStartDate)}
                    </div>
                  </div>
                </div>
              )}
              {job.scheduledEndDate && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">End Date</div>
                    <div className="font-semibold text-gray-900">
                      {formatDate(job.scheduledEndDate)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Card */}
        <div className="card-airbnb p-6 bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-100">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-8 h-8 text-teal-600" />
            <h3 className="font-bold text-gray-900">Job Stats</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Views</span>
              <span className="font-semibold text-gray-900">0</span>
            </div>
            {bids.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Bids</span>
                <span className="font-semibold text-gray-900">{bids.length}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <Badge variant={getStatusBadgeVariant(job.status)} size="sm">
                {job.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>

        {/* Help Card */}
        <div className="card-airbnb p-6 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <MessageCircle className="w-6 h-6 text-gray-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
          <p className="text-sm text-gray-600 mb-4">
            Our support team is here to assist you
          </p>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => window.location.href = '/contact'}
          >
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}
