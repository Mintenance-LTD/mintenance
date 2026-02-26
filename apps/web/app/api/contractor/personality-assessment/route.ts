import { NextResponse } from 'next/server';
import { PersonalityAssessmentService } from '@/lib/services/verification/PersonalityAssessmentService';
import { z } from 'zod';
import { BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const submitAssessmentSchema = z.object({
  answers: z.array(z.object({ questionId: z.string().uuid(), answer: z.number().int().min(1).max(5) })).min(50).max(50),
  timeTakenMinutes: z.number().int().min(1).max(120),
});

export const GET = withApiHandler({ roles: ['contractor'], rateLimit: { maxRequests: 30 } }, async (_req, { user }) => {
  const existingResult = await PersonalityAssessmentService.getAssessmentResult(user.id);

  if (existingResult) {
    return NextResponse.json({
      hasCompleted: true,
      result: { id: existingResult.id, opennessScore: existingResult.opennessScore, conscientiousnessScore: existingResult.conscientiousnessScore, extraversionScore: existingResult.extraversionScore, agreeablenessScore: existingResult.agreeablenessScore, neuroticismScore: existingResult.neuroticismScore, reliabilityScore: existingResult.reliabilityScore, communicationScore: existingResult.communicationScore, problemSolvingScore: existingResult.problemSolvingScore, stressToleranceScore: existingResult.stressToleranceScore, overallScore: existingResult.overallScore, recommendedJobTypes: existingResult.recommendedJobTypes, cautionedJobTypes: existingResult.cautionedJobTypes, boostPercentage: existingResult.boostPercentage, completedAt: existingResult.completedAt, timeTakenMinutes: existingResult.timeTakenMinutes },
    });
  }

  const questions = await PersonalityAssessmentService.getAssessmentQuestions();
  if (questions.length === 0) throw new BadRequestError('Assessment questions not available');

  return NextResponse.json({ hasCompleted: false, questions: questions.map(q => ({ id: q.id, questionNumber: q.questionNumber, questionText: q.questionText, category: q.questionCategory })), totalQuestions: questions.length, estimatedMinutes: 10 });
});

export const POST = withApiHandler({ roles: ['contractor'], rateLimit: { maxRequests: 30 } }, async (request, { user }) => {
  const body = await request.json();
  const validation = submitAssessmentSchema.safeParse(body);
  if (!validation.success) throw new BadRequestError('Invalid request data');
  const { answers, timeTakenMinutes } = validation.data;

  const result = await PersonalityAssessmentService.submitAssessment(user.id, answers.map(a => ({ questionId: a.questionId, answer: a.answer as 1 | 2 | 3 | 4 | 5 })), timeTakenMinutes);

  if (!result.success) throw new BadRequestError(result.error || 'Failed to submit assessment');

  return NextResponse.json({
    success: true, message: 'Assessment completed successfully',
    result: { id: result.result!.id, opennessScore: result.result!.opennessScore, conscientiousnessScore: result.result!.conscientiousnessScore, extraversionScore: result.result!.extraversionScore, agreeablenessScore: result.result!.agreeablenessScore, neuroticismScore: result.result!.neuroticismScore, reliabilityScore: result.result!.reliabilityScore, communicationScore: result.result!.communicationScore, problemSolvingScore: result.result!.problemSolvingScore, stressToleranceScore: result.result!.stressToleranceScore, overallScore: result.result!.overallScore, recommendedJobTypes: result.result!.recommendedJobTypes, cautionedJobTypes: result.result!.cautionedJobTypes, boostPercentage: result.result!.boostPercentage, completedAt: result.result!.completedAt },
  }, { status: 201 });
});
