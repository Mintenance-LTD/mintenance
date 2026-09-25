import { parseAssessmentResponse } from './assessment-response';
import { ComplianceService } from '../ComplianceService';

const flat = {
  damageType: 'electrical_fault',
  severity: 'dangerous',
  confidence: 87,
  safetyHazards: [
    { type: 'exposed wiring', severity: 'critical', urgency: 'immediate' },
  ],
  urgency: 'immediate',
  description: 'Exposed conductors',
};

describe('assessment response contract', () => {
  it('preserves zero confidence and compliance seriousness across both schemas', () => {
    const parsed = parseAssessmentResponse(
      JSON.stringify({
        ...flat,
        confidence: 0,
        complianceIssues: [
          { issue: 'Unsafe installation', severity: 'violation' },
        ],
      })
    );
    expect(parsed.confidence).toBe(0);
    expect(parsed.complianceIssues[0].severity).toBe('major');
    const compliance = ComplianceService.processCompliance(
      parsed.complianceIssues
    );
    expect(compliance.complianceIssues[0].severity).toBe('violation');
    expect(compliance.complianceScore).toBe(70);
  });
  it('preserves hazards and urgency from the flat prompt schema', () => {
    const parsed = parseAssessmentResponse(JSON.stringify(flat), 'stop');
    expect(parsed.safetyHazards).toEqual(flat.safetyHazards);
    expect(parsed.urgency).toBe('immediate');
    expect(parsed.confidence).toBe(87);
  });

  it('accepts existing nested training targets without dropping safety evidence', () => {
    const parsed = parseAssessmentResponse(
      JSON.stringify({
        damageAssessment: {
          damageType: flat.damageType,
          severity: flat.severity,
          confidence: 87,
        },
        safetyHazards: { hazards: flat.safetyHazards, overallSafetyScore: 0 },
        urgency: {
          urgency: 'immediate',
          recommendedActionTimeline: 'Now',
          reasoning: 'Exposed conductors',
        },
        insuranceRisk: { riskScore: 90 },
      })
    );
    expect(parsed.safetyHazards).toEqual(flat.safetyHazards);
    expect(parsed.urgency).toBe('immediate');
    expect(parsed.riskScore).toBe(90);
  });

  it.each(['{}', 'null', '[]', '{"damageType":"none"}', '{"damageType":'])(
    'rejects incomplete evidence: %s',
    (content) => {
      expect(() => parseAssessmentResponse(content)).toThrow();
    }
  );

  it('rejects truncated output even when the fragment is valid JSON', () => {
    expect(() =>
      parseAssessmentResponse(JSON.stringify(flat), 'length')
    ).toThrow('truncated');
  });

  it('accepts complete legacy wrappers without inventing missing JSON', () => {
    expect(
      parseAssessmentResponse(
        `<thinking>legacy text</thinking>\n${JSON.stringify(flat)}`
      ).confidence
    ).toBe(87);
    expect(
      parseAssessmentResponse('```json\n' + JSON.stringify(flat) + '\n```')
        .confidence
    ).toBe(87);
    expect(() =>
      parseAssessmentResponse('<thinking>unfinished ' + JSON.stringify(flat))
    ).toThrow('invalid_json');
  });

  it('rejects invalid confidence and missing hazards rather than assuming safety', () => {
    expect(() =>
      parseAssessmentResponse(JSON.stringify({ ...flat, confidence: 110 }))
    ).toThrow('invalid_schema');
    expect(() =>
      parseAssessmentResponse(
        JSON.stringify({ ...flat, safetyHazards: undefined })
      )
    ).toThrow('invalid_schema');
  });
});
