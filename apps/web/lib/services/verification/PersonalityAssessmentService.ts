import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * Assessment question structure
 */
export interface AssessmentQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  questionCategory: 'reliability' | 'communication' | 'problem_solving' | 'stress_tolerance';
  trait: 'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism';
  reverseScored: boolean;
}

/**
 * Answer structure (1-5 Likert scale)
 */
export interface AssessmentAnswer {
  questionId: string;
  answer: 1 | 2 | 3 | 4 | 5; // Strongly Disagree -> Strongly Agree
}

/**
 * Assessment results
 */
export interface PersonalityAssessmentResult {
  id: string;
  contractorId: string;

  // Big Five scores (0-100)
  opennessScore: number;
  conscientiousnessScore: number;
  extraversionScore: number;
  agreeablenessScore: number;
  neuroticismScore: number;

  // Derived trade-specific scores (0-100)
  reliabilityScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  stressToleranceScore: number;

  // Overall
  overallScore: number;

  // Recommendations
  recommendedJobTypes: string[];
  cautionedJobTypes: string[];

  // Metadata
  boostPercentage: number;
  completedAt: Date;
  timeTakenMinutes: number;
}

/**
 * Job type recommendations based on personality traits
 */
const JOB_TYPE_PROFILES = {
  emergency_repairs: {
    required: { stressTolerance: 70, reliability: 60 },
    preferred: { problemSolving: 60 },
  },
  large_projects: {
    required: { reliability: 70, communication: 60 },
    preferred: { problemSolving: 60 },
  },
  detailed_finishing: {
    required: { reliability: 75, problemSolving: 65 },
    preferred: { stressTolerance: 50 },
  },
  customer_facing: {
    required: { communication: 75, reliability: 60 },
    preferred: { stressTolerance: 60 },
  },
  complex_diagnostics: {
    required: { problemSolving: 75, reliability: 65 },
    preferred: { communication: 55 },
  },
  routine_maintenance: {
    required: { reliability: 80 },
    preferred: { communication: 50 },
  },
};

/**
 * Service for managing contractor personality assessments
 * Based on Big Five personality traits, tailored for trades industry
 */
export class PersonalityAssessmentService {
  /**
   * Get assessment questions for contractor to complete
   */
  static async getAssessmentQuestions(): Promise<AssessmentQuestion[]> {
    try {
      const { data: questions, error } = await serverSupabase
        .from('personality_assessment_questions')
        .select('*')
        .eq('assessment_version', 'v1.0')
        .eq('is_active', true)
        .order('question_number');

      if (error || !questions) {
        logger.error('Failed to fetch assessment questions', {
          service: 'PersonalityAssessmentService',
          error: error?.message,
        });
        return [];
      }

      return questions.map(q => ({
        id: q.id,
        questionNumber: q.question_number,
        questionText: q.question_text,
        questionCategory: q.question_category,
        trait: q.trait,
        reverseScored: q.reverse_scored,
      }));
    } catch (error) {
      logger.error('Error getting assessment questions', error, {
        service: 'PersonalityAssessmentService',
      });
      return [];
    }
  }

  /**
   * Submit assessment answers and calculate results
   */
  static async submitAssessment(
    contractorId: string,
    answers: AssessmentAnswer[],
    timeTakenMinutes: number
  ): Promise<{ success: boolean; result?: PersonalityAssessmentResult; error?: string }> {
    try {
      // Verify contractor exists
      const { data: contractor, error: contractorError } = await serverSupabase
        .from('profiles')
        .select('id, role')
        .eq('id', contractorId)
        .single();

      if (contractorError || !contractor || contractor.role !== 'contractor') {
        return { success: false, error: 'Invalid contractor' };
      }

      // Check if assessment already exists
      const { data: existing } = await serverSupabase
        .from('contractor_personality_assessments')
        .select('id')
        .eq('contractor_id', contractorId)
        .maybeSingle();

      if (existing) {
        return { success: false, error: 'Assessment already completed. You can only take the assessment once.' };
      }

      // Get questions for scoring
      const questions = await this.getAssessmentQuestions();

      if (questions.length === 0) {
        return { success: false, error: 'Assessment questions not available' };
      }

      if (answers.length !== questions.length) {
        return { success: false, error: `Expected ${questions.length} answers, received ${answers.length}` };
      }

      // Calculate scores
      const scores = this.calculateScores(questions, answers);

      // Determine job type recommendations
      const { recommended, cautioned } = this.determineJobTypeRecommendations(
        scores.reliabilityScore,
        scores.communicationScore,
        scores.problemSolvingScore,
        scores.stressToleranceScore
      );

      // Calculate boost percentage based on overall score
      const boostPercentage = this.calculateBoostPercentage(scores.overallScore);

      // Store results
      const { data: result, error: insertError } = await serverSupabase
        .from('contractor_personality_assessments')
        .insert({
          contractor_id: contractorId,
          assessment_type: 'big_five_trades',
          assessment_version: 'v1.0',
          openness_score: scores.opennessScore,
          conscientiousness_score: scores.conscientiousnessScore,
          extraversion_score: scores.extraversionScore,
          agreeableness_score: scores.agreeablenessScore,
          neuroticism_score: scores.neuroticismScore,
          reliability_score: scores.reliabilityScore,
          communication_score: scores.communicationScore,
          problem_solving_score: scores.problemSolvingScore,
          stress_tolerance_score: scores.stressToleranceScore,
          overall_score: scores.overallScore,
          recommended_job_types: recommended,
          cautioned_job_types: cautioned,
          profile_boost_applied: true,
          boost_percentage: boostPercentage,
          total_questions: questions.length,
          questions_answered: answers.length,
          completion_percentage: 100,
          completed_at: new Date().toISOString(),
          time_taken_minutes: timeTakenMinutes,
          response_data: answers,
        })
        .select()
        .single();

      if (insertError || !result) {
        logger.error('Failed to save assessment results', {
          service: 'PersonalityAssessmentService',
          contractorId,
          error: insertError?.message,
        });
        return { success: false, error: 'Failed to save assessment' };
      }

      // Recalculate profile boost
      await this.recalculateProfileBoost(contractorId);

      // Log event
      await this.logVerificationEvent(contractorId, 'personality_assessment_completed', {
        overall_score: scores.overallScore,
        boost_percentage: boostPercentage,
        time_taken_minutes: timeTakenMinutes,
      });

      logger.info('Personality assessment completed', {
        service: 'PersonalityAssessmentService',
        contractorId,
        overallScore: scores.overallScore,
      });

      return {
        success: true,
        result: {
          id: result.id,
          contractorId: result.contractor_id,
          opennessScore: result.openness_score!,
          conscientiousnessScore: result.conscientiousness_score!,
          extraversionScore: result.extraversion_score!,
          agreeablenessScore: result.agreeableness_score!,
          neuroticismScore: result.neuroticism_score!,
          reliabilityScore: result.reliability_score!,
          communicationScore: result.communication_score!,
          problemSolvingScore: result.problem_solving_score!,
          stressToleranceScore: result.stress_tolerance_score!,
          overallScore: result.overall_score!,
          recommendedJobTypes: result.recommended_job_types!,
          cautionedJobTypes: result.cautioned_job_types!,
          boostPercentage: result.boost_percentage!,
          completedAt: new Date(result.completed_at!),
          timeTakenMinutes: result.time_taken_minutes!,
        },
      };
    } catch (error) {
      logger.error('Error submitting assessment', error, {
        service: 'PersonalityAssessmentService',
        contractorId,
      });
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Calculate Big Five scores and derived trade scores
   */
  private static calculateScores(
    questions: AssessmentQuestion[],
    answers: AssessmentAnswer[]
  ): {
    opennessScore: number;
    conscientiousnessScore: number;
    extraversionScore: number;
    agreeablenessScore: number;
    neuroticismScore: number;
    reliabilityScore: number;
    communicationScore: number;
    problemSolvingScore: number;
    stressToleranceScore: number;
    overallScore: number;
  } {
    // Create answer map for easy lookup
    const answerMap = new Map(answers.map(a => [a.questionId, a.answer]));

    // Calculate Big Five trait scores
    const traitScores = {
      openness: this.calculateTraitScore(questions, answerMap, 'openness'),
      conscientiousness: this.calculateTraitScore(questions, answerMap, 'conscientiousness'),
      extraversion: this.calculateTraitScore(questions, answerMap, 'extraversion'),
      agreeableness: this.calculateTraitScore(questions, answerMap, 'agreeableness'),
      neuroticism: this.calculateTraitScore(questions, answerMap, 'neuroticism'),
    };

    // Calculate derived trade-specific scores
    const reliabilityScore = traitScores.conscientiousness;
    const communicationScore = Math.round((traitScores.extraversion + traitScores.agreeableness) / 2);
    const problemSolvingScore = traitScores.openness;
    const stressToleranceScore = 100 - traitScores.neuroticism; // Inverted

    // Calculate overall score (average of derived scores)
    const overallScore = Math.round(
      (reliabilityScore + communicationScore + problemSolvingScore + stressToleranceScore) / 4
    );

    return {
      opennessScore: traitScores.openness,
      conscientiousnessScore: traitScores.conscientiousness,
      extraversionScore: traitScores.extraversion,
      agreeablenessScore: traitScores.agreeableness,
      neuroticismScore: traitScores.neuroticism,
      reliabilityScore,
      communicationScore,
      problemSolvingScore,
      stressToleranceScore,
      overallScore,
    };
  }

  /**
   * Calculate score for a specific trait
   */
  private static calculateTraitScore(
    questions: AssessmentQuestion[],
    answerMap: Map<string, number>,
    trait: string
  ): number {
    const traitQuestions = questions.filter(q => q.trait === trait);

    if (traitQuestions.length === 0) return 50; // Default

    let totalScore = 0;
    let validAnswers = 0;

    for (const question of traitQuestions) {
      const answer = answerMap.get(question.id);
      if (answer === undefined) continue;

      // Apply reverse scoring if needed
      const score = question.reverseScored ? (6 - answer) : answer;
      totalScore += score;
      validAnswers++;
    }

    if (validAnswers === 0) return 50;

    // Convert to 0-100 scale (answers are 1-5, so max average is 5)
    const averageScore = totalScore / validAnswers;
    return Math.round(((averageScore - 1) / 4) * 100);
  }

  /**
   * Determine job type recommendations based on scores
   */
  private static determineJobTypeRecommendations(
    reliability: number,
    communication: number,
    problemSolving: number,
    stressTolerance: number
  ): { recommended: string[]; cautioned: string[] } {
    const recommended: string[] = [];
    const cautioned: string[] = [];

    const scores = {
      reliability,
      communication,
      problemSolving,
      stressTolerance,
    };

    for (const [jobType, profile] of Object.entries(JOB_TYPE_PROFILES)) {
      // Check if contractor meets all required scores
      const meetsRequired = Object.entries(profile.required).every(
        ([trait, minScore]) => {
          const traitKey = trait.charAt(0).toLowerCase() + trait.slice(1);
          return scores[traitKey as keyof typeof scores] >= minScore;
        }
      );

      if (meetsRequired) {
        recommended.push(jobType);
      } else {
        // Check if they're close but not quite there (within 15 points)
        const almostMeets = Object.entries(profile.required).some(
          ([trait, minScore]) => {
            const traitKey = trait.charAt(0).toLowerCase() + trait.slice(1);
            const score = scores[traitKey as keyof typeof scores];
            return score < minScore && score >= minScore - 15;
          }
        );

        if (almostMeets) {
          cautioned.push(jobType);
        }
      }
    }

    return { recommended, cautioned };
  }

  /**
   * Calculate boost percentage based on overall score
   */
  private static calculateBoostPercentage(overallScore: number): number {
    if (overallScore >= 80) return 15; // Excellent
    if (overallScore >= 70) return 12; // Very Good
    if (overallScore >= 60) return 10; // Good
    if (overallScore >= 50) return 7;  // Average
    if (overallScore >= 40) return 5;  // Below Average
    return 3; // Needs Improvement (still get a small boost for completing)
  }

  /**
   * Get assessment result for a contractor
   */
  static async getAssessmentResult(contractorId: string): Promise<PersonalityAssessmentResult | null> {
    try {
      const { data: result, error } = await serverSupabase
        .from('contractor_personality_assessments')
        .select('*')
        .eq('contractor_id', contractorId)
        .maybeSingle();

      if (error || !result || !result.completed_at) {
        return null;
      }

      return {
        id: result.id,
        contractorId: result.contractor_id,
        opennessScore: result.openness_score!,
        conscientiousnessScore: result.conscientiousness_score!,
        extraversionScore: result.extraversion_score!,
        agreeablenessScore: result.agreeableness_score!,
        neuroticismScore: result.neuroticism_score!,
        reliabilityScore: result.reliability_score!,
        communicationScore: result.communication_score!,
        problemSolvingScore: result.problem_solving_score!,
        stressToleranceScore: result.stress_tolerance_score!,
        overallScore: result.overall_score!,
        recommendedJobTypes: result.recommended_job_types!,
        cautionedJobTypes: result.cautioned_job_types || [],
        boostPercentage: result.boost_percentage!,
        completedAt: new Date(result.completed_at),
        timeTakenMinutes: result.time_taken_minutes!,
      };
    } catch (error) {
      logger.error('Error getting assessment result', error, {
        service: 'PersonalityAssessmentService',
        contractorId,
      });
      return null;
    }
  }

  /**
   * Check if contractor has completed assessment
   */
  static async hasCompletedAssessment(contractorId: string): Promise<boolean> {
    try {
      const { data: result } = await serverSupabase
        .from('contractor_personality_assessments')
        .select('completed_at')
        .eq('contractor_id', contractorId)
        .maybeSingle();

      return !!result?.completed_at;
    } catch (error) {
      logger.error('Error checking assessment completion', error, {
        service: 'PersonalityAssessmentService',
        contractorId,
      });
      return false;
    }
  }

  /**
   * Recalculate profile boost for contractor
   */
  private static async recalculateProfileBoost(contractorId: string): Promise<void> {
    try {
      await serverSupabase.rpc('calculate_contractor_profile_boost', {
        p_contractor_id: contractorId,
      });

      await this.logVerificationEvent(contractorId, 'profile_boost_recalculated', {
        trigger: 'personality_assessment_completion',
      });
    } catch (error) {
      logger.error('Error recalculating profile boost', error, {
        service: 'PersonalityAssessmentService',
        contractorId,
      });
    }
  }

  /**
   * Log verification event
   */
  private static async logVerificationEvent(
    contractorId: string,
    eventType: string,
    eventData: unknown
  ): Promise<void> {
    try {
      await serverSupabase.from('contractor_verification_events').insert({
        contractor_id: contractorId,
        event_type: eventType,
        event_category: 'personality',
        event_data: eventData,
        trigger_source: 'contractor_portal',
      });
    } catch (error) {
      logger.error('Error logging verification event', error, {
        service: 'PersonalityAssessmentService',
        contractorId,
        eventType,
      });
    }
  }
}
