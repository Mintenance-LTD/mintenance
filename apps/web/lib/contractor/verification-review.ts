export type VerificationReviewState = 'ready' | 'incomplete' | 'verified' | 'rejected';

export type VerificationReview = {
  state: VerificationReviewState;
  label: string;
  nextSteps: string[];
};

export function describeVerificationReview(row: {
  queue_status: VerificationReviewState;
  identity_submitted: boolean;
  business_submitted: boolean;
  mobile_credential_submitted: boolean;
  mobile_review_requested: boolean;
  business_details_submitted: boolean;
}): VerificationReview {
  if (row.queue_status === 'verified') {
    return { state: 'verified', label: 'Admin verified', nextSteps: [] };
  }
  if (row.queue_status === 'rejected') {
    return { state: 'rejected', label: 'Review rejected', nextSteps: ['Check the review decision before submitting again.'] };
  }
  if (row.queue_status === 'ready') {
    return {
      state: 'ready',
      label: 'Ready for review',
      nextSteps: row.identity_submitted && row.business_submitted
        ? []
        : ['Trade details were submitted for manual review. The reviewer may request identity or business evidence.'],
    };
  }

  const nextSteps: string[] = [];
  if (row.mobile_review_requested && !row.business_details_submitted) nextSteps.push('Add your business name and address.');
  if (!row.identity_submitted) nextSteps.push('Upload proof of identity for an evidence-based review.');
  if (!row.business_submitted) nextSteps.push('Upload proof of business or trading. A trade licence number is optional for this review.');
  if (row.mobile_review_requested && !row.mobile_credential_submitted) {
    nextSteps.push('If you are submitting a trade credential, check its registration number and expiry date.');
  }

  return { state: 'incomplete', label: 'Evidence needed', nextSteps };
}
