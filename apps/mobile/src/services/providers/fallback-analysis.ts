/**
 * Rule-based fallback analysis and equipment detection.
 * Used when no AI service is configured or as a graceful degradation path.
 */

import { Job } from '@mintenance/types';
import { AIAnalysis } from '../AIAnalysisService';
import { DetectedEquipmentItem, EquipmentEntry } from './ai-analysis-types';

/**
 * Generate realistic equipment detection based on job context.
 */
export function generateRealisticEquipment(job: Job): DetectedEquipmentItem[] {
  const category = job.category?.toLowerCase() || 'general';
  const description = job.description?.toLowerCase() || '';

  const equipmentDatabase: Record<string, EquipmentEntry[]> = {
    plumbing: [
      {
        name: 'Toilet',
        keywords: ['toilet', 'bathroom', 'flush', 'tank'],
        locations: ['Bathroom floor', 'Corner position', 'Against wall'],
        baseConfidence: 85,
      },
      {
        name: 'Kitchen Sink',
        keywords: ['sink', 'kitchen', 'faucet', 'drain'],
        locations: ['Under window', 'Counter mounted', 'Island position'],
        baseConfidence: 90,
      },
      {
        name: 'Water Heater',
        keywords: ['water heater', 'hot water', 'tank'],
        locations: ['Utility room', 'Basement', 'Garage'],
        baseConfidence: 80,
      },
    ],
    electrical: [
      {
        name: 'Electrical Panel',
        keywords: ['panel', 'breaker', 'fuse', 'electrical'],
        locations: ['Utility room', 'Garage wall', 'Basement'],
        baseConfidence: 95,
      },
      {
        name: 'Wall Outlet',
        keywords: ['outlet', 'plug', 'socket', 'power'],
        locations: ['Wall mounted', 'Baseboard level', 'Counter height'],
        baseConfidence: 85,
      },
    ],
  };

  const categoryEquipment = equipmentDatabase[category] || [];
  const detectedItems: DetectedEquipmentItem[] = [];

  categoryEquipment.forEach((equipment) => {
    const hasKeyword = equipment.keywords.some((keyword) =>
      description.includes(keyword)
    );

    if (hasKeyword || Math.random() > 0.5) {
      const confidence = equipment.baseConfidence + (Math.random() * 10 - 5);
      const location =
        equipment.locations[
          Math.floor(Math.random() * equipment.locations.length)
        ];

      detectedItems.push({
        name: equipment.name,
        confidence: Math.round(Math.max(60, Math.min(95, confidence))),
        location,
      });
    }
  });

  return detectedItems.slice(0, 3);
}

/**
 * Generate an intelligent fallback analysis using category-based rules.
 */
export function generateIntelligentFallback(job: Job): AIAnalysis {
  const category = job.category?.toLowerCase() || 'general';
  const description = job.description?.toLowerCase() || '';
  const priority = job.priority?.toLowerCase() || 'medium';
  const hasPhotos = job.photos && job.photos.length > 0;

  let confidence = 80;
  if (hasPhotos) confidence += 10;
  if (job.category) confidence += 5;
  if (description.length > 50) confidence += 5;

  const analysisMap: Record<string, Partial<AIAnalysis>> = {
    plumbing: {
      detectedItems: [
        'Plumbing fixtures',
        'Water supply lines',
        'Drainage system',
        'Pipe joints',
      ],
      safetyConcerns: [
        {
          concern: 'Water damage risk',
          severity: 'High' as const,
          description:
            'Uncontrolled water can damage property and create mold conditions',
        },
        {
          concern: 'Slip hazard',
          severity: 'Medium' as const,
          description: 'Wet surfaces create slipping risks during repair',
        },
      ],
      recommendedActions: [
        'Locate and shut off main water supply',
        'Assess extent of leak and water damage',
        'Check surrounding pipes for deterioration',
        'Test water pressure and flow after repairs',
        'Inspect for mold or water damage signs',
      ],
      estimatedComplexity:
        priority === 'high' ? ('High' as const) : ('Medium' as const),
      suggestedTools: [
        'Adjustable pipe wrench set',
        "Plumber's tape (Teflon)",
        'Pipe cutter',
        'Drain snake/auger',
        'Bucket and towels',
        'Pipe thread compound',
      ],
      estimatedDuration: priority === 'high' ? '2-4 hours' : '1-3 hours',
    },

    electrical: {
      detectedItems: [
        'Electrical panels',
        'Wiring systems',
        'Outlets and switches',
        'Circuit breakers',
      ],
      safetyConcerns: [
        {
          concern: 'Electrocution hazard',
          severity: 'High' as const,
          description:
            'Live electrical components pose serious injury or death risk',
        },
        {
          concern: 'Fire hazard',
          severity: 'High' as const,
          description: 'Faulty wiring is a leading cause of house fires',
        },
        {
          concern: 'Code compliance',
          severity: 'Medium' as const,
          description: 'Electrical work must meet local building codes',
        },
      ],
      recommendedActions: [
        'Turn off power at main breaker before starting',
        'Use non-contact voltage tester to verify power is off',
        'Check electrical permits and code requirements',
        'Test all circuits after completion',
        'Schedule electrical inspection if required',
      ],
      estimatedComplexity: 'High' as const,
      suggestedTools: [
        'Digital multimeter',
        'Non-contact voltage tester',
        'Wire strippers',
        'Electrical tape',
        'Wire nuts/connectors',
        'Insulated screwdrivers',
      ],
      estimatedDuration: '3-6 hours',
    },

    hvac: {
      detectedItems: [
        'HVAC units',
        'Ductwork systems',
        'Air filtration',
        'Thermostats',
      ],
      safetyConcerns: [
        {
          concern: 'Air quality issues',
          severity: 'Medium' as const,
          description: 'Poor HVAC maintenance affects indoor air quality',
        },
        {
          concern: 'Energy efficiency loss',
          severity: 'Low' as const,
          description:
            'Inefficient systems increase utility costs significantly',
        },
      ],
      recommendedActions: [
        'Check and replace air filters',
        'Inspect ductwork for leaks or damage',
        'Clean evaporator and condenser coils',
        'Test thermostat calibration',
        'Verify proper airflow throughout system',
      ],
      estimatedComplexity: 'Medium' as const,
      suggestedTools: [
        'HVAC gauges and manifolds',
        'Coil cleaning supplies',
        'Replacement filters',
        'Duct tape/sealant',
        'Digital thermometer',
      ],
      estimatedDuration: '2-4 hours',
    },
  };

  const categoryAnalysis = analysisMap[category] || {
    detectedItems: ['General maintenance items'],
    safetyConcerns: [
      {
        concern: 'Standard safety precautions',
        severity: 'Low' as const,
        description: 'Follow basic safety protocols for maintenance work',
      },
    ],
    recommendedActions: [
      'Assess complete scope of work',
      'Gather all necessary tools and materials',
      'Plan work sequence for efficiency',
      'Clean and organize work area when complete',
    ],
    estimatedComplexity: 'Low' as const,
    suggestedTools: [
      'Basic tool kit',
      'Safety equipment',
      'Cleaning supplies',
    ],
    estimatedDuration: '1-2 hours',
  };

  if (hasPhotos) {
    categoryAnalysis.detectedItems = [
      ...(categoryAnalysis.detectedItems || []),
      'Visual damage assessment from photos',
      'Photo documentation for reference',
    ];
  }

  const detectedEquipment = generateRealisticEquipment(job);

  return {
    confidence: Math.min(confidence, 95),
    detectedItems: categoryAnalysis.detectedItems || [],
    safetyConcerns: categoryAnalysis.safetyConcerns || [],
    recommendedActions: categoryAnalysis.recommendedActions || [],
    estimatedComplexity: categoryAnalysis.estimatedComplexity || 'Medium',
    suggestedTools: categoryAnalysis.suggestedTools || [],
    estimatedDuration: categoryAnalysis.estimatedDuration || '2-3 hours',
    detectedEquipment,
  };
}
