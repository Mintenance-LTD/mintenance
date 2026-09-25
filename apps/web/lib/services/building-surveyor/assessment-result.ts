/** Read both current surveys and the older mobile wizard's nested result. */
function hasDamageResult(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const damage = value as Record<string, unknown>;
  return (
    typeof damage.damageType === 'string' &&
    damage.damageType.trim().length > 0 &&
    typeof damage.confidence === 'number' &&
    Number.isFinite(damage.confidence)
  );
}

export function getAssessmentResult(
  data: unknown
): Record<string, unknown> | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  if (hasDamageResult(record.damageAssessment)) {
    return record;
  }
  const nested = record.ai_analysis;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const result = nested as Record<string, unknown>;
    if (hasDamageResult(result.damageAssessment)) {
      return result;
    }
  }
  return null;
}
