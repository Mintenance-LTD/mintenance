/**
 * Maintenance Knowledge Base
 * Provides detailed information about maintenance issues
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@/lib/logger';

export interface MaintenanceKnowledge {
  issue_type: string;
  issue_category: string;
  primary_contractor: string;
  contractor_types: string[];
  time_estimate: string;
  cost_estimate_min: number;
  cost_estimate_max: number;
  common_materials: string[];
  common_tools: string[];
  specialized_equipment?: string[];
  homeowner_immediate_actions: string[];
  homeowner_tips: string[];
  safety_precautions: string[];
  when_to_call_emergency?: string[];
  diy_difficulty: 'easy' | 'medium' | 'hard' | 'professional_only';
  diy_instructions?: string;
  diy_video_urls?: string[];
}

// Static knowledge base (fallback when database is not available)
const STATIC_KNOWLEDGE: Record<string, MaintenanceKnowledge> = {
  'pipe_leak': {
    issue_type: 'pipe_leak',
    issue_category: 'plumbing',
    primary_contractor: 'plumber',
    contractor_types: ['plumber'],
    time_estimate: '1-2 hours',
    cost_estimate_min: 75,
    cost_estimate_max: 200,
    common_materials: [
      'Replacement fitting/joint',
      'PTFE tape',
      'Pipe sealant',
      'Compression fitting',
      'Pipe section (if needed)'
    ],
    common_tools: [
      'Adjustable wrench',
      'Pipe cutter',
      'Bucket and towels',
      'Flashlight'
    ],
    homeowner_immediate_actions: [
      'Turn off water supply at main valve or local shutoff',
      'Place bucket or container under leak',
      'Move furniture and valuables away from water',
      'Document damage with photos for insurance'
    ],
    homeowner_tips: [
      'Mark water shutoff valves for quick access',
      'Keep emergency plumber contact handy',
      'Consider water leak sensors for early detection'
    ],
    safety_precautions: [
      'Ensure water supply is fully shut off',
      'Check for electrical hazards near water',
      'Wear non-slip shoes in wet areas',
      'Use proper ventilation when using sealants'
    ],
    when_to_call_emergency: [
      'Water near electrical panels or outlets',
      'Ceiling sagging from water weight',
      'Cannot locate or turn off water supply'
    ],
    diy_difficulty: 'medium',
    diy_instructions: 'For minor joint leaks: Turn off water, dry area, apply PTFE tape to threads, tighten connection. For larger issues, call professional.'
  },

  'outlet_damage': {
    issue_type: 'outlet_damage',
    issue_category: 'electrical',
    primary_contractor: 'electrician',
    contractor_types: ['electrician'],
    time_estimate: '30min-1 hour',
    cost_estimate_min: 100,
    cost_estimate_max: 250,
    common_materials: [
      'Replacement outlet',
      'Wire nuts',
      'Electrical tape',
      'Wall plate cover'
    ],
    common_tools: [
      'Voltage tester',
      'Screwdrivers',
      'Wire strippers',
      'Needle-nose pliers'
    ],
    specialized_equipment: ['Multimeter', 'Circuit finder'],
    homeowner_immediate_actions: [
      'Turn off circuit breaker immediately',
      'Do not use the outlet',
      'Keep area clear of flammable materials',
      'Check other outlets on same circuit'
    ],
    homeowner_tips: [
      'Never attempt electrical work with power on',
      'Test outlets monthly with GFCI tester',
      'Upgrade to AFCI/GFCI outlets for safety'
    ],
    safety_precautions: [
      'NEVER work on live circuits',
      'Always test with voltage tester first',
      'Use insulated tools only',
      'Have someone nearby when working'
    ],
    when_to_call_emergency: [
      'Smell of burning or see smoke',
      'Sparks or arcing visible',
      'Multiple outlets affected',
      'Circuit breaker keeps tripping'
    ],
    diy_difficulty: 'professional_only',
    diy_instructions: 'Electrical work requires licensed electrician for safety and code compliance.'
  },

  'wall_crack': {
    issue_type: 'wall_crack',
    issue_category: 'structural',
    primary_contractor: 'general_contractor',
    contractor_types: ['general_contractor', 'handyman'],
    time_estimate: '2-4 hours',
    cost_estimate_min: 150,
    cost_estimate_max: 400,
    common_materials: [
      'Spackling compound',
      'Mesh tape or fiberglass mesh',
      'Primer paint',
      'Matching paint',
      'Sandpaper (various grits)'
    ],
    common_tools: [
      'Putty knife (various sizes)',
      'Sanding block',
      'Paint brush/roller',
      'Drop cloth',
      'Level'
    ],
    homeowner_immediate_actions: [
      'Monitor crack for growth',
      'Take photos with date for reference',
      'Check for matching cracks on other side of wall',
      'Note any door/window sticking'
    ],
    homeowner_tips: [
      'Small hairline cracks often normal settling',
      'Cracks > 1/4 inch may indicate structural issue',
      'Seasonal changes can cause minor cracks'
    ],
    safety_precautions: [
      'Wear dust mask when sanding',
      'Ensure good ventilation',
      'Check for lead paint in older homes',
      'Large cracks may indicate structural issues'
    ],
    diy_difficulty: 'easy',
    diy_instructions: 'Clean crack, apply mesh tape, spread compound in thin layers, sand between coats, prime and paint.'
  },

  'ac_not_cooling': {
    issue_type: 'ac_not_cooling',
    issue_category: 'hvac',
    primary_contractor: 'hvac',
    contractor_types: ['hvac'],
    time_estimate: '1-2 hours',
    cost_estimate_min: 100,
    cost_estimate_max: 300,
    common_materials: [
      'Refrigerant (if leak)',
      'Air filter',
      'Capacitor',
      'Thermostat batteries'
    ],
    common_tools: [
      'Multimeter',
      'Manifold gauges',
      'Leak detector',
      'Thermometer'
    ],
    specialized_equipment: ['Refrigerant recovery unit', 'Vacuum pump'],
    homeowner_immediate_actions: [
      'Check thermostat settings and batteries',
      'Replace air filter if dirty',
      'Check circuit breaker',
      'Clear debris from outdoor unit'
    ],
    homeowner_tips: [
      'Change filters monthly during heavy use',
      'Keep 2-foot clearance around outdoor unit',
      'Annual maintenance prevents most issues'
    ],
    safety_precautions: [
      'Turn off power at breaker before inspection',
      'Never handle refrigerant without EPA certification',
      'Avoid touching capacitor terminals'
    ],
    diy_difficulty: 'medium',
    diy_instructions: 'Check filter, thermostat, breaker. Clean outdoor coils with garden hose (power off). Professional needed for refrigerant.'
  },

  'ceiling_stain': {
    issue_type: 'ceiling_stain',
    issue_category: 'structural',
    primary_contractor: 'roofer',
    contractor_types: ['roofer', 'plumber', 'general_contractor'],
    time_estimate: '2-3 hours',
    cost_estimate_min: 200,
    cost_estimate_max: 500,
    common_materials: [
      'Stain-blocking primer',
      'Ceiling paint',
      'Drywall patch kit',
      'Joint compound'
    ],
    common_tools: [
      'Moisture meter',
      'Ladder',
      'Paint roller with extension',
      'Drop cloths'
    ],
    homeowner_immediate_actions: [
      'Identify and stop water source',
      'Place bucket if actively dripping',
      'Check attic/floor above for source',
      'Document for insurance'
    ],
    homeowner_tips: [
      'Brown stains usually indicate water damage',
      'Must fix source before cosmetic repairs',
      'May indicate roof or plumbing leak'
    ],
    safety_precautions: [
      'Test ceiling stability before working',
      'Use stable ladder with spotter',
      'Check for mold growth',
      'Ensure area is dry before repairs'
    ],
    when_to_call_emergency: [
      'Ceiling sagging or bulging',
      'Active water dripping',
      'Electrical fixtures affected'
    ],
    diy_difficulty: 'medium',
    diy_instructions: 'Only repair after fixing water source. Prime with stain blocker, patch if needed, repaint. Professional for active leaks.'
  }
};

export class MaintenanceKnowledgeBase {
  /**
   * Get knowledge for a specific issue type
   */
  static async getKnowledge(issueType: string): Promise<MaintenanceKnowledge | null> {
    try {
      // Try to get from database first
      const { data, error } = await serverSupabase
        .from('maintenance_knowledge_base')
        .select('*')
        .eq('issue_type', issueType)
        .single();

      if (error || !data) {
        // Fall back to static knowledge
        return STATIC_KNOWLEDGE[issueType] || null;
      }

      // Transform database format to our interface
      return this.transformDatabaseRecord(data);

    } catch (error) {
      logger.error(`Failed to get knowledge for ${issueType}:`, error);
      // Fall back to static knowledge
      return STATIC_KNOWLEDGE[issueType] || null;
    }
  }

  /**
   * Get knowledge for multiple issue types
   */
  static async getBulkKnowledge(issueTypes: string[]): Promise<Map<string, MaintenanceKnowledge>> {
    const knowledgeMap = new Map<string, MaintenanceKnowledge>();

    try {
      const { data, error } = await serverSupabase
        .from('maintenance_knowledge_base')
        .select('*')
        .in('issue_type', issueTypes);

      if (!error && data) {
        for (const record of data) {
          const knowledge = this.transformDatabaseRecord(record);
          knowledgeMap.set(record.issue_type, knowledge);
        }
      }

      // Fill in missing with static knowledge
      for (const issueType of issueTypes) {
        if (!knowledgeMap.has(issueType) && STATIC_KNOWLEDGE[issueType]) {
          knowledgeMap.set(issueType, STATIC_KNOWLEDGE[issueType]);
        }
      }

    } catch (error) {
      logger.error('Failed to get bulk knowledge:', error);

      // Fall back to all static
      for (const issueType of issueTypes) {
        if (STATIC_KNOWLEDGE[issueType]) {
          knowledgeMap.set(issueType, STATIC_KNOWLEDGE[issueType]);
        }
      }
    }

    return knowledgeMap;
  }

  /**
   * Search knowledge base by keywords
   */
  static async searchKnowledge(keywords: string[]): Promise<MaintenanceKnowledge[]> {
    const results: MaintenanceKnowledge[] = [];

    // Search in static knowledge
    for (const [issueType, knowledge] of Object.entries(STATIC_KNOWLEDGE)) {
      const searchText = `${issueType} ${knowledge.issue_category} ${knowledge.primary_contractor}`.toLowerCase();

      if (keywords.some(keyword => searchText.includes(keyword.toLowerCase()))) {
        results.push(knowledge);
      }
    }

    return results;
  }

  /**
   * Get DIY feasibility
   */
  static isDIYFeasible(issueType: string): {
    feasible: boolean;
    difficulty: string;
    reason: string;
  } {
    const knowledge = STATIC_KNOWLEDGE[issueType];

    if (!knowledge) {
      return {
        feasible: false,
        difficulty: 'unknown',
        reason: 'Issue type not recognized'
      };
    }

    if (knowledge.diy_difficulty === 'professional_only') {
      return {
        feasible: false,
        difficulty: 'professional_only',
        reason: knowledge.diy_instructions || 'Requires licensed professional'
      };
    }

    return {
      feasible: true,
      difficulty: knowledge.diy_difficulty,
      reason: knowledge.diy_instructions || 'Can be done with proper tools and care'
    };
  }

  /**
   * Get emergency indicators
   */
  static isEmergency(issueType: string, additionalContext?: string): boolean {
    const knowledge = STATIC_KNOWLEDGE[issueType];

    if (!knowledge || !knowledge.when_to_call_emergency) {
      return false;
    }

    if (!additionalContext) {
      return false;
    }

    const lowerContext = additionalContext.toLowerCase();

    return knowledge.when_to_call_emergency.some(emergency =>
      emergency.toLowerCase().split(' ').some(word => lowerContext.includes(word))
    );
  }

  /**
   * Transform database record to our interface
   */
  private static transformDatabaseRecord(record: any): MaintenanceKnowledge {
    return {
      issue_type: record.issue_type,
      issue_category: record.issue_category,
      primary_contractor: record.primary_contractor,
      contractor_types: record.contractor_types || [record.primary_contractor],
      time_estimate: `${record.time_estimate_min}-${record.time_estimate_max} minutes`,
      cost_estimate_min: record.cost_estimate_min,
      cost_estimate_max: record.cost_estimate_max,
      common_materials: record.common_materials || [],
      common_tools: record.common_tools || [],
      specialized_equipment: record.specialized_equipment,
      homeowner_immediate_actions: record.homeowner_immediate_actions || [],
      homeowner_tips: record.homeowner_tips || [],
      safety_precautions: record.safety_precautions || [],
      when_to_call_emergency: record.when_to_call_emergency,
      diy_difficulty: record.diy_difficulty,
      diy_instructions: record.diy_instructions,
      diy_video_urls: record.diy_video_urls
    };
  }
}