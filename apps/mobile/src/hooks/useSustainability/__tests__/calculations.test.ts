/**
 * Unit tests for the pure sustainability formatter/calculation helpers.
 * No external state — every branch is reachable by varying the inputs.
 */

import {
  formatCarbonFootprint,
  formatESGScore,
  formatSustainabilityMetrics,
  formatMaterialSwap,
  getSustainabilityInsights,
  getProgressInsights,
} from '../calculations';
import type {
  ESGScore,
  JobSustainabilityAnalysis,
  MaterialSwapSuggestion,
  SustainabilityMetrics,
} from '../../../services/SustainabilityEngine';

describe('formatCarbonFootprint', () => {
  it('renders sub-kilogram values in grams', () => {
    expect(formatCarbonFootprint(0.25)).toBe('250g CO₂');
  });
  it('renders mid-range values in kilograms', () => {
    expect(formatCarbonFootprint(12.34)).toBe('12.3kg CO₂');
  });
  it('renders large values in tonnes', () => {
    expect(formatCarbonFootprint(2500)).toBe('2.5t CO₂');
  });
});

describe('formatESGScore', () => {
  const make = (overall: number, cert = 'gold'): ESGScore =>
    ({
      overall_score: overall,
      environmental_score: 82,
      social_score: 64,
      governance_score: 58,
      certification_level: cert,
    }) as unknown as ESGScore;

  it.each([
    [95, 'A+'],
    [86, 'A'],
    [80, 'A-'],
    [76, 'B+'],
    [72, 'B'],
    [66, 'B-'],
    [61, 'C+'],
    [56, 'C'],
    [40, 'D'],
  ])('maps overall score %i to grade %s', (score, grade) => {
    expect(formatESGScore(make(score)).overallGrade).toBe(grade);
  });

  it.each([
    ['platinum', '🏆'],
    ['gold', '🥇'],
    ['silver', '🥈'],
    ['bronze', '🥉'],
    ['unknown', '📊'],
  ])('maps certification %s to its icon', (level, icon) => {
    expect(formatESGScore(make(90, level)).certificationIcon).toBe(icon);
  });

  it('capitalises the certification label and returns a color for each pillar', () => {
    const out = formatESGScore(make(90, 'gold'));
    expect(out.certificationLabel).toBe('Gold');
    expect(out.overallColor).toBeDefined();
    expect(out.environmentalGrade).toBe('A-');
    expect(out.socialGrade).toBe('C+');
    expect(out.governanceGrade).toBe('C');
  });
});

describe('formatSustainabilityMetrics', () => {
  it('rounds and labels each metric', () => {
    const metrics = {
      carbon_footprint_kg: 5.55,
      water_usage_liters: 123.4,
      waste_generated_kg: 2.46,
      energy_usage_kwh: 9.87,
      renewable_energy_percentage: 33.6,
      local_sourcing_percentage: 50.4,
      recycled_materials_percentage: 12.9,
    } as unknown as SustainabilityMetrics;
    const out = formatSustainabilityMetrics(metrics);
    expect(out.waterUsage).toBe('123L');
    expect(out.wasteGenerated).toBe('2.5kg');
    expect(out.energyUsage).toBe('9.9kWh');
    expect(out.renewablePercentage).toBe('34%');
    expect(out.localSourcing).toBe('50%');
    expect(out.recycledMaterials).toBe('13%');
    expect(out.carbonFootprint).toContain('CO₂');
  });
});

describe('formatMaterialSwap', () => {
  const make = (
    carbon: number,
    cost: number,
    availability: string
  ): MaterialSwapSuggestion =>
    ({
      carbon_reduction: carbon,
      cost_difference: cost,
      availability,
    }) as unknown as MaterialSwapSuggestion;

  it('handles high carbon reduction + readily available + positive cost', () => {
    const out = formatMaterialSwap(make(8, 25, 'readily_available'));
    expect(out.availabilityIcon).toBe('✅');
    expect(out.costImpact).toBe('+25%');
    expect(out.availabilityText).toBe('Readily Available');
    expect(out.savingsColor).toBeDefined();
    expect(out.costColor).toBeDefined();
  });

  it('handles mid carbon reduction + order required + mid cost', () => {
    const out = formatMaterialSwap(make(3, 15, 'order_required'));
    expect(out.availabilityIcon).toBe('📦');
    expect(out.costImpact).toBe('+15%');
  });

  it('handles low carbon reduction + other availability + negative cost', () => {
    const out = formatMaterialSwap(make(1, -5, 'special_order'));
    expect(out.availabilityIcon).toBe('⏳');
    expect(out.costImpact).toBe('-5%');
  });
});

describe('getSustainabilityInsights', () => {
  const make = (
    score: number,
    eligible: boolean,
    reduction: number
  ): JobSustainabilityAnalysis =>
    ({
      sustainability_score: score,
      certification_eligible: eligible,
      improvement_suggestions: { potential_carbon_reduction: reduction },
    }) as unknown as JobSustainabilityAnalysis;

  it('returns a success insight for high scores plus cert + reduction insights', () => {
    const out = getSustainabilityInsights(make(85, true, 20));
    expect(out[0].type).toBe('success');
    expect(out.some((i) => i.message.includes('green certification'))).toBe(
      true
    );
    expect(out.some((i) => i.message.includes('reduce carbon footprint'))).toBe(
      true
    );
  });

  it('returns an info insight for mid scores', () => {
    expect(getSustainabilityInsights(make(65, false, 0))[0].type).toBe('info');
  });

  it('returns a warning insight for low scores', () => {
    expect(getSustainabilityInsights(make(40, false, 0))[0].type).toBe(
      'warning'
    );
  });
});

describe('getProgressInsights', () => {
  it('reports improving trends with a renewable bonus', () => {
    const out = getProgressInsights({
      trend: 'improving',
      carbon_reduction_kg: 3,
      renewable_increase_percent: 10,
    });
    expect(out[0].type).toBe('success');
    expect(out.some((i) => i.message.includes('renewable energy'))).toBe(true);
  });

  it('reports declining trends', () => {
    const out = getProgressInsights({
      trend: 'declining',
      carbon_reduction_kg: 0,
      renewable_increase_percent: 0,
    });
    expect(out[0].type).toBe('warning');
  });

  it('reports stable trends', () => {
    const out = getProgressInsights({
      trend: 'stable',
      carbon_reduction_kg: 0,
      renewable_increase_percent: 0,
    });
    expect(out[0].type).toBe('info');
  });
});
