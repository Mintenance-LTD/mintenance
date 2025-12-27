import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { PersonalityAssessmentService } from '@/lib/services/verification/PersonalityAssessmentService';
import { requireCSRF } from '@/lib/csrf';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, BadRequestError } from '@/lib/errors/api-error';

const submitAssessmentSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      answer: z.number().int().min(1).max(5),
    })
  ).min(50).max(50),
  timeTakenMinutes: z.number().int().min(1).max(120),
});

/**
 * GET /api/contractor/personality-assessment
 * Get personality assessment questions or existing results
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can access personality assessments');
    }

    // Check if contractor already has results
    const existingResult = await PersonalityAssessmentService.getAssessmentResult(user.id);

    if (existingResult) {
      return NextResponse.json({
        hasCompleted: true,
        result: {
          id: existingResult.id,
          opennessScore: existingResult.opennessScore,
          conscientiousnessScore: existingResult.conscientiousnessScore,
          extraversionScore: existingResult.extraversionScore,
          agreeablenessScore: existingResult.agreeablenessScore,
          neuroticismScore: existingResult.neuroticismScore,
          reliabilityScore: existingResult.reliabilityScore,
          communicationScore: existingResult.communicationScore,
          problemSolvingScore: existingResult.problemSolvingScore,
          stressToleranceScore: existingResult.stressToleranceScore,
          overallScore: existingResult.overallScore,
          recommendedJobTypes: existingResult.recommendedJobTypes,
          cautionedJobTypes: existingResult.cautionedJobTypes,
          boostPercentage: existingResult.boostPercentage,
          completedAt: existingResult.completedAt,
          timeTakenMinutes: existingResult.timeTakenMinutes,
        },
      });
    }

    // Get questions for contractor to complete
    const questions = await PersonalityAssessmentService.getAssessmentQuestions();

    if (questions.length === 0) {
      throw new BadRequestError('Assessment questions not available');
    }

    return NextResponse.json({
      hasCompleted: false,
      questions: questions.map(q => ({
        id: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        category: q.questionCategory,
      })),
      totalQuestions: questions.length,
      estimatedMinutes: 10,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * POST /api/contractor/personality-assessment
 * Submit personality assessment answers
 */
export async function POST(request: NextRequest) {
  try {
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can submit personality assessments');
    }

    const validation = await validateRequest(request, submitAssessmentSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { answers, timeTakenMinutes } = validation.data;

    const result = await PersonalityAssessmentService.submitAssessment(
      user.id,
      answers.map(a => ({ questionId: a.questionId, answer: a.answer as 1 | 2 | 3 | 4 | 5 })),
      timeTakenMinutes
    );

    if (!result.success) {
      throw new BadRequestError(result.error || 'Failed to submit assessment');
    }

    return NextResponse.json({
      success: true,
      message: 'Assessment completed successfully',
      result: {
        id: result.result!.id,
        opennessScore: result.result!.opennessScore,
        conscientiousnessScore: result.result!.conscientiousnessScore,
        extraversionScore: result.result!.extraversionScore,
        agreeablenessScore: result.result!.agreeablenessScore,
        neuroticismScore: result.result!.neuroticismScore,
        reliabilityScore: result.result!.reliabilityScore,
        communicationScore: result.result!.communicationScore,
        problemSolvingScore: result.result!.problemSolvingScore,
        stressToleranceScore: result.result!.stressToleranceScore,
        overallScore: result.result!.overallScore,
        recommendedJobTypes: result.result!.recommendedJobTypes,
        cautionedJobTypes: result.result!.cautionedJobTypes,
        boostPercentage: result.result!.boostPercentage,
        completedAt: result.result!.completedAt,
      },
    }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
