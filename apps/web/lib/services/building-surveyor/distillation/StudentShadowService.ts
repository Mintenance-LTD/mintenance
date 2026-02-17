/**
 * Student Shadow Service
 *
 * Runs the student VLM alongside every GPT-4o teacher call (fire-and-forget),
 * compares their outputs field-by-field, and logs the comparison to
 * vlm_shadow_comparisons for monitoring and experience buffer population.
 *
 * Phase 1: Zero user-facing behavior changes. Only activates when
 * MINT_AI_VLM_ENDPOINT is set.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { callMintAiVLM } from '../generator/AssessmentGenerator';
import { CostControlService } from '../../ai/CostControlService';
import type { GeneratorMessage } from '../generator/AssessmentGenerator';
import type { Phase1BuildingAssessment } from '../types';
import type { ShadowComparisonResult } from './types';

const STUDENT_MODEL_NAME = 'qwen2.5-vl-3b';

export class StudentShadowService {
  /**
   * Fire-and-forget: call the student VLM with the same messages the teacher
   * received, compare outputs, and log the comparison. Never throws — all
   * errors are caught and logged.
   */
  static async runShadowComparison(
    assessmentId: string,
    imageUrls: string[],
    teacherAssessment: Phase1BuildingAssessment,
    messages: GeneratorMessage[],
    apiKey: string
  ): Promise<void> {
    const startMs = Date.now();

    try {
      // Budget check — skip shadow if daily budget is nearly exhausted
      const budgetStatus = await CostControlService.getBudgetStatus();
      if (budgetStatus.daily.percentage >= 90) {
        logger.debug('Skipping shadow comparison — daily budget >= 90%', {
          service: 'StudentShadowService',
        });
        return;
      }

      // Call the student VLM with the same prompt
      const studentResult = await callMintAiVLM(messages, apiKey);
      const latencyMs = Date.now() - startMs;

      // Parse student output
      let studentAssessment: Phase1BuildingAssessment | null = null;
      let parseSuccess = false;

      try {
        const parsed = JSON.parse(studentResult.content);
        studentAssessment = this.coerceToAssessment(parsed);
        parseSuccess = true;
      } catch {
        logger.debug('Student VLM produced unparseable JSON', {
          service: 'StudentShadowService',
          assessmentId,
        });
      }

      // Record cost
      const costUsd = CostControlService.estimateCost(STUDENT_MODEL_NAME, {
        inputTokens: studentResult.usage?.prompt_tokens,
        outputTokens: studentResult.usage?.completion_tokens,
      });
      await CostControlService.recordUsage(
        'building-surveyor-shadow',
        STUDENT_MODEL_NAME,
        costUsd,
        { success: parseSuccess }
      );

      // Compare outputs
      const comparison = this.compareAssessments(
        assessmentId,
        teacherAssessment,
        studentAssessment,
        parseSuccess,
        latencyMs,
        costUsd,
        imageUrls.length
      );

      // Write to vlm_shadow_comparisons and capture ID
      const shadowComparisonId = await this.storeShadowComparison(comparison, teacherAssessment, studentAssessment);

      // Populate experience buffer for future training (Phase 2)
      const { ExperienceBufferService } = await import('./ExperienceBufferService');
      await ExperienceBufferService.recordExperience(
        comparison,
        shadowComparisonId ?? undefined,
        imageUrls,
        typeof messages[0]?.content === 'string' ? messages[0].content : '',
        typeof messages[1]?.content === 'string' ? messages[1].content : JSON.stringify(messages[1]?.content ?? ''),
        teacherAssessment,
        studentAssessment
      ).catch((err) => {
        logger.debug('Experience buffer recording failed (non-critical)', {
          service: 'StudentShadowService',
          error: err instanceof Error ? err.message : String(err),
        });
      });

      // Update student calibration for routing gate (Phase 5)
      const { CalibrationFeedbackService } = await import('./CalibrationFeedbackService');
      await CalibrationFeedbackService.updateFromShadowComparison(comparison).catch((err) => {
        logger.debug('Calibration update failed (non-critical)', {
          service: 'StudentShadowService',
          error: err instanceof Error ? err.message : String(err),
        });
      });

      logger.info('Shadow comparison completed', {
        service: 'StudentShadowService',
        assessmentId,
        agreement: comparison.overallAgreement.toFixed(2),
        safetyRecall: comparison.safetyRecall.toFixed(2),
        parseSuccess,
        latencyMs,
      });
    } catch (error) {
      logger.debug('Shadow comparison failed (non-critical)', {
        service: 'StudentShadowService',
        assessmentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Pure-function comparison of teacher and student outputs.
   */
  static compareAssessments(
    assessmentId: string,
    teacher: Phase1BuildingAssessment,
    student: Phase1BuildingAssessment | null,
    parseSuccess: boolean,
    latencyMs: number,
    costUsd: number,
    imageCount: number
  ): ShadowComparisonResult {
    if (!student) {
      return {
        assessmentId,
        teacherModel: 'gpt-4o',
        studentModel: STUDENT_MODEL_NAME,
        damageTypeMatch: false,
        severityMatch: false,
        urgencyMatch: false,
        confidenceDelta: 0,
        safetyRecall: 0,
        safetyPrecision: 0,
        overallAgreement: 0,
        studentConfidence: 0,
        teacherConfidence: teacher.damageAssessment.confidence,
        studentParseSuccess: parseSuccess,
        latencyMs,
        costUsd,
        damageCategory: teacher.damageAssessment.damageType,
        imageCount,
      };
    }

    const damageTypeMatch =
      teacher.damageAssessment.damageType.toLowerCase() ===
      student.damageAssessment.damageType.toLowerCase();

    const severityMatch =
      teacher.damageAssessment.severity === student.damageAssessment.severity;

    const urgencyMatch =
      teacher.urgency.urgency === student.urgency.urgency;

    const confidenceDelta =
      student.damageAssessment.confidence - teacher.damageAssessment.confidence;

    // Safety recall: what fraction of teacher's hazards did the student catch?
    const teacherHazards = teacher.safetyHazards.hazards;
    const studentHazards = student.safetyHazards.hazards;

    let safetyRecall = 1;
    let safetyPrecision = 1;

    if (teacherHazards.length > 0) {
      const caught = teacherHazards.filter((th) =>
        studentHazards.some(
          (sh) => sh.type.toLowerCase() === th.type.toLowerCase()
        )
      ).length;
      safetyRecall = caught / teacherHazards.length;
    }

    if (studentHazards.length > 0) {
      const correct = studentHazards.filter((sh) =>
        teacherHazards.some(
          (th) => th.type.toLowerCase() === sh.type.toLowerCase()
        )
      ).length;
      safetyPrecision = correct / studentHazards.length;
    }

    // Weighted overall agreement
    const overallAgreement =
      (damageTypeMatch ? 0.35 : 0) +
      (severityMatch ? 0.25 : 0) +
      (urgencyMatch ? 0.15 : 0) +
      safetyRecall * 0.25;

    return {
      assessmentId,
      teacherModel: 'gpt-4o',
      studentModel: STUDENT_MODEL_NAME,
      damageTypeMatch,
      severityMatch,
      urgencyMatch,
      confidenceDelta,
      safetyRecall,
      safetyPrecision,
      overallAgreement,
      studentConfidence: student.damageAssessment.confidence,
      teacherConfidence: teacher.damageAssessment.confidence,
      studentParseSuccess: parseSuccess,
      latencyMs,
      costUsd,
      damageCategory: teacher.damageAssessment.damageType,
      imageCount,
    };
  }

  /**
   * Coerce a raw parsed object into a Phase1BuildingAssessment shape with
   * sensible defaults so comparison doesn't crash on partial student output.
   */
  private static coerceToAssessment(raw: Record<string, unknown>): Phase1BuildingAssessment {
    const da = (raw.damageAssessment ?? raw) as Record<string, unknown>;
    const sh = (raw.safetyHazards ?? {}) as Record<string, unknown>;
    const comp = (raw.compliance ?? {}) as Record<string, unknown>;
    const ir = (raw.insuranceRisk ?? {}) as Record<string, unknown>;
    const urg = (raw.urgency ?? {}) as Record<string, unknown>;
    const he = (raw.homeownerExplanation ?? {}) as Record<string, unknown>;
    const ca = (raw.contractorAdvice ?? {}) as Record<string, unknown>;

    return {
      damageAssessment: {
        damageType: String(da.damageType ?? 'unknown'),
        severity: (['early', 'midway', 'full'].includes(String(da.severity))
          ? String(da.severity)
          : 'early') as 'early' | 'midway' | 'full',
        confidence: Number(da.confidence) || 0,
        location: String(da.location ?? 'Unknown'),
        description: String(da.description ?? ''),
        detectedItems: Array.isArray(da.detectedItems) ? da.detectedItems as string[] : [],
      },
      safetyHazards: {
        hazards: Array.isArray(sh.hazards)
          ? (sh.hazards as Array<Record<string, unknown>>).map((h) => ({
              type: String(h.type ?? ''),
              severity: String(h.severity ?? 'low') as 'low' | 'medium' | 'high' | 'critical',
              location: String(h.location ?? ''),
              description: String(h.description ?? ''),
              immediateAction: h.immediateAction ? String(h.immediateAction) : undefined,
              urgency: String(h.urgency ?? 'monitor') as 'immediate' | 'urgent' | 'soon' | 'planned' | 'monitor',
            }))
          : [],
        hasCriticalHazards: Boolean(sh.hasCriticalHazards),
        overallSafetyScore: Number(sh.overallSafetyScore) || 100,
      },
      compliance: {
        complianceIssues: Array.isArray(comp.complianceIssues)
          ? (comp.complianceIssues as Array<Record<string, unknown>>).map((c) => ({
              issue: String(c.issue ?? ''),
              regulation: c.regulation ? String(c.regulation) : undefined,
              severity: String(c.severity ?? 'info') as 'info' | 'warning' | 'violation',
              description: String(c.description ?? ''),
              recommendation: String(c.recommendation ?? ''),
            }))
          : [],
        requiresProfessionalInspection: Boolean(comp.requiresProfessionalInspection),
        complianceScore: Number(comp.complianceScore) || 100,
      },
      insuranceRisk: {
        riskFactors: Array.isArray(ir.riskFactors)
          ? (ir.riskFactors as Array<Record<string, unknown>>).map((r) => ({
              factor: String(r.factor ?? ''),
              severity: String(r.severity ?? 'low') as 'low' | 'medium' | 'high',
              impact: String(r.impact ?? ''),
            }))
          : [],
        riskScore: Number(ir.riskScore) || 0,
        premiumImpact: (['none', 'low', 'medium', 'high'].includes(String(ir.premiumImpact))
          ? String(ir.premiumImpact)
          : 'none') as 'none' | 'low' | 'medium' | 'high',
        mitigationSuggestions: Array.isArray(ir.mitigationSuggestions)
          ? ir.mitigationSuggestions as string[]
          : [],
      },
      urgency: {
        urgency: (['immediate', 'urgent', 'soon', 'planned', 'monitor'].includes(String(urg.urgency))
          ? String(urg.urgency)
          : 'monitor') as 'immediate' | 'urgent' | 'soon' | 'planned' | 'monitor',
        recommendedActionTimeline: String(urg.recommendedActionTimeline ?? 'Monitor'),
        estimatedTimeToWorsen: urg.estimatedTimeToWorsen ? String(urg.estimatedTimeToWorsen) : undefined,
        reasoning: String(urg.reasoning ?? ''),
        priorityScore: Number(urg.priorityScore) || 0,
      },
      homeownerExplanation: {
        whatIsIt: String(he.whatIsIt ?? ''),
        whyItHappened: String(he.whyItHappened ?? ''),
        whatToDo: String(he.whatToDo ?? ''),
      },
      contractorAdvice: {
        repairNeeded: Array.isArray(ca.repairNeeded) ? ca.repairNeeded as string[] : [],
        materials: Array.isArray(ca.materials)
          ? (ca.materials as Array<Record<string, unknown>>).map((m) => ({
              name: String(m.name ?? ''),
              quantity: String(m.quantity ?? ''),
              estimatedCost: Number(m.estimatedCost) || 0,
            }))
          : [],
        tools: Array.isArray(ca.tools) ? ca.tools as string[] : [],
        estimatedTime: String(ca.estimatedTime ?? 'Unknown'),
        estimatedCost: {
          min: Number((ca.estimatedCost as Record<string, unknown>)?.min) || 0,
          max: Number((ca.estimatedCost as Record<string, unknown>)?.max) || 0,
          recommended: Number((ca.estimatedCost as Record<string, unknown>)?.recommended) || 0,
        },
        complexity: (['low', 'medium', 'high'].includes(String(ca.complexity))
          ? String(ca.complexity)
          : 'medium') as 'low' | 'medium' | 'high',
      },
    };
  }

  /**
   * Aggregate shadow stats for a dashboard query.
   */
  static async getShadowStats(since?: Date): Promise<{
    total: number;
    avgAgreement: number;
    avgSafetyRecall: number;
    parseSuccessRate: number;
    byCategory: Record<string, { count: number; avgAgreement: number }>;
  }> {
    let query = serverSupabase
      .from('vlm_shadow_comparisons')
      .select('damage_category, overall_agreement, safety_recall, student_parse_success');

    if (since) {
      query = query.gte('created_at', since.toISOString());
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return { total: 0, avgAgreement: 0, avgSafetyRecall: 0, parseSuccessRate: 0, byCategory: {} };
    }

    const total = data.length;
    const avgAgreement = data.reduce((s, r) => s + (r.overall_agreement ?? 0), 0) / total;
    const avgSafetyRecall = data.reduce((s, r) => s + (r.safety_recall ?? 0), 0) / total;
    const parseSuccessRate = data.filter((r) => r.student_parse_success).length / total;

    const byCategory: Record<string, { count: number; avgAgreement: number }> = {};
    for (const row of data) {
      const cat = row.damage_category ?? 'unknown';
      if (!byCategory[cat]) byCategory[cat] = { count: 0, avgAgreement: 0 };
      byCategory[cat].count++;
      byCategory[cat].avgAgreement += row.overall_agreement ?? 0;
    }
    for (const cat of Object.keys(byCategory)) {
      byCategory[cat].avgAgreement /= byCategory[cat].count;
    }

    return { total, avgAgreement, avgSafetyRecall, parseSuccessRate, byCategory };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private static async storeShadowComparison(
    comparison: ShadowComparisonResult,
    teacherAssessment: Phase1BuildingAssessment,
    studentAssessment: Phase1BuildingAssessment | null
  ): Promise<string | null> {
    const { data, error } = await serverSupabase.from('vlm_shadow_comparisons').insert({
      assessment_id: comparison.assessmentId,
      teacher_model: comparison.teacherModel,
      student_model: comparison.studentModel,
      damage_type_match: comparison.damageTypeMatch,
      severity_match: comparison.severityMatch,
      urgency_match: comparison.urgencyMatch,
      confidence_delta: comparison.confidenceDelta,
      safety_recall: comparison.safetyRecall,
      safety_precision: comparison.safetyPrecision,
      overall_agreement: comparison.overallAgreement,
      student_confidence: comparison.studentConfidence,
      teacher_confidence: comparison.teacherConfidence,
      student_parse_success: comparison.studentParseSuccess,
      student_response: studentAssessment,
      teacher_response: teacherAssessment,
      latency_ms: comparison.latencyMs,
      cost_usd: comparison.costUsd,
      damage_category: comparison.damageCategory,
      image_count: comparison.imageCount,
    }).select('id').single();

    if (error) {
      logger.warn('Failed to store shadow comparison', {
        service: 'StudentShadowService',
        error: error.message,
      });
      return null;
    }

    return data?.id ?? null;
  }
}
