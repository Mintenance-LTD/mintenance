'use client';

/**
 * Example: How to integrate JobDetailsDialog in the bid page
 * 
 * This shows how to add the dialog to apps/web/app/contractor/bid/page.tsx
 */

import { JobDetailsDialog } from '@/components/jobs/JobDetailsDialog';
import { Button } from '@/components/ui/Button';

// Example integration in your job list rendering:
export function ExampleJobListIntegration() {
  const [jobs, setJobs] = useState<Job[]>([]);
  
  const handleBidSubmit = async (jobId: string, amount: number) => {
    try {
      const response = await fetch('/api/contractor/bids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: jobId,
          amount: amount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit bid');
      }

      // Refresh jobs list
      // ... your refresh logic
    } catch (error) {
      console.error('Error submitting bid:', error);
      throw error; // Re-throw to let dialog handle it
    }
  };

  return (
    <div className="grid gap-4">
      {jobs.map((job) => {
        const existingBid = allBids.find((b) => b.job_id === job.id);
        
        return (
          <div key={job.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold">{job.title}</h3>
                <p className="text-sm text-gray-600">{job.location}</p>
                <p className="text-sm font-medium mt-2">
                  Budget: {job.budget ? `£${parseFloat(job.budget).toLocaleString()}` : 'Not specified'}
                </p>
              </div>
              
              {/* Use JobDetailsDialog instead of inline details */}
              <JobDetailsDialog
                job={{
                  id: job.id,
                  title: job.title,
                  description: job.description,
                  budget: job.budget,
                  location: job.location,
                  category: job.category,
                  status: job.status,
                  createdAt: job.createdAt,
                  postedBy: job.postedBy,
                }}
                onBid={handleBidSubmit}
                existingBid={existingBid ? {
                  amount: existingBid.amount,
                  status: existingBid.status,
                } : undefined}
                trigger={
                  <Button variant="outline" size="sm">
                    View Details {existingBid && '& Bid'}
                  </Button>
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Import statements needed:
import { useState } from 'react';

interface Job {
  id: string;
  title: string;
  description?: string;
  budget?: string;
  location?: string;
  category?: string;
  status: string;
  createdAt: string;
  postedBy?: {
    name: string;
  };
}

interface BidWithJob {
  id: string;
  job_id: string;
  amount: number;
  status: string;
}

// This is just an example - don't use this file directly
// Instead, integrate the pattern into your actual bid page

