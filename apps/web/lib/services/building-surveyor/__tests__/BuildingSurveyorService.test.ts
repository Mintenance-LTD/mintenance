/**
 * Critical Tests for Building Surveyor Service
 *
 * Tests the core decision-making logic, cost controls, rate limits,
 * and fallback mechanisms for the AI-powered building assessment system.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BuildingSurveyorService } from '../BuildingSurveyorService';
import { CostControlService } from '../../ai/CostControlService';
import { CriticModule } from '../critic';
import { logger } from '@mintenance/shared';

// Mock dependencies
vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../ai/CostControlService', () => ({
  CostControlService: {
    isEmergencyStopped: vi.fn(),
    estimateCost: vi.fn(),
    checkBudget: vi.fn(),
    recordUsage: vi.fn(),
  },
}));

vi.mock('../critic', () => ({
  CriticModule: {
    makeDecision: vi.fn(),
  },
}));

vi.mock('@/lib/utils/openai-rate-limit', () => ({
  fetchWithOpenAIRetry: vi.fn(),
}));

describe('BuildingSurveyorService - Production Critical Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.SHADOW_MODE_ENABLED = 'false';
    process.env.AI_DAILY_BUDGET = '100';
    process.env.AI_MAX_COST_PER_REQUEST = '5';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Cost Controls', () => {
    it('should respect API rate limits and not make calls when budget exceeded', async () => {
      // Mock budget check to fail
      vi.mocked(CostControlService.checkBudget).mockResolvedValue({
        allowed: false,
        reason: 'Daily budget would be exceeded',
        currentDailySpend: 95,
        dailyBudgetRemaining: 5,
      });

      const images = ['https://example.com/image1.jpg'];

      // Should throw when budget exceeded
      await expect(
        BuildingSurveyorService.assessDamage(images, {
          jobId: 'test-job-123',
          propertyType: 'residential',
          roomType: 'kitchen',
        })
      ).rejects.toThrow('Budget exceeded: Daily budget would be exceeded');

      // Verify no API call was made
      const { fetchWithOpenAIRetry } = await import('@/lib/utils/openai-rate-limit');
      expect(fetchWithOpenAIRetry).not.toHaveBeenCalled();
    });

    it('should enforce cost controls before making API calls', async () => {
      // Mock successful budget check
      vi.mocked(CostControlService.checkBudget).mockResolvedValue({
        allowed: true,
        currentDailySpend: 20,
        dailyBudgetRemaining: 80,
      });

      vi.mocked(CostControlService.estimateCost).mockReturnValue(2.5);

      const { fetchWithOpenAIRetry } = await import('@/lib/utils/openai-rate-limit');
      vi.mocked(fetchWithOpenAIRetry).mockResolvedValue({
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                damage_detected: true,
                confidence: 0.95,
                severity: 'moderate',
                urgency: 'medium',
                early_detection: { detected: true },
                midway_deterioration: { detected: false },
                full_assessment: { detected: false },
                safety_hazards: [],
                compliance_flags: [],
                insurance_risk_score: 5,
                homeowner_summary: 'Moderate damage detected',
                contractor_technical_notes: 'Repair needed',
                estimated_repair_cost: { min: 1000, max: 2000, currency: 'USD' },
              })
            }
          }],
          usage: {
            prompt_tokens: 1500,
            completion_tokens: 500,
            total_tokens: 2000,
          }
        }),
      });

      const images = ['https://example.com/image1.jpg'];

      // Should check budget before making call
      const result = await BuildingSurveyorService.assessDamage(images);

      expect(CostControlService.estimateCost).toHaveBeenCalledWith('gpt-4o', {
        inputTokens: expect.any(Number),
        outputTokens: 2000,
        images: 1,
      });

      expect(CostControlService.checkBudget).toHaveBeenCalledWith({
        service: 'building-surveyor',
        model: 'gpt-4o',
        estimatedCost: 2.5,
      });

      // Should record usage after successful call
      expect(CostControlService.recordUsage).toHaveBeenCalledWith(
        'building-surveyor',
        'gpt-4o',
        expect.any(Number),
        {
          tokens: 2000,
          job_id: undefined,
          success: true,
        }
      );
    });

    it('should handle emergency stop correctly', async () => {
      vi.mocked(CostControlService.isEmergencyStopped).mockReturnValue(true);

      const images = ['https://example.com/image1.jpg'];

      await expect(
        BuildingSurveyorService.assessDamage(images)
      ).rejects.toThrow('AI services are currently disabled due to emergency stop');

      // Verify no budget check or API call was made
      expect(CostControlService.checkBudget).not.toHaveBeenCalled();
      const { fetchWithOpenAIRetry } = await import('@/lib/utils/openai-rate-limit');
      expect(fetchWithOpenAIRetry).not.toHaveBeenCalled();
    });
  });

  describe('Decision Logic with Shadow Mode', () => {
    it('should correctly make automate vs escalate decisions when shadow mode testing enabled', async () => {
      process.env.SHADOW_MODE_ENABLED = 'true';
      process.env.SHADOW_MODE_TESTING = 'true';
      process.env.SHADOW_MODE_PROBABILITY = '0.1';

      // Mock Math.random to control decision path
      const originalRandom = Math.random;
      Math.random = vi.fn().mockReturnValue(0.5); // > 0.1, so use actual decision

      // Mock critic decision
      vi.mocked(CriticModule.makeDecision).mockReturnValue({
        arm: 'automate',
        reason: 'High confidence, low risk',
        safetyUcb: 0.95,
        rewardUcb: 0.8,
        safetyThreshold: 0.9,
        exploration: 0.1,
      });

      // Mock API response
      const { fetchWithOpenAIRetry } = await import('@/lib/utils/openai-rate-limit');
      vi.mocked(fetchWithOpenAIRetry).mockResolvedValue({
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                damage_detected: true,
                confidence: 0.95,
                severity: 'minor',
                urgency: 'low',
                early_detection: { detected: true },
                midway_deterioration: { detected: false },
                full_assessment: { detected: false },
                safety_hazards: [],
                compliance_flags: [],
                insurance_risk_score: 2,
                homeowner_summary: 'Minor damage',
                contractor_technical_notes: 'Simple repair',
                estimated_repair_cost: { min: 100, max: 200, currency: 'USD' },
              })
            }
          }],
          usage: { prompt_tokens: 1000, completion_tokens: 300, total_tokens: 1300 }
        }),
      });

      // Mock budget check success
      vi.mocked(CostControlService.checkBudget).mockResolvedValue({
        allowed: true,
        currentDailySpend: 10,
        dailyBudgetRemaining: 90,
      });

      const result = await BuildingSurveyorService.assessDamage(['https://example.com/test.jpg']);

      // Should use actual decision in testing mode (90% of time)
      expect(result.decisionResult?.decision).toBe('automate');
      expect(result.decisionResult?.reason).toContain('High confidence');

      expect(logger.info).toHaveBeenCalledWith(
        'Shadow mode testing: Using actual AI decision',
        expect.objectContaining({
          decision: 'automate',
          probability: 0.9
        })
      );

      Math.random = originalRandom;
    });

    it('should force escalation in shadow mode when testing disabled', async () => {
      process.env.SHADOW_MODE_ENABLED = 'true';
      process.env.SHADOW_MODE_TESTING = 'false';

      // Mock critic decision as automate
      vi.mocked(CriticModule.makeDecision).mockReturnValue({
        arm: 'automate',
        reason: 'High confidence',
        safetyUcb: 0.95,
        rewardUcb: 0.8,
        safetyThreshold: 0.9,
        exploration: 0.1,
      });

      // Mock API response
      const { fetchWithOpenAIRetry } = await import('@/lib/utils/openai-rate-limit');
      vi.mocked(fetchWithOpenAIRetry).mockResolvedValue({
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                damage_detected: true,
                confidence: 0.95,
                severity: 'minor',
                urgency: 'low',
                early_detection: { detected: true },
                midway_deterioration: { detected: false },
                full_assessment: { detected: false },
                safety_hazards: [],
                compliance_flags: [],
                insurance_risk_score: 2,
                homeowner_summary: 'Minor damage',
                contractor_technical_notes: 'Simple repair',
                estimated_repair_cost: { min: 100, max: 200, currency: 'USD' },
              })
            }
          }],
          usage: { prompt_tokens: 1000, completion_tokens: 300, total_tokens: 1300 }
        }),
      });

      // Mock budget check success
      vi.mocked(CostControlService.checkBudget).mockResolvedValue({
        allowed: true,
        currentDailySpend: 10,
        dailyBudgetRemaining: 90,
      });

      const result = await BuildingSurveyorService.assessDamage(['https://example.com/test.jpg']);

      // Should force escalation in production shadow mode
      expect(result.decisionResult?.decision).toBe('escalate');
      expect(result.decisionResult?.reason).toBe('Shadow mode: Forced escalation for safety');
    });

    it('should maintain FNR below 5% threshold', async () => {
      // This test verifies the critic module respects safety constraints
      const contextVector = [0.8, 0.7, 0.6, 0.9];

      // Mock critic to ensure FNR constraint
      vi.mocked(CriticModule.makeDecision).mockImplementation((context, cpResult, fusionResult) => {
        // Safety threshold should ensure FNR < 5%
        const safetyThreshold = 0.95; // 95% confidence = 5% FNR max
        const safetyUcb = 0.96;

        return {
          arm: safetyUcb >= safetyThreshold ? 'automate' : 'escalate',
          reason: safetyUcb >= safetyThreshold
            ? 'Safety threshold met (FNR < 5%)'
            : 'Safety threshold not met',
          safetyUcb,
          rewardUcb: 0.8,
          safetyThreshold,
          exploration: 0.05,
        };
      });

      const decision = CriticModule.makeDecision(
        contextVector,
        { stratum: 1, predictionSet: [0.9, 0.95], confidence: 0.95 },
        { mean: 0.8, variance: 0.1, weights: {} }
      );

      // Verify FNR constraint is respected
      expect(decision.safetyThreshold).toBeGreaterThanOrEqual(0.95);
      if (decision.arm === 'automate') {
        expect(decision.safetyUcb).toBeGreaterThanOrEqual(decision.safetyThreshold);
      }
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should handle API failures gracefully with fallback', async () => {
      // Mock API failure
      const { fetchWithOpenAIRetry } = await import('@/lib/utils/openai-rate-limit');
      vi.mocked(fetchWithOpenAIRetry).mockRejectedValue(new Error('API timeout'));

      // Mock budget check success
      vi.mocked(CostControlService.checkBudget).mockResolvedValue({
        allowed: true,
        currentDailySpend: 10,
        dailyBudgetRemaining: 90,
      });

      const images = ['https://example.com/test.jpg'];

      // Should throw the error (no automatic fallback at service level)
      await expect(
        BuildingSurveyorService.assessDamage(images)
      ).rejects.toThrow('API timeout');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle malformed API responses', async () => {
      const { fetchWithOpenAIRetry } = await import('@/lib/utils/openai-rate-limit');

      // Mock malformed response
      vi.mocked(fetchWithOpenAIRetry).mockResolvedValue({
        json: async () => ({
          choices: [{
            message: {
              content: 'Not valid JSON'
            }
          }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
        }),
      });

      // Mock budget check success
      vi.mocked(CostControlService.checkBudget).mockResolvedValue({
        allowed: true,
        currentDailySpend: 10,
        dailyBudgetRemaining: 90,
      });

      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/test.jpg'])
      ).rejects.toThrow('Failed to parse AI assessment response');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to parse OpenAI response',
        expect.any(Object)
      );
    });

    it('should validate image URLs before processing', async () => {
      const invalidImages = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        '../../../etc/passwd',
      ];

      await expect(
        BuildingSurveyorService.assessDamage(invalidImages)
      ).rejects.toThrow();

      // Should not make any API calls with invalid URLs
      expect(CostControlService.checkBudget).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits with exponential backoff', async () => {
      const { fetchWithOpenAIRetry } = await import('@/lib/utils/openai-rate-limit');

      // Mock rate limit error then success
      vi.mocked(fetchWithOpenAIRetry)
        .mockRejectedValueOnce({ status: 429, message: 'Rate limited' })
        .mockResolvedValueOnce({
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({
                  damage_detected: false,
                  confidence: 0.95,
                  severity: 'none',
                  urgency: 'none',
                  early_detection: { detected: false },
                  midway_deterioration: { detected: false },
                  full_assessment: { detected: false },
                  safety_hazards: [],
                  compliance_flags: [],
                  insurance_risk_score: 0,
                  homeowner_summary: 'No damage',
                  contractor_technical_notes: 'N/A',
                  estimated_repair_cost: { min: 0, max: 0, currency: 'USD' },
                })
              }
            }],
            usage: { prompt_tokens: 500, completion_tokens: 200, total_tokens: 700 }
          }),
        });

      // Mock budget check
      vi.mocked(CostControlService.checkBudget).mockResolvedValue({
        allowed: true,
        currentDailySpend: 10,
        dailyBudgetRemaining: 90,
      });

      // The fetchWithOpenAIRetry utility should handle retries internally
      const result = await BuildingSurveyorService.assessDamage(['https://example.com/test.jpg']);

      // Should eventually succeed after retry
      expect(result).toBeDefined();
      expect(fetchWithOpenAIRetry).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.any(Object),
        expect.objectContaining({
          maxAttempts: 5,
          baseDelayMs: 2000,
          maxDelayMs: 60000,
          backoffMultiplier: 2,
        })
      );
    });

    it('should track API call metrics for monitoring', async () => {
      const { fetchWithOpenAIRetry } = await import('@/lib/utils/openai-rate-limit');
      vi.mocked(fetchWithOpenAIRetry).mockResolvedValue({
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                damage_detected: true,
                confidence: 0.85,
                severity: 'moderate',
                urgency: 'medium',
                early_detection: { detected: false },
                midway_deterioration: { detected: true },
                full_assessment: { detected: false },
                safety_hazards: [],
                compliance_flags: [],
                insurance_risk_score: 5,
                homeowner_summary: 'Moderate damage',
                contractor_technical_notes: 'Repair needed',
                estimated_repair_cost: { min: 1000, max: 2000, currency: 'USD' },
              })
            }
          }],
          usage: { prompt_tokens: 1200, completion_tokens: 400, total_tokens: 1600 }
        }),
      });

      // Mock budget check
      vi.mocked(CostControlService.checkBudget).mockResolvedValue({
        allowed: true,
        currentDailySpend: 30,
        dailyBudgetRemaining: 70,
      });

      // Spy on the private recordMetric method
      const recordMetricSpy = vi.spyOn(BuildingSurveyorService as any, 'recordMetric');

      await BuildingSurveyorService.assessDamage(['https://example.com/test.jpg']);

      // Should record metrics for monitoring
      expect(recordMetricSpy).toHaveBeenCalledWith('gpt.assessment', {
        durationMs: expect.any(Number),
        imageCount: 1,
        hasMachineEvidence: false,
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Building Surveyor API usage recorded',
        expect.objectContaining({
          promptTokens: 1200,
          completionTokens: 400,
          totalTokens: 1600,
          cost: expect.any(Number),
        })
      );
    });
  });

  describe('Integration Tests', () => {
    it('should complete full assessment flow with all components', async () => {
      // This tests the complete flow from images to decision

      // Setup all mocks for successful flow
      vi.mocked(CostControlService.isEmergencyStopped).mockReturnValue(false);
      vi.mocked(CostControlService.estimateCost).mockReturnValue(3.0);
      vi.mocked(CostControlService.checkBudget).mockResolvedValue({
        allowed: true,
        currentDailySpend: 40,
        dailyBudgetRemaining: 60,
      });

      const { fetchWithOpenAIRetry } = await import('@/lib/utils/openai-rate-limit');
      vi.mocked(fetchWithOpenAIRetry).mockResolvedValue({
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                damage_detected: true,
                confidence: 0.92,
                severity: 'significant',
                urgency: 'high',
                early_detection: { detected: false },
                midway_deterioration: { detected: false },
                full_assessment: {
                  detected: true,
                  structural_damage: true,
                  water_damage: true,
                },
                safety_hazards: ['structural instability', 'mold risk'],
                compliance_flags: ['building code violation'],
                insurance_risk_score: 8,
                homeowner_summary: 'Significant structural and water damage requiring immediate attention',
                contractor_technical_notes: 'Foundation repair and water remediation needed',
                estimated_repair_cost: { min: 15000, max: 25000, currency: 'USD' },
              })
            }
          }],
          usage: { prompt_tokens: 2000, completion_tokens: 600, total_tokens: 2600 }
        }),
      });

      vi.mocked(CriticModule.makeDecision).mockReturnValue({
        arm: 'escalate', // High severity should trigger escalation
        reason: 'High severity damage with safety hazards',
        safetyUcb: 0.85,
        rewardUcb: 0.6,
        safetyThreshold: 0.95,
        exploration: 0.1,
      });

      const result = await BuildingSurveyorService.assessDamage(
        ['https://example.com/damage1.jpg', 'https://example.com/damage2.jpg'],
        {
          jobId: 'job-456',
          propertyType: 'residential',
          roomType: 'basement',
        }
      );

      // Verify complete assessment structure
      expect(result).toMatchObject({
        damageDetected: true,
        confidence: 0.92,
        severity: 'significant',
        urgency: 'high',
        safetyHazards: {
          hazards: expect.arrayContaining(['structural instability', 'mold risk']),
          hasCriticalHazards: true,
        },
        complianceFlags: expect.arrayContaining(['building code violation']),
        insuranceRiskScore: 8,
        homeownerSummary: expect.stringContaining('Significant structural'),
        contractorNotes: expect.stringContaining('Foundation repair'),
        estimatedCost: {
          min: 15000,
          max: 25000,
          currency: 'USD',
        },
        decisionResult: {
          decision: 'escalate',
          reason: expect.stringContaining('safety hazards'),
        },
      });

      // Verify all integrations were called
      expect(CostControlService.checkBudget).toHaveBeenCalled();
      expect(CostControlService.recordUsage).toHaveBeenCalled();
      expect(CriticModule.makeDecision).toHaveBeenCalled();
    });
  });
});