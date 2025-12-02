import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

interface SkillTestTemplateRecord {
  id: string;
  skill_name: string;
  version: number;
  passing_score?: number | null;
  question_count: number;
}

interface SkillTestQuestionRecord {
  id: string;
  prompt: string;
  options: string[];
  correct_option_index: number;
  explanation?: string | null;
  weight?: number | null;
  category?: string | null;
}

interface SkillsTestQuestion {
  id: string;
  skillName: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  weight?: number;
  category?: string;
}

/**
 * Service for skills testing and certification verification
 */
export class SkillsVerificationService {
  private static readonly PASSING_SCORE = 70;

  /**
   * Get skills test questions for a skill
   */
  static async getTestQuestions(skillName: string): Promise<SkillsTestQuestion[]> {
    const templateData = await this.loadTemplateQuestions(skillName);
    if (!templateData) {
      throw new Error(`No assessment template configured for ${skillName}`);
    }
    return templateData.questions;
  }

  /**
   * Submit skills test results
   */
  static async submitTestResults(
    userId: string,
    skillId: string,
    answers: Record<string, number>
  ): Promise<{ passed: boolean; score: number; error?: string }> {
    try {
      // Get questions
      const { data: skill, error: skillError } = await serverSupabase
        .from('contractor_skills')
        .select('skill_name')
        .eq('id', skillId)
        .eq('contractor_id', userId)
        .single();

      if (skillError || !skill) {
        return { passed: false, score: 0, error: 'Skill not found' };
      }

      const templateData = await this.loadTemplateQuestions(skill.skill_name);
      if (!templateData) {
        return { passed: false, score: 0, error: 'No assessment template configured for this skill yet' };
      }

      const { template, questions } = templateData;

      // Calculate score
      let correctAnswers = 0;
      let earnedWeight = 0;
      let totalWeight = 0;

      const questionResults = questions.map((q) => {
        const selectedOption = answers[q.id];
        const isCorrect = selectedOption === q.correctAnswer;
        if (isCorrect) {
          correctAnswers++;
          earnedWeight += q.weight ?? 1;
        }
        totalWeight += q.weight ?? 1;
        return {
          questionId: q.id,
          selectedOption: selectedOption ?? null,
          isCorrect,
          weight: q.weight ?? 1,
        };
      });

      const score =
        totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : Math.round((correctAnswers / questions.length) * 100);
      const passingScore = template.passing_score ?? this.PASSING_SCORE;
      const passed = score >= passingScore;

      // Insert attempt record
      const attemptPayload = {
        contractor_id: userId,
        skill_id: skillId,
        template_id: template.id,
        question_count: questions.length,
        total_correct: correctAnswers,
        score,
        passed,
        metadata: {
          templateVersion: template.version,
          weightModel: 'per_question',
        },
      };

      const { data: attempt, error: attemptError } = await serverSupabase
        .from('skill_test_attempts')
        .insert(attemptPayload)
        .select('id')
        .single();

      if (attemptError || !attempt) {
        logger.error('Failed to record skill test attempt', {
          service: 'SkillsVerificationService',
          userId,
          skillId,
          error: attemptError?.message,
        });
        return { passed: false, score: 0, error: 'Unable to record test attempt' };
      }

      // Persist per-question answers
      const answerRows = questionResults.map((result) => ({
        attempt_id: attempt.id,
        question_id: result.questionId,
        selected_option: result.selectedOption ?? null,
        is_correct: result.isCorrect,
      }));

      const { error: answerError } = await serverSupabase.from('skill_test_answers').insert(answerRows);

      if (answerError) {
        logger.error('Failed to record skill test answers', {
          service: 'SkillsVerificationService',
          userId,
          skillId,
          error: answerError.message,
        });
        return { passed: false, score: 0, error: 'Unable to record test answers' };
      }

      // Update skill with test results
      const updateData: {
        test_score: number;
        is_verified?: boolean;
        verified_at?: string;
      } = {
        test_score: score,
      };

      if (passed) {
        updateData.is_verified = true;
        updateData.verified_at = new Date().toISOString();
      }

      const { error: updateError } = await serverSupabase
        .from('contractor_skills')
        .update(updateData)
        .eq('id', skillId)
        .eq('contractor_id', userId);

      if (updateError) {
        logger.error('Failed to update skill test results', {
          service: 'SkillsVerificationService',
          userId,
          skillId,
          error: updateError.message,
        });
        return { passed: false, score, error: 'Failed to save test results' };
      }

      // Log verification audit
      await this.logVerificationAudit({
        skillId,
        contractorId: userId,
        actorId: userId,
        action: 'test_attempt',
        metadata: {
          attemptId: attempt.id,
          score,
          passed,
          templateVersion: template.version,
        },
      });

      return { passed, score };
    } catch (error) {
      logger.error('Error submitting skills test', error, {
        service: 'SkillsVerificationService',
        userId,
        skillId,
      });
      return { passed: false, score: 0, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Verify skill manually (admin)
   */
  static async verifySkillManually(
    skillId: string,
    adminId: string,
    certifications?: Array<{ name: string; issuer: string; expiryDate?: string }>
  ): Promise<boolean> {
    try {
      const updateData: {
        is_verified: boolean;
        verified_by: string;
        verified_at: string;
        certifications?: Array<{ name: string; issuer: string; expiryDate?: string }>;
      } = {
        is_verified: true,
        verified_by: adminId,
        verified_at: new Date().toISOString(),
      };

      if (certifications && certifications.length > 0) {
        updateData.certifications = certifications;
      }

      const { data: skillRecord, error: skillLookupError } = await serverSupabase
        .from('contractor_skills')
        .select('contractor_id')
        .eq('id', skillId)
        .single();

      if (skillLookupError || !skillRecord || !skillRecord.contractor_id) {
        logger.error('Skill not found for manual verification', {
          service: 'SkillsVerificationService',
          skillId,
          adminId,
          error: skillLookupError?.message,
        });
        return false;
      }

      const { error } = await serverSupabase
        .from('contractor_skills')
        .update(updateData)
        .eq('id', skillId);

      if (error) {
        logger.error('Failed to verify skill manually', {
          service: 'SkillsVerificationService',
          skillId,
          adminId,
          error: error.message,
        });
        return false;
      }

      await this.logVerificationAudit({
        skillId,
        contractorId: skillRecord.contractor_id,
        actorId: adminId,
        action: 'manual_verification',
        metadata: {
          certifications,
        },
      });

      return true;
    } catch (error) {
      logger.error('Error verifying skill manually', error, {
        service: 'SkillsVerificationService',
        skillId,
      });
      return false;
    }
  }

  private static async loadTemplateQuestions(
    skillName: string
  ): Promise<{ template: SkillTestTemplateRecord; questions: SkillsTestQuestion[] } | null> {
    try {
      const { data: template, error: templateError } = await serverSupabase
        .from('skill_test_templates')
        .select('id, skill_name, version, passing_score, question_count')
        .eq('skill_name', skillName)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (templateError || !template) {
        logger.warn('No active skill test template found', {
          service: 'SkillsVerificationService',
          skillName,
          error: templateError?.message,
        });
        return null;
      }

      const { data: questionRows, error: questionError } = await serverSupabase
        .from('skill_test_questions')
        .select('id, prompt, options, correct_option_index, explanation, weight, category')
        .eq('template_id', template.id);

      if (questionError || !questionRows || questionRows.length === 0) {
        logger.warn('No questions configured for template', {
          service: 'SkillsVerificationService',
          skillName,
          templateId: template.id,
          error: questionError?.message,
        });
        return null;
      }

      const mappedQuestions = questionRows.map((question: SkillTestQuestionRecord) => ({
        id: question.id,
        skillName,
        question: question.prompt,
        options: question.options,
        correctAnswer: question.correct_option_index,
        explanation: question.explanation ?? undefined,
        weight: question.weight ?? undefined,
        category: question.category ?? undefined,
      }));

      return {
        template,
        questions: this.shuffleQuestions(mappedQuestions),
      };
    } catch (error) {
      logger.error('Failed to load skill test template', error, {
        service: 'SkillsVerificationService',
        skillName,
      });
      return null;
    }
  }

  private static shuffleQuestions<T>(questions: T[]): T[] {
    const copy = [...questions];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  private static async logVerificationAudit(params: {
    skillId: string;
    contractorId: string;
    actorId: string;
    action: 'test_attempt' | 'manual_verification';
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await serverSupabase.from('skill_verification_audits').insert({
        skill_id: params.skillId,
        contractor_id: params.contractorId,
        actor_id: params.actorId,
        action: params.action,
        metadata: params.metadata ?? {},
      });
    } catch (error) {
      logger.error('Failed to log verification audit', error, {
        service: 'SkillsVerificationService',
        skillId: params.skillId,
      });
    }
  }
}
