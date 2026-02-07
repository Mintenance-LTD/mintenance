import type { DomainConfig } from '../BuildingSurveyorConfig';

export const railDomain: DomainConfig = {
    id: 'rail',
    displayName: 'Rail Infrastructure',
    damageTypes: [
        'rail_crack', 'rail_corrosion', 'tie_rot', 'ballast_fouling',
        'track_misalignment', 'signal_damage', 'switch_defect',
        'bridge_spalling', 'tunnel_crack', 'catenary_damage',
        'fastener_failure', 'gauge_deviation', 'rail_wear',
        'vegetation_encroachment', 'drainage_failure',
    ],
    classNames: [
        'rail_crack', 'rail_corrosion', 'tie_rot', 'ballast_fouling',
        'track_misalignment', 'signal_damage', 'switch_defect',
        'bridge_spalling', 'tunnel_crack', 'catenary_damage',
        'fastener_failure', 'gauge_deviation', 'rail_wear',
        'vegetation_encroachment', 'drainage_failure',
    ],
    fusionWeights: {
        sam3: 0.30,
        gpt4: 0.45,
        sceneGraph: 0.25,
    },
    confidenceThresholds: {
        high: 0.85,
        medium: 0.65,
        low: 0.45,
    },
    agreementThreshold: 0.90,
    safetyCriticalClasses: [
        'rail_crack', 'track_misalignment', 'signal_damage',
        'switch_defect', 'bridge_spalling', 'tunnel_crack',
        'catenary_damage', 'fastener_failure', 'gauge_deviation',
    ],
    nodeTypes: [
        'rail', 'tie', 'ballast', 'signal', 'switch', 'bridge',
        'tunnel', 'catenary', 'fastener', 'sleeper',
        'crack', 'corrosion', 'wear', 'misalignment',
        'fouling', 'vegetation', 'drainage',
    ],
    edgeTypes: [
        'has', 'on_surface', 'adjacent_to', 'contains', 'near',
        'above', 'below', 'left_of', 'right_of', 'overlaps',
        'indicates', 'caused_by',
        'supports', 'connected_to', 'runs_along', 'crosses',
    ],
};
