import type { DomainConfig } from '../BuildingSurveyorConfig';

export const residentialDomain: DomainConfig = {
    id: 'residential',
    displayName: 'Residential Property',
    damageTypes: [
        'crack', 'damp', 'mold', 'subsidence', 'roof_damage',
        'water_damage', 'structural', 'electrical', 'plumbing',
        'pest_damage', 'fire_damage', 'insulation', 'window_damage',
        'foundation', 'chimney',
    ],
    classNames: [
        'crack', 'damp', 'mold', 'subsidence', 'roof_damage',
        'water_damage', 'structural', 'electrical', 'plumbing',
        'pest_damage', 'fire_damage', 'insulation', 'window_damage',
        'foundation', 'chimney',
    ],
    fusionWeights: {
        sam3: 0.40,
        gpt4: 0.35,
        sceneGraph: 0.25,
    },
    confidenceThresholds: {
        high: 0.75,
        medium: 0.55,
        low: 0.35,
    },
    agreementThreshold: 0.80,
    safetyCriticalClasses: [
        'structural', 'electrical', 'fire_damage', 'subsidence', 'foundation',
    ],
    nodeTypes: [
        'wall', 'foundation', 'roof', 'floor', 'ceiling', 'window', 'door',
        'crack', 'stain', 'moisture', 'mold', 'electrical', 'plumbing',
        'insulation', 'structural_beam', 'pest_damage', 'fire_damage',
    ],
    edgeTypes: [
        'has', 'on_surface', 'adjacent_to', 'contains', 'near',
        'above', 'below', 'left_of', 'right_of', 'overlaps',
        'indicates', 'caused_by',
    ],
};
