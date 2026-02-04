/**
 * Maps detector class names/indices to damage_taxonomy.damage_type (target classes).
 * Uses class_mapping.json structure: source -> target index -> target_classes.
 */

const TARGET_CLASSES: Record<string, string> = {
  '0': 'pipe_leak',
  '1': 'water_damage',
  '2': 'wall_crack',
  '3': 'roof_damage',
  '4': 'electrical_fault',
  '5': 'mold_damp',
  '6': 'fire_damage',
  '7': 'window_broken',
  '8': 'door_damaged',
  '9': 'floor_damage',
  '10': 'ceiling_damage',
  '11': 'foundation_crack',
  '12': 'hvac_issue',
  '13': 'gutter_blocked',
  '14': 'general_damage',
};

/** Source class index -> target class index (-1 = filter out) */
const SOURCE_TO_TARGET: Record<string, number> = {
  '0': 4, '1': 7, '2': 9, '3': -1, '4': 2, '5': 14, '6': 14, '7': 14, '8': 14, '9': 14,
  '10': 3, '11': 14, '12': 3, '13': 5, '14': 5, '15': 4, '16': 9, '17': 2, '18': 2, '19': 1,
  '20': 0, '21': 3, '22': 0, '23': 2, '24': 5, '25': 5, '26': 5, '27': -1, '28': 14, '29': -1,
  '30': 1, '31': -1, '32': -1, '33': 3, '34': 14, '35': 14, '36': 0, '37': 5, '38': 2, '39': 11,
  '40': 14, '41': -1, '42': 11, '43': 1, '44': 1, '45': 5, '46': 7, '47': -1, '48': -1, '49': -1,
  '50': 2, '51': 7, '52': -1, '53': 0, '54': -1, '55': 2, '56': 5, '57': 14, '58': 3, '59': -1,
  '60': -1, '61': -1, '62': -1, '63': -1, '64': -1, '65': 14, '66': 0, '67': -1, '68': 0, '69': 3,
  '70': -1, '71': -1, '72': -1, '73': -1, '74': 14, '75': 2, '76': 14, '77': 5, '78': 1, '79': -1,
  '80': 7,
};

/** Source class name (lowercase) -> source index */
const SOURCE_NAME_TO_INDEX: Record<string, string> = {};
(function () {
  const sourceClasses: Record<string, string> = {
    '0': 'Bare electrical wire', '1': 'Broken Window', '2': 'Broken timber Floor', '3': 'Building',
    '4': 'Crack', '5': 'Cracked Skirting', '6': 'Damage', '7': 'Damaged Brick', '8': 'Damaged Tower',
    '9': 'Damaged plaster board', '10': 'Damaged roof', '11': 'Damaged wall', '12': 'Damaged_Roof',
    '13': 'Damp', '14': 'Damp damage', '15': 'Dangerous Electrical socket', '16': 'Defective paving',
    '17': 'Expansion Crack', '18': 'Fissure', '19': 'Leaking damage on wood', '20': 'Leaking radiator',
    '21': 'Loose Coping', '22': 'Loose pipes', '23': 'Minor Crack', '24': 'Mold', '25': 'Mould',
    '26': 'Mould on wall', '27': 'Normal wall', '28': 'Other', '29': 'Plaster board',
    '30': 'Plaster coverring to stop leaking', '31': 'Radiator', '32': 'Radiator conner', '33': 'Roof',
    '34': 'Rotten', '35': 'Rotten timber', '36': 'Rust on radiator', '37': 'Spalling',
    '38': 'Stepped cracking on brick', '39': 'Sunken Block', '40': 'Trou', '41': 'Uncracked wall',
    '42': 'Unstable', '43': 'Wall leaking', '44': 'Wall-leaking', '45': 'Whole cause by damp',
    '46': 'Window', '47': 'bad_coupler', '48': 'bad_line', '49': 'bath', '50': 'brack_crack',
    '51': 'broken window', '52': 'building', '53': 'burst', '54': 'closed valve', '55': 'crack',
    '56': 'crack-mold-damp-spalling-cor', '57': 'damage', '58': 'damaged roof', '59': 'designradiator',
    '60': 'douche', '61': 'good_bolt', '62': 'good_coupler', '63': 'good_line', '64': 'good_valve',
    '65': 'hole', '66': 'leak', '67': 'opened valve', '68': 'pipe', '69': 'roof', '70': 'rusty_bolt',
    '71': 'rusty_valve', '72': 'toilet', '73': 'wall flange', '74': 'wall_corrosion', '75': 'wall_crack',
    '76': 'wall_deterioration', '77': 'wall_mold', '78': 'wall_stain', '79': 'wastafel', '80': 'window',
  };
  for (const [idx, name] of Object.entries(sourceClasses)) {
    SOURCE_NAME_TO_INDEX[name.toLowerCase().trim()] = idx;
  }
})();

/**
 * Map a class name (from detector) to damage_taxonomy.damage_type.
 * Returns null if filtered out or unknown.
 */
export function mapClassNameToDamageType(className: string): string | null {
  const normalized = className.toLowerCase().trim();
  const sourceIndex = SOURCE_NAME_TO_INDEX[normalized];
  if (sourceIndex === undefined) return null;
  const targetIndex = SOURCE_TO_TARGET[sourceIndex];
  if (targetIndex === undefined || targetIndex === -1) return null;
  return TARGET_CLASSES[String(targetIndex)] ?? null;
}

/**
 * Map a source class index (0-80) to damage_taxonomy.damage_type.
 */
export function mapClassIndexToDamageType(sourceIndex: number): string | null {
  const targetIndex = SOURCE_TO_TARGET[String(sourceIndex)];
  if (targetIndex === undefined || targetIndex === -1) return null;
  return TARGET_CLASSES[String(targetIndex)] ?? null;
}
