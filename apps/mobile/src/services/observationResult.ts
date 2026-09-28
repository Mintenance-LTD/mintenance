export interface ObservationResult {
  protocol: 'observation-only-v1';
  assessmentId: string;
  visualEvidence: {
    photos: {
      photoIndex: number;
      observation: {
        outcome: string;
        observations: { description: string }[];
        limitations: string[];
      };
    }[];
  };
}

export function isObservationResult(
  value: unknown
): value is ObservationResult {
  if (!value || typeof value !== 'object') return false;
  const data = value as ObservationResult;
  return data.protocol === 'observation-only-v1';
}
