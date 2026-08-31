import { toAnalysisResult } from '../analyzeWithMintAI';

describe('toAnalysisResult', () => {
  it('uses canonical assessment confidence, repair cost, and advice', () => {
    const result = toAnalysisResult({
      damageAssessment: {
        damageType: 'water_damage',
        severity: 'significant',
        confidence: 87,
        description: 'Moisture is visible below the window.',
      },
      contractorAdvice: {
        estimatedCost: { min: 450, max: 900, recommended: 650 },
        repairNeeded: ['Stop the source of water ingress.'],
        recommendedTrades: ['damp_specialist'],
      },
      homeownerExplanation: {
        whatIsIt: 'Water is entering the wall assembly.',
        whatToDo: 'Arrange an inspection before redecorating.',
      },
    });

    expect(result.confidence).toBe(87);
    expect(result.estimatedCostMin).toBe(450);
    expect(result.estimatedCostMax).toBe(900);
    expect(result.recommendedActions).toEqual([
      'Stop the source of water ingress.',
      'Recommended trades: damp_specialist',
      'Arrange an inspection before redecorating.',
      'Water is entering the wall assembly.',
    ]);
  });

  it('does not invent confidence when the backend omits it', () => {
    const result = toAnalysisResult({
      damageAssessment: {
        damageType: 'general_damage',
        severity: 'early',
        description: 'Insufficient detail.',
      },
    });

    expect(result.confidence).toBe(0);
    expect(result.estimatedCostMin).toBe(50);
    expect(result.estimatedCostMax).toBe(200);
  });
});
