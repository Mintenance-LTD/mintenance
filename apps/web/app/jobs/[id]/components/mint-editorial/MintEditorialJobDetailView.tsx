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

interface PhotoRecordWithDate extends PhotoRecord {
  created_at?: string | null;
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
  beforePhotos: PhotoRecordWithDate[];
  afterPhotos: PhotoRecordWithDate[];
  contractStatus: string | null | undefined;
  /** Raw ISO timestamps from the contract row — let the Timeline tab
   *  reconstruct the actual signing events instead of just showing a
   *  binary "contract accepted". Null when the party hasn't signed. */
  contractContractorSignedAt?: string | null;
  contractHomeownerSignedAt?: string | null;
  escrowStatus: string | null | undefined;
  /** Row from the `building_assessments` table (or null). The
   *  `assessment_data` jsonb column carries the actual AI output —
   *  shape Phase1BuildingAssessment. The Overview tab renders the
   *  AI assessment card from this. */
  buildingAssessment?: Record<string, unknown> | null;
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
  contractContractorSignedAt,
  contractHomeownerSignedAt,
  escrowStatus,
  buildingAssessment,
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
          beforePhotos={beforePhotos}
          afterPhotos={afterPhotos}
          buildingAssessment={buildingAssessment}
          lifecycle={{
            contractStatus,
            contractContractorSignedAt,
            contractHomeownerSignedAt,
            escrowStatus,
            bidCount,
            pendingBidCount,
            completionConfirmed,
          }}
        />
        {/* Below-the-fold interactive panels reuse the legacy
            components — they handle real API mutations (sign contract,
            confirm completion) that we don't want to re-implement in
            this slice.
            Width-constrained (max-w-3xl) so the contract card and
            photo review sit inside the same visual main column as the
            hero's AI cards above, instead of stretching edge-to-edge
            and crowding the Mint AI dock. */}
        <div
          style={{
            marginTop: 24,
            maxWidth: 768,
            width: '100%',
          }}
        >
          {job.status === 'completed' && afterPhotos.length > 0 && (
            <div id='photo-review'>
              <HomeownerPhotoReview
                jobId={job.id}
                beforePhotos={beforePhotos}
                afterPhotos={afterPhotos}
                isConfirmed={completionConfirmed}
                completedAt={job.completed_at}
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
