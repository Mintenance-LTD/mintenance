import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBuildingAssessment } from '../useBuildingAssessment';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';

vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: vi.fn(async () => ({ 'x-csrf-token': 'test-csrf' })),
}));

const valid = {
  assessmentId: 'assessment-1',
  damageAssessment: {
    damageType: 'damp',
    severity: 'minor',
    confidence: 60,
    description: 'Visible staining',
    evidence: ['photo-a'],
  },
  safetyHazards: {
    hasSafetyHazards: false,
    overallSafetyScore: 50,
    criticalFlags: [],
  },
  urgency: { urgency: 'low', reasoning: 'Arrange a professional review' },
};

afterEach(() => vi.unstubAllGlobals());

describe('building assessment response handling', () => {
  it('adapts the server hazard and compliance lists without dropping evidence', async () => {
    const serverFields = {
      safetyHazards: {
        hasCriticalHazards: true,
        overallSafetyScore: 20,
        hazards: [
          {
            type: 'electrical',
            severity: 'critical',
            location: 'Kitchen',
            description: 'Exposed wiring',
            urgency: 'immediate',
          },
        ],
      },
      compliance: {
        complianceScore: 30,
        requiresProfessionalInspection: true,
        complianceIssues: [
          {
            issue: 'Electrical review needed',
            severity: 'warning',
            description: 'Review the installation',
            recommendation: 'Contact a qualified electrician',
          },
        ],
      },
    } satisfies Pick<Phase1BuildingAssessment, 'safetyHazards' | 'compliance'>;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ...valid,
          ...serverFields,
          decisionResult: { decision: 'escalate' },
        }),
      })
    );
    const ui = renderHook(() => useBuildingAssessment());
    await act(async () => {
      await ui.result.current.assessBuilding(['photo-a']);
    });
    expect(ui.result.current.assessmentError).toBeNull();
    expect(ui.result.current.assessment?.safetyHazards).toEqual({
      ...serverFields.safetyHazards,
      hasSafetyHazards: true,
      criticalFlags: ['Exposed wiring'],
    });
    expect(ui.result.current.assessment?.compliance).toEqual({
      ...serverFields.compliance,
      flags: ['Electrical review needed'],
    });
    expect(ui.result.current.assessment?.decisionResult?.reason).toBe('');
  });

  it('keeps an explicit critical-hazard flag visible even without hazard descriptions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ...valid,
          safetyHazards: {
            hasCriticalHazards: true,
            overallSafetyScore: 20,
            hazards: [],
          },
        }),
      })
    );
    const ui = renderHook(() => useBuildingAssessment());
    await act(async () => {
      await ui.result.current.assessBuilding(['photo-a']);
    });
    expect(ui.result.current.assessment?.safetyHazards.hasSafetyHazards).toBe(
      true
    );
    expect(ui.result.current.assessment?.safetyHazards.criticalFlags).toEqual([
      'Critical hazards reported; professional review required.',
    ]);
  });

  it('retains valid evidence and identifiers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => valid,
      })
    );
    const ui = renderHook(() => useBuildingAssessment());
    await act(async () => {
      await ui.result.current.assessBuilding(['photo-a']);
    });
    expect(ui.result.current.assessment).toEqual(valid);
    expect(ui.result.current.assessmentError).toBeNull();
  });

  it.each([
    null,
    { properties: [] },
    { ...valid, damageAssessment: null },
    { ...valid, safetyHazards: { criticalFlags: 'invalid' } },
    { ...valid, estimatedCost: { min: 'invalid' } },
  ])(
    'rejects malformed results without exposing them to the form: %j',
    async (data) => {
      const onError = vi.fn();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, json: async () => data })
      );
      const ui = renderHook(() => useBuildingAssessment({ onError }));
      await act(async () => {
        expect(await ui.result.current.assessBuilding(['photo-a'])).toBeNull();
      });
      expect(ui.result.current.assessment).toBeNull();
      expect(ui.result.current.assessmentError).toContain(
        'continue with a written description'
      );
      expect(ui.result.current.isAssessing).toBe(false);
      expect(onError).toHaveBeenCalledOnce();
    }
  );

  it('clears the previous result when a replacement response is invalid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => valid })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => {
            throw new SyntaxError('Unexpected token');
          },
        })
    );
    const ui = renderHook(() => useBuildingAssessment());
    await act(async () => {
      await ui.result.current.assessBuilding(['photo-a']);
    });
    await act(async () => {
      await ui.result.current.assessBuilding(['photo-b']);
    });
    expect(ui.result.current.assessment).toBeNull();
    expect(ui.result.current.assessmentError).toContain('incomplete result');
    expect(ui.result.current.assessmentError).not.toContain('Unexpected token');
  });
});
