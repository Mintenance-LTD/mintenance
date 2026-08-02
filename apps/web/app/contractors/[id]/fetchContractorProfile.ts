/**
 * Data loading for the public contractor profile.
 *
 * Extracted from ContractorProfileClient.tsx (2026-08-02): the component
 * was over the 500-line cap, and this is self-contained I/O + shaping with
 * no React in it, so it belongs beside the transformer rather than inside
 * the view.
 *
 * The reviews and metrics requests are best-effort — either failing must
 * still render a profile, so both `.catch(() => null)` and are treated as
 * absent rather than fatal. Only the contractor request can fail the load.
 */
import {
  transformContractorData,
  applyContractorMetrics,
  type Contractor,
  type ContractorMetrics,
  type PortfolioItem,
  type RawContractorData,
} from './transform-contractor';

export interface ContractorReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  jobType: string;
  helpful: number;
  verified: boolean;
}

export interface ContractorProfileData {
  contractor: Contractor;
  reviews: ContractorReview[];
  portfolio: PortfolioItem[];
}

export async function fetchContractorProfile(
  contractorId: string
): Promise<ContractorProfileData> {
  // R7 #9 — pass ?postcode= so the API can resolve postcode-proof count.
  // Prefer ?postcode= on the URL (from search result) → fall back to the
  // user's stored postcode.
  const urlPostcode =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('postcode') || ''
      : '';
  const postcodeQuery = urlPostcode
    ? `?postcode=${encodeURIComponent(urlPostcode)}`
    : '';

  const [contractorResponse, reviewsResponse, metricsResponse] =
    await Promise.all([
      fetch(`/api/contractors/${contractorId}${postcodeQuery}`, {
        credentials: 'include',
      }),
      fetch(`/api/contractors/${contractorId}/reviews`, {
        credentials: 'include',
      }).catch(() => null),
      fetch(`/api/contractors/${contractorId}/metrics`, {
        credentials: 'include',
      }).catch(() => null),
    ]);

  if (!contractorResponse.ok) {
    throw new Error(
      `Failed to fetch contractor (${contractorResponse.status})`
    );
  }

  const contractorData = await contractorResponse.json();
  const rawContractor = contractorData.contractor as RawContractorData;
  if (!rawContractor) {
    throw new Error('Contractor data not found in response');
  }

  let reviews: ContractorReview[] = [];
  if (reviewsResponse && reviewsResponse.ok) {
    const reviewsData = await reviewsResponse.json();
    reviews = reviewsData.reviews || [];
  }

  let metrics: ContractorMetrics = {};
  if (metricsResponse && metricsResponse.ok) {
    const metricsData = await metricsResponse.json();
    metrics = metricsData.metrics || {};
  }

  return {
    contractor: applyContractorMetrics(
      transformContractorData(rawContractor, contractorId),
      metrics
    ),
    reviews,
    // 2026-05-13 portfolio audit fix: the API returns `portfolio:
    // PortfolioItem[]` (one tile per completed job with after-photos, plus
    // an "Other past work" tile for manual entries not tied to a job).
    // This used to be initialised as [] and never populated, so the
    // portfolio section rendered empty even for contractors with finished
    // jobs.
    portfolio: rawContractor.portfolio ?? [],
  };
}
