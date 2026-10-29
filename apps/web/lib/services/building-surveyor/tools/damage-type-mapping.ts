/** Detector names are interpreted by meaning, never by a new model's class order. */
import policy from '../taxonomy/roboflow-label-policy.json';

export type DetectorLabelKind = 'defect' | 'context' | 'review' | 'unknown';

export function normalizeDetectorLabel(label: string): string {
  return label.toLowerCase().trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

const aliases = new Map(Object.entries(policy.defectAliases));
for (const name of policy.canonicalDamageTypes)
  aliases.set(normalizeDetectorLabel(name), name);
const contextLabels = new Set(policy.contextLabels);
const reviewLabels = new Set(policy.reviewLabels);

/** Unknown/composite labels remain unresolved; object presence never proves damage. */
export function interpretDetectorLabel(className: string): {
  kind: DetectorLabelKind;
  damageType: string | null;
} {
  const name = normalizeDetectorLabel(className);
  const damageType = aliases.get(name);
  if (damageType) return { kind: 'defect', damageType };
  if (contextLabels.has(name)) return { kind: 'context', damageType: null };
  if (reviewLabels.has(name)) return { kind: 'review', damageType: null };
  return { kind: 'unknown', damageType: null };
}

export function mapClassNameToDamageType(className: string): string | null {
  return interpretDetectorLabel(className).damageType;
}

/** Historical v3 export ordering only. New exports must resolve their own category names. */
const LEGACY_SOURCE_CLASSES: Record<string, string> = {
  '0': 'Bare electrical wire',
  '1': 'Broken Window',
  '2': 'Broken timber Floor',
  '3': 'Building',
  '4': 'Crack',
  '5': 'Cracked Skirting',
  '6': 'Damage',
  '7': 'Damaged Brick',
  '8': 'Damaged Tower',
  '9': 'Damaged plaster board',
  '10': 'Damaged roof',
  '11': 'Damaged wall',
  '12': 'Damaged_Roof',
  '13': 'Damp',
  '14': 'Damp damage',
  '15': 'Dangerous Electrical socket',
  '16': 'Defective paving',
  '17': 'Expansion Crack',
  '18': 'Fissure',
  '19': 'Leaking damage on wood',
  '20': 'Leaking radiator',
  '21': 'Loose Coping',
  '22': 'Loose pipes',
  '23': 'Minor Crack',
  '24': 'Mold',
  '25': 'Mould',
  '26': 'Mould on wall',
  '27': 'Normal wall',
  '28': 'Other',
  '29': 'Plaster board',
  '30': 'Plaster coverring to stop leaking',
  '31': 'Radiator',
  '32': 'Radiator conner',
  '33': 'Roof',
  '34': 'Rotten',
  '35': 'Rotten timber',
  '36': 'Rust on radiator',
  '37': 'Spalling',
  '38': 'Stepped cracking on brick',
  '39': 'Sunken Block',
  '40': 'Trou',
  '41': 'Uncracked wall',
  '42': 'Unstable',
  '43': 'Wall leaking',
  '44': 'Wall-leaking',
  '45': 'Whole cause by damp',
  '46': 'Window',
  '47': 'bad_coupler',
  '48': 'bad_line',
  '49': 'bath',
  '50': 'brack_crack',
  '51': 'broken window',
  '52': 'building',
  '53': 'burst',
  '54': 'closed valve',
  '55': 'crack',
  '56': 'crack-mold-damp-spalling-cor',
  '57': 'damage',
  '58': 'damaged roof',
  '59': 'designradiator',
  '60': 'douche',
  '61': 'good_bolt',
  '62': 'good_coupler',
  '63': 'good_line',
  '64': 'good_valve',
  '65': 'hole',
  '66': 'leak',
  '67': 'opened valve',
  '68': 'pipe',
  '69': 'roof',
  '70': 'rusty_bolt',
  '71': 'rusty_valve',
  '72': 'toilet',
  '73': 'wall flange',
  '74': 'wall_corrosion',
  '75': 'wall_crack',
  '76': 'wall_deterioration',
  '77': 'wall_mold',
  '78': 'wall_stain',
  '79': 'wastafel',
  '80': 'window',
};

/** @deprecated Only valid for the historical 81-class v3 export, not newer model IDs. */
export function mapClassIndexToDamageType(sourceIndex: number): string | null {
  const name = LEGACY_SOURCE_CLASSES[String(sourceIndex)];
  return name ? mapClassNameToDamageType(name) : null;
}

export const CANONICAL_DAMAGE_TYPES = [
  ...policy.canonicalDamageTypes,
  'none',
] as const;

/**
 * Default contractor trade recommendations by canonical damage type.
 * Used as fallback when GPT/Qwen don't provide recommendedTrades.
 */
export const DAMAGE_TYPE_TO_TRADES: Record<string, string[]> = {
  pipe_leak: ['plumber'],
  water_damage: ['plumber', 'damp_specialist'],
  wall_crack: ['plasterer', 'structural_engineer'],
  roof_damage: ['roofer'],
  electrical_fault: ['electrician'],
  mold_damp: ['damp_specialist'],
  fire_damage: ['general_builder'],
  window_broken: ['glazier'],
  door_damaged: ['general_builder', 'locksmith'],
  floor_damage: ['general_builder'],
  ceiling_damage: ['plasterer'],
  foundation_crack: ['structural_engineer'],
  hvac_issue: ['gas_engineer'],
  gutter_blocked: ['roofer'],
  general_damage: ['general_builder'],
  none: [],
};
