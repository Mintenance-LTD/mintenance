/**
 * YOLO Class Names Loader
 *
 * Loads class names from data.yaml file for mapping class indices to names.
 * This matches the 71 classes defined in "Building Defect Detection 7.v2i.yolov11/data.yaml"
 */

import { logger } from '@mintenance/shared';

/**
 * Default class names (from data.yaml)
 * These are the 71 classes for building defect detection
 */
const DEFAULT_CLASS_NAMES = [
  'bare_electrical_wire',
  'broken_window',
  'broken_timber_floor',
  'building',
  'crack',
  'cracked_skirting',
  'damage',
  'damaged_brick',
  'damaged_tower',
  'damaged_plaster_board',
  'damaged_roof',
  'damaged_wall',
  'damp',
  'damp_damage',
  'dangerous_electrical_socket',
  'defective_paving',
  'expansion_crack',
  'fissure',
  'leaking_damage_on_wood',
  'leaking_radiator',
  'loose_coping',
  'loose_pipes',
  'minor_crack',
  'mold',
  'mould_on_wall',
  'normal_wall',
  'other',
  'plaster_board',
  'plaster_coverring_to_stop_leaking',
  'radiator',
  'radiator_conner',
  'rotten',
  'rotten_timber',
  'rust_on_radiator',
  'spalling',
  'stepped_cracking_on_brick',
  'sunken_block',
  'trou',
  'uncracked_wall',
  'unstable',
  'wall_leaking',
  'whole_cause_by_damp',
  'window',
  'bad_coupler',
  'bad_line',
  'bath',
  'brack_crack',
  'burst',
  'closed_valve',
  'crack_mold_damp_spalling_cor',
  'designradiator',
  'douche',
  'good_bolt',
  'good_coupler',
  'good_line',
  'good_valve',
  'hole',
  'leak',
  'opened_valve',
  'pipe',
  'rusty_bolt',
  'rusty_valve',
  'toilet',
  'wall_flange',
  'wall_corrosion',
  'wall_crack',
  'wall_deterioration',
  'wall_mold',
  'wall_stain',
  'wastafel',
];

/**
 * Load class names from data.yaml file
 *
 * @param dataYamlPath - Path to data.yaml file (optional, defaults to project root)
 * @returns Array of class names
 */
export function loadClassNames(dataYamlPath?: string): string[] {
  try {
    // Try to load from data.yaml if path provided (server-side only)
    if (dataYamlPath && typeof window === 'undefined') {
      // Dynamic import for Node.js modules (server-side only)
      const { readFileSync } = require('fs');
      const yamlContent = readFileSync(dataYamlPath, 'utf-8');
      const namesMatch = yamlContent.match(/names:\s*\n((?:- .+\n?)+)/);
      if (namesMatch) {
        const names = namesMatch[1]
          .split('\n')
          .map((line: string) => line.replace(/^-\s+/, '').trim())
          .filter(Boolean);
        if (names.length > 0) {
          logger.info('Loaded class names from data.yaml', {
            service: 'YOLOClassNames',
            count: names.length,
            path: dataYamlPath,
          });
          return names;
        }
      }
    }

    // Fallback to default class names
    logger.info('Using default class names', {
      service: 'YOLOClassNames',
      count: DEFAULT_CLASS_NAMES.length,
    });
    return DEFAULT_CLASS_NAMES;
  } catch (error) {
    logger.warn('Failed to load class names from data.yaml, using defaults', {
      service: 'YOLOClassNames',
      error,
      path: dataYamlPath,
    });
    return DEFAULT_CLASS_NAMES;
  }
}

/**
 * Get class name by index
 */
export function getClassName(classIndex: number, classNames: string[] = DEFAULT_CLASS_NAMES): string {
  if (classIndex >= 0 && classIndex < classNames.length) {
    return classNames[classIndex];
  }
  return `class_${classIndex}`;
}

