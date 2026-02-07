import type { DomainConfig } from '../BuildingSurveyorConfig';

export const industrialDomain: DomainConfig = {
    id: 'industrial',
    displayName: 'Industrial / Commercial',
    damageTypes: [
        'crack', 'corrosion', 'weld_defect', 'concrete_spalling',
        'rebar_exposure', 'steel_fatigue', 'coating_failure',
        'foundation_settlement', 'joint_deterioration', 'fire_damage',
        'water_ingress', 'structural_deformation', 'bolt_failure',
        'insulation_damage', 'cladding_damage',
    ],
    classNames: [
        'crack', 'corrosion', 'weld_defect', 'concrete_spalling',
        'rebar_exposure', 'steel_fatigue', 'coating_failure',
        'foundation_settlement', 'joint_deterioration', 'fire_damage',
        'water_ingress', 'structural_deformation', 'bolt_failure',
        'insulation_damage', 'cladding_damage',
    ],
    fusionWeights: {
        sam3: 0.35,
        gpt4: 0.40,
        sceneGraph: 0.25,
    },
    confidenceThresholds: {
        high: 0.80,
        medium: 0.60,
        low: 0.40,
    },
    agreementThreshold: 0.85,
    safetyCriticalClasses: [
        'steel_fatigue', 'structural_deformation', 'foundation_settlement',
        'rebar_exposure', 'weld_defect', 'bolt_failure', 'fire_damage',
    ],
    nodeTypes: [
        'beam', 'girder', 'column', 'slab', 'weld', 'bolt',
        'pipe', 'duct', 'cladding', 'foundation',
        'crack', 'corrosion', 'spalling', 'deformation',
        'coating', 'joint', 'rebar',
    ],
    edgeTypes: [
        'has', 'on_surface', 'adjacent_to', 'contains', 'near',
        'above', 'below', 'left_of', 'right_of', 'overlaps',
        'indicates', 'caused_by',
        'supports', 'connected_to', 'welded_to', 'bolted_to',
    ],
};
