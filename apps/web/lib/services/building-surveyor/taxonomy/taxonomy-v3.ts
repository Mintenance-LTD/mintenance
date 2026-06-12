/**
 * Typed access to the v3 surveyor taxonomy (taxonomy_v3.json — canonical,
 * shared with scripts/vlm-training/evaluate_vlm.py via --taxonomy path).
 *
 * The taxonomy is injected into the assessment system prompt so the model
 * classifies onto surveyor-grade defect classes (`taxonomyClassId`) alongside
 * the legacy free-text `damageType`, which downstream code and DB CHECK
 * constraints still depend on.
 */
import taxonomyJson from './taxonomy_v3.json';

export interface TaxonomyV3Class {
  id: string;
  label: string;
  group: string;
  v2Classes: string[];
  aliases: string[];
  safetyCritical: boolean;
  typicalConditionRating: number;
  notes?: string;
  gates?: {
    minAccuracy: number;
    minSafetyRecall: number;
    minEvalSamples: number;
  };
}

interface TaxonomyV3 {
  version: string;
  classes: TaxonomyV3Class[];
}

export const TAXONOMY_V3 = taxonomyJson as unknown as TaxonomyV3;

export const TAXONOMY_V3_CLASS_IDS: ReadonlySet<string> = new Set(
  TAXONOMY_V3.classes.map((c) => c.id)
);

export function isTaxonomyV3ClassId(value: unknown): value is string {
  return typeof value === 'string' && TAXONOMY_V3_CLASS_IDS.has(value);
}

/**
 * Compact, grouped class list for the system prompt (~25 lines). Group
 * headers help the model narrow before picking; safety-critical classes are
 * flagged so it leans conservative on them.
 */
export function buildTaxonomyPromptSection(): string {
  const byGroup = new Map<string, TaxonomyV3Class[]>();
  for (const cls of TAXONOMY_V3.classes) {
    const list = byGroup.get(cls.group) ?? [];
    list.push(cls);
    byGroup.set(cls.group, list);
  }

  const lines: string[] = [];
  for (const [group, classes] of byGroup) {
    lines.push(`${group}:`);
    for (const cls of classes) {
      const safety = cls.safetyCritical ? ' [safety-critical]' : '';
      lines.push(`  - ${cls.id}: ${cls.label}${safety}`);
    }
  }
  return lines.join('\n');
}
