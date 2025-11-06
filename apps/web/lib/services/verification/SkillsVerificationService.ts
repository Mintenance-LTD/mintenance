import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

interface SkillsTestQuestion {
  id: string;
  skillName: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
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
    // TODO: Implement questions database
    // For now, return placeholder questions
    const questions: SkillsTestQuestion[] = [
      {
        id: '1',
        skillName,
        question: `What is the primary safety concern when working with ${skillName}?`,
        options: ['Electrical hazards', 'Proper tool usage', 'Following local codes', 'All of the above'],
        correctAnswer: 3,
        explanation: 'All safety concerns are important when working with this skill.',
      },
      {
        id: '2',
        skillName,
        question: `Which certification is typically required for ${skillName} work?`,
        options: ['OSHA', 'Local trade license', 'Both', 'None required'],
        correctAnswer: 2,
      },
    ];

    return questions;
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

      const questions = await this.getTestQuestions(skill.skill_name);

      // Calculate score
      let correctAnswers = 0;
      questions.forEach((q) => {
        if (answers[q.id] === q.correctAnswer) {
          correctAnswers++;
        }
      });

      const score = Math.round((correctAnswers / questions.length) * 100);
      const passed = score >= this.PASSING_SCORE;

      // Update skill with test results
      const updateData: Record<string, any> = {
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
      const updateData: Record<string, any> = {
        is_verified: true,
        verified_by: adminId,
        verified_at: new Date().toISOString(),
      };

      if (certifications && certifications.length > 0) {
        updateData.certifications = certifications;
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

      return true;
    } catch (error) {
      logger.error('Error verifying skill manually', error, {
        service: 'SkillsVerificationService',
        skillId,
      });
      return false;
    }
  }
}

