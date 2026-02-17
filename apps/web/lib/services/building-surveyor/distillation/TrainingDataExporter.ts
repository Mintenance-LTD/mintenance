/**
 * Training Data Exporter
 *
 * Converts vlm_training_buffer rows into Qwen2.5-VL-compatible
 * conversation JSONL for LoRA fine-tuning.
 *
 * Phase 3 of the teacher-student distillation pipeline.
 */

import { logger } from '@mintenance/shared';
import { ExperienceBufferService } from './ExperienceBufferService';
import type { VLMTrainingExample } from './types';

interface ExportOptions {
  minPriority?: number;
  minQuality?: 'high' | 'medium';
  maxExamples?: number;
  balanceCategories?: boolean;
}

interface QwenConversation {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }>;
}

export class TrainingDataExporter {
  /**
   * Export top-priority examples to Qwen2.5-VL conversation JSONL format.
   * Each line is a complete conversation: system → user (with images) → assistant (teacher JSON).
   */
  static async exportToQwenFormat(options: ExportOptions = {}): Promise<{
    jsonl: string;
    count: number;
    ids: string[];
  }> {
    const limit = options.maxExamples ?? 500;
    const minQuality = options.minQuality ?? 'medium';

    let examples = await ExperienceBufferService.getTopExamples(limit, minQuality);

    if (options.minPriority) {
      examples = examples.filter((e) => e.priorityScore >= options.minPriority!);
    }

    if (options.balanceCategories) {
      examples = this.balanceByCategory(examples, limit);
    }

    const lines: string[] = [];
    const ids: string[] = [];

    for (const example of examples) {
      const conversation = this.toQwenConversation(example);
      lines.push(JSON.stringify(conversation));
      ids.push(example.id);
    }

    return {
      jsonl: lines.join('\n'),
      count: lines.length,
      ids,
    };
  }

  /**
   * Mark exported examples as used after a training round.
   */
  static async markExported(ids: string[], trainingRound: number): Promise<void> {
    await ExperienceBufferService.markUsed(ids, trainingRound);
  }

  /**
   * Generic system prompt for training data — strips proprietary prompt engineering.
   * Retains the structural instruction so the student learns the output schema.
   */
  private static readonly TRAINING_SYSTEM_PROMPT =
    'You are a building damage assessment AI. Analyze the provided images and return a JSON object with these sections: damageAssessment, safetyHazards, compliance, insuranceRisk, urgency, homeownerExplanation, contractorAdvice. Be precise, safety-conscious, and evidence-based.';

  /**
   * Convert a single training example into the Qwen2.5-VL conversation format.
   * Uses a generic system prompt to avoid leaking proprietary prompt engineering.
   */
  static toQwenConversation(example: VLMTrainingExample): QwenConversation {
    // Build user content: text prompt + image URLs
    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: 'text', text: example.userPrompt },
    ];

    for (const url of example.imageUrls) {
      userContent.push({
        type: 'image_url',
        image_url: { url },
      });
    }

    // Use human-corrected response if available, else teacher response
    const assistantContent = JSON.stringify(example.teacherResponse);

    return {
      messages: [
        { role: 'system', content: this.TRAINING_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
        { role: 'assistant', content: assistantContent },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Balance examples across categories so no single damage type dominates.
   * Takes the top N/numCategories from each category.
   */
  private static balanceByCategory(
    examples: VLMTrainingExample[],
    targetTotal: number
  ): VLMTrainingExample[] {
    const byCategory: Record<string, VLMTrainingExample[]> = {};
    for (const ex of examples) {
      const cat = ex.damageCategory;
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(ex);
    }

    const numCategories = Object.keys(byCategory).length;
    if (numCategories === 0) return [];

    const perCategory = Math.ceil(targetTotal / numCategories);
    const balanced: VLMTrainingExample[] = [];

    for (const cat of Object.keys(byCategory)) {
      // Already sorted by priority from the DB query
      const slice = byCategory[cat].slice(0, perCategory);
      balanced.push(...slice);
    }

    // Sort the balanced set by priority (highest first)
    balanced.sort((a, b) => b.priorityScore - a.priorityScore);
    return balanced.slice(0, targetTotal);
  }
}
