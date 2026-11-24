export interface ContractorPerformanceBasis {
  onTime: { count: number; total: number };
  repeat: { count: number; total: number };
  responses: number;
}

export const MINIMUM_PERFORMANCE_SAMPLE = 3;

export function performanceBasisLabels(basis?: ContractorPerformanceBasis) {
  const enough = (n: number) => n >= MINIMUM_PERFORMANCE_SAMPLE;
  return {
    onTime:
      basis && enough(basis.onTime.total)
        ? `${basis.onTime.count} of ${basis.onTime.total} jobs finished by the scheduled end · All time`
        : null,
    repeat:
      basis && enough(basis.repeat.total)
        ? `${basis.repeat.count} of ${basis.repeat.total} customers booked more than one completed job · All time`
        : null,
    responses:
      basis && enough(basis.responses)
        ? `First bid or message after posting · ${basis.responses} completed jobs · All time`
        : null,
  };
}
