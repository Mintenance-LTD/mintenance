/**
 * Prompt Builder for GPT-4 Vision (Orchestration path)
 *
 * P2: This is now a thin wrapper that delegates to the canonical prompt-builder.ts
 * to eliminate prompt drift between the two orchestration paths.
 *
 * The canonical source of truth for prompts is: ../prompt-builder.ts
 */

import {
    buildSystemPrompt as canonicalBuildSystemPrompt,
    buildUserPrompt as canonicalBuildUserPrompt,
} from '../prompt-builder';
import { buildEvidenceSummary as canonicalBuildEvidenceSummary } from '../evidence-processor';
import type {
    AssessmentContext,
    RoboflowDetection,
    VisionAnalysisSummary,
} from '../types';

export class PromptBuilder {
    /**
     * Build system prompt for GPT-4 Vision
     * Delegates to canonical prompt-builder.ts
     */
    static buildSystemPrompt(damageTypes?: string[]): string {
        return canonicalBuildSystemPrompt(damageTypes);
    }

    /**
     * Build evidence summary from detections and vision analysis
     * Delegates to canonical evidence-processor.ts
     */
    static buildEvidenceSummary(
        roboflowDetections: RoboflowDetection[],
        visionAnalysis: VisionAnalysisSummary | null
    ): string {
        return canonicalBuildEvidenceSummary(roboflowDetections, visionAnalysis) ?? 'No machine learning evidence available.';
    }

    /**
     * Build user prompt with context and evidence
     * Delegates to canonical prompt-builder.ts
     */
    static buildUserPrompt(
        context: AssessmentContext | undefined,
        evidenceSummary: string,
        hasDetectionEvidence: boolean
    ): string {
        return canonicalBuildUserPrompt(context, evidenceSummary, hasDetectionEvidence);
    }

    /**
     * Build messages array for GPT-4 Vision API
     */
    static buildMessages(
        imageUrls: string[],
        context?: AssessmentContext,
        roboflowDetections?: RoboflowDetection[],
        visionAnalysis?: VisionAnalysisSummary | null
    ): Array<{
        role: string;
        content: string | Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }>;
    }> {
        const systemPrompt = this.buildSystemPrompt();
        const evidenceSummary = this.buildEvidenceSummary(
            roboflowDetections || [],
            visionAnalysis || null
        );
        const hasDetectionEvidence =
            (roboflowDetections && roboflowDetections.length > 0) || !!visionAnalysis;
        const userPrompt = this.buildUserPrompt(context, evidenceSummary, hasDetectionEvidence);

        // Limit to 4 images (GPT-4 Vision limit)
        const imagesToAnalyze = imageUrls.slice(0, 4);

        return [
            { role: 'system', content: systemPrompt },
            {
                role: 'user',
                content: [
                    { type: 'text', text: userPrompt },
                    ...imagesToAnalyze.map((url) => ({
                        type: 'image_url',
                        image_url: { url, detail: 'high' },
                    })),
                ],
            },
        ];
    }
}
