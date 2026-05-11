/**
 * Server-side wrapper for the Mint Editorial /jobs/[id] view.
 *
 * Page-level page.tsx composes all the data (job, property,
 * contractor, bids, photos, lifecycle state) and hands it to this
 * component, which decides what to render on the Mint Editorial side
 * of the theme branch. Pulled out of page.tsx to keep that file
 * under the 500-line MDC cap.
 */
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { JobViewTracker } from '../JobViewTracker';
import { ContractManagement } from '../ContractManagement';
import { HomeownerPhotoReview } from '../HomeownerPhotoReview';
import { MintEditorialJobDetail } from './MintEditorialJobDetail';
import type { Bid } from '../BidCard';
import type {
  ContractorShape,
  JobShape,
  PropertyShape,
} from './MintEditorialJobCards';

interface PhotoRecord {
  id: string;
  photo_url: string;
}

interface Props {
  job: JobShape & {
    completion_confirmed_by_homeowner?: boolean | null;
  };
  property: PropertyShape | null | undefined;
  contractor: ContractorShape | null | undefined;
  bids: Bid[];
  bidCount: number;
  pendingBidCount: number;
  photos: string[];
  beforePhotos: PhotoRecord[];
  afterPhotos: PhotoRecord[];
  contractStatus: string | null | undefined;
  escrowStatus: string | null | undefined;
  userId: string;
}

export function MintEditorialJobDetailView({
  job,
  property,
  contractor,
  bids,
  bidCount,
  pendingBidCount,
  photos,
  beforePhotos,
  afterPhotos,
  contractStatus,
  escrowStatus,
  userId,
}: Props) {
  const completionConfirmed = !!job.completion_confirmed_by_homeowner;
  return (
    <>
      <JobViewTracker jobId={job.id} />
      <HomeownerPageWrapper>
        <MintEditorialJobDetail
          job={job}
          property={property}
          contractor={contractor}
          bids={bids}
          photos={photos}
          lifecycle={{
            contractStatus,
            escrowStatus,
            bidCount,
            pendingBidCount,
            completionConfirmed,
          }}
        />
        {/* Below-the-fold interactive panels reuse the legacy
            components — they handle real API mutations (sign contract,
            confirm completion) that we don't want to re-implement in
            this slice. */}
        <div style={{ marginTop: 24 }}>
          {job.status === 'completed' && afterPhotos.length > 0 && (
            <div id='photo-review'>
              <HomeownerPhotoReview
                jobId={job.id}
                beforePhotos={beforePhotos}
                afterPhotos={afterPhotos}
                isConfirmed={completionConfirmed}
              />
            </div>
          )}
          {job.contractor_id && (
            <div id='contract-section' style={{ marginTop: 18 }}>
              <ContractManagement
                jobId={job.id}
                userRole='homeowner'
                userId={userId}
              />
            </div>
          )}
        </div>
      </HomeownerPageWrapper>
    </>
  );
}
