'use client';

import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LoadingSpinner } from '@/components/ui';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { Briefcase, TrendingUp, Clock, PoundSterling, AlertCircle, ArrowRight } from 'lucide-react';
import { logger } from '@mintenance/shared';

interface ActiveBid {
  id: string;
  job_id: string;
  amount: number; // API returns 'amount' not 'bid_amount'
  status: string;
  created_at: string;
  jobs: { // API returns 'jobs' not 'job'
    id: string;
    title: string;
    description: string;
    budget: number;
    location: string;
    category: string;
    status: string;
    homeowner: {
      first_name: string;
      last_name: string;
      profile_image_url?: string;
    };
  };
}

export default function ContractorBidsOverviewPage() {
  const router = useRouter();
  const { user, loading: loadingUser } = useCurrentUser();
  const [activeBids, setActiveBids] = useState<ActiveBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBids: 0,
    pendingBids: 0,
    acceptedBids: 0,
    totalValue: 0
  });

  useEffect(() => {
    const fetchActiveBids = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/contractor/bids');
        if (!response.ok) throw new Error('Failed to fetch bids');

        const data = await response.json();

        // Process bids
        const bidsWithJobs = data.bids || [];
        setActiveBids(bidsWithJobs);

        // Calculate stats
        const stats = {
          totalBids: bidsWithJobs.length,
          pendingBids: bidsWithJobs.filter((b: ActiveBid) => b.status === 'pending').length,
          acceptedBids: bidsWithJobs.filter((b: ActiveBid) => b.status === 'accepted').length,
          totalValue: bidsWithJobs.reduce((sum: number, b: ActiveBid) => sum + (b.amount || 0), 0)
        };
        setStats(stats);

      } catch (error) {
        logger.error('Error fetching bids:', error, { service: 'app' });
        toast.error('Failed to load your bids');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveBids();
  }, [user]);

  if (loadingUser || loading) {
    return <LoadingSpinner fullScreen message="Loading your bids..." />;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ErrorBoundary>
    <ContractorPageWrapper>
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center">
              <Briefcase className="w-9 h-9 text-teal-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Bids</h1>
              <p className="text-gray-600">Track and manage your active bids</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/contractor/discover')}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
          >
            Find New Jobs
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Total Bids</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBids}</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingBids}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Accepted</p>
                <p className="text-2xl font-bold text-gray-900">{stats.acceptedBids}</p>
              </div>
            </div>
          </div>
          <div className="bg-teal-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <PoundSterling className="w-5 h-5 text-teal-600" />
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">£{stats.totalValue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Bids List */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Active Bids</h2>

        {activeBids.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Bids</h3>
            <p className="text-gray-600 mb-6">You haven't placed any bids yet</p>
            <button
              onClick={() => router.push('/contractor/discover')}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Browse Available Jobs
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeBids.map((bid) => (
              <MotionDiv
                key={bid.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/contractor/bid/${bid.job_id}`)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      {bid.jobs?.homeowner?.profile_image_url ? (
                        <img
                          src={bid.jobs.homeowner.profile_image_url}
                          alt={`${bid.jobs.homeowner.first_name} ${bid.jobs.homeowner.last_name}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-lg font-medium text-gray-600">
                            {bid.jobs?.homeowner?.first_name?.charAt(0) || 'H'}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {bid.jobs?.title || 'Untitled Job'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {(bid.jobs?.description || '').substring(0, 150)}...
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>📍 {bid.jobs?.location || 'Unknown'}</span>
                          <span>💼 {bid.jobs?.category || 'General'}</span>
                          <span>👤 {bid.jobs?.homeowner?.first_name} {bid.jobs?.homeowner?.last_name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-6">
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 ${getStatusColor(bid.status)}`}>
                      {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">Your Bid</div>
                    <div className="text-2xl font-bold text-gray-900">
                      £{bid.amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Budget: £{(bid.jobs?.budget || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Submitted {new Date(bid.created_at).toLocaleDateString('en-GB')}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/contractor/bid/${bid.job_id}`);
                    }}
                    className="text-teal-600 hover:text-teal-700 font-medium text-sm"
                  >
                    View Details →
                  </button>
                </div>
              </MotionDiv>
            ))}
          </div>
        )}
      </div>
    </ContractorPageWrapper>
    </ErrorBoundary>
  );
}