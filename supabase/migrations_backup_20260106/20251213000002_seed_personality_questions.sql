-- ============================================================================
-- PERSONALITY ASSESSMENT QUESTIONS - SEED DATA
-- Created: 2025-12-13
-- Description: 50-question Big Five personality test tailored for trades industry
-- ============================================================================

BEGIN;

-- Clear existing questions for v1.0
DELETE FROM personality_assessment_questions WHERE assessment_version = 'v1.0';

-- ============================================================================
-- BIG FIVE PERSONALITY QUESTIONS FOR TRADES PROFESSIONALS
-- 50 Questions across 5 traits (10 questions each)
-- ============================================================================

-- ========================================
-- CONSCIENTIOUSNESS (Reliability)
-- Measures: Organization, responsibility, dependability
-- ========================================

INSERT INTO personality_assessment_questions (question_number, question_text, question_category, trait, reverse_scored, assessment_version) VALUES
(1, 'I always arrive on time to scheduled appointments', 'reliability', 'conscientiousness', false, 'v1.0'),
(2, 'I complete projects by the deadline I promised', 'reliability', 'conscientiousness', false, 'v1.0'),
(3, 'I keep detailed records of my work and materials used', 'reliability', 'conscientiousness', false, 'v1.0'),
(4, 'I prefer to plan my work schedule well in advance', 'reliability', 'conscientiousness', false, 'v1.0'),
(5, 'I sometimes forget to follow up with clients after a job', 'reliability', 'conscientiousness', true, 'v1.0'),
(6, 'I am very organized with my tools and equipment', 'reliability', 'conscientiousness', false, 'v1.0'),
(7, 'I take pride in leaving a job site clean and tidy', 'reliability', 'conscientiousness', false, 'v1.0'),
(8, 'I often rush through jobs to move on to the next one', 'reliability', 'conscientiousness', true, 'v1.0'),
(9, 'I double-check my work before considering a job complete', 'reliability', 'conscientiousness', false, 'v1.0'),
(10, 'I maintain my tools and equipment regularly', 'reliability', 'conscientiousness', false, 'v1.0'),

-- ========================================
-- EXTRAVERSION (Communication)
-- Measures: Sociability, assertiveness, enthusiasm
-- ========================================

INSERT INTO personality_assessment_questions (question_number, question_text, question_category, trait, reverse_scored, assessment_version) VALUES
(11, 'I enjoy explaining my work process to clients', 'communication', 'extraversion', false, 'v1.0'),
(12, 'I feel comfortable discussing project changes with homeowners', 'communication', 'extraversion', false, 'v1.0'),
(13, 'I prefer to work alone without client interaction', 'communication', 'extraversion', true, 'v1.0'),
(14, 'I am good at building rapport with new clients quickly', 'communication', 'extraversion', false, 'v1.0'),
(15, 'I find it draining to answer many questions from clients', 'communication', 'extraversion', true, 'v1.0'),
(16, 'I actively suggest improvements or upgrades to clients', 'communication', 'extraversion', false, 'v1.0'),
(17, 'I am comfortable giving presentations or demonstrations', 'communication', 'extraversion', false, 'v1.0'),
(18, 'I prefer communicating via text rather than face-to-face', 'communication', 'extraversion', true, 'v1.0'),
(19, 'I enjoy networking with other professionals in my trade', 'communication', 'extraversion', false, 'v1.0'),
(20, 'I naturally take charge when working with a team', 'communication', 'extraversion', false, 'v1.0'),

-- ========================================
-- AGREEABLENESS (Customer Service)
-- Measures: Cooperation, empathy, customer focus
-- ========================================

INSERT INTO personality_assessment_questions (question_number, question_text, question_category, trait, reverse_scored, assessment_version) VALUES
(21, 'I remain patient when clients change their minds', 'communication', 'agreeableness', false, 'v1.0'),
(22, 'I consider the client\'s budget when making recommendations', 'communication', 'agreeableness', false, 'v1.0'),
(23, 'I get frustrated when clients question my expertise', 'communication', 'agreeableness', true, 'v1.0'),
(24, 'I go the extra mile to ensure customer satisfaction', 'communication', 'agreeableness', false, 'v1.0'),
(25, 'I am willing to compromise to reach a solution', 'communication', 'agreeableness', false, 'v1.0'),
(26, 'I find it difficult to work with demanding clients', 'communication', 'agreeableness', true, 'v1.0'),
(27, 'I genuinely care about solving my clients\' problems', 'communication', 'agreeableness', false, 'v1.0'),
(28, 'I prioritize my schedule over client convenience', 'communication', 'agreeableness', true, 'v1.0'),
(29, 'I am respectful of clients\' homes and property', 'communication', 'agreeableness', false, 'v1.0'),
(30, 'I handle complaints professionally and constructively', 'communication', 'agreeableness', false, 'v1.0'),

-- ========================================
-- OPENNESS (Problem-Solving)
-- Measures: Creativity, adaptability, learning
-- ========================================

INSERT INTO personality_assessment_questions (question_number, question_text, question_category, trait, reverse_scored, assessment_version) VALUES
(31, 'I enjoy finding creative solutions to unexpected problems', 'problem_solving', 'openness', false, 'v1.0'),
(32, 'I actively seek to learn new techniques and methods', 'problem_solving', 'openness', false, 'v1.0'),
(33, 'I prefer to stick with tried-and-true methods', 'problem_solving', 'openness', true, 'v1.0'),
(34, 'I am comfortable adapting my approach when needed', 'problem_solving', 'openness', false, 'v1.0'),
(35, 'I get overwhelmed when faced with unusual problems', 'problem_solving', 'openness', true, 'v1.0'),
(36, 'I research new tools and technologies in my trade', 'problem_solving', 'openness', false, 'v1.0'),
(37, 'I enjoy tackling complex or challenging projects', 'problem_solving', 'openness', false, 'v1.0'),
(38, 'I avoid jobs that require learning new skills', 'problem_solving', 'openness', true, 'v1.0'),
(39, 'I can visualize creative solutions before implementing them', 'problem_solving', 'openness', false, 'v1.0'),
(40, 'I am open to feedback and constructive criticism', 'problem_solving', 'openness', false, 'v1.0'),

-- ========================================
-- NEUROTICISM (Stress Tolerance) - INVERSE SCORED
-- Measures: Emotional stability, composure, resilience
-- Note: Lower neuroticism = Higher stress tolerance
-- ========================================

INSERT INTO personality_assessment_questions (question_number, question_text, question_category, trait, reverse_scored, assessment_version) VALUES
(41, 'I remain calm when a job doesn\'t go as planned', 'stress_tolerance', 'neuroticism', true, 'v1.0'),
(42, 'I handle emergency call-outs without getting flustered', 'stress_tolerance', 'neuroticism', true, 'v1.0'),
(43, 'I often worry about making mistakes on the job', 'stress_tolerance', 'neuroticism', false, 'v1.0'),
(44, 'I bounce back quickly from setbacks or failures', 'stress_tolerance', 'neuroticism', true, 'v1.0'),
(45, 'Tight deadlines make me anxious and stressed', 'stress_tolerance', 'neuroticism', false, 'v1.0'),
(46, 'I maintain my composure when dealing with difficult clients', 'stress_tolerance', 'neuroticism', true, 'v1.0'),
(47, 'I lose sleep worrying about upcoming projects', 'stress_tolerance', 'neuroticism', false, 'v1.0'),
(48, 'I can work effectively even under pressure', 'stress_tolerance', 'neuroticism', true, 'v1.0'),
(49, 'Small setbacks can ruin my whole day', 'stress_tolerance', 'neuroticism', false, 'v1.0'),
(50, 'I stay positive even when jobs become complicated', 'stress_tolerance', 'neuroticism', true, 'v1.0');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all 50 questions were inserted
DO $$
DECLARE
  question_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO question_count
  FROM personality_assessment_questions
  WHERE assessment_version = 'v1.0';

  IF question_count != 50 THEN
    RAISE EXCEPTION 'Expected 50 questions, but found %', question_count;
  END IF;

  RAISE NOTICE 'Successfully inserted 50 personality assessment questions';
END $$;

-- ============================================================================
-- ANSWER SCALE DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE personality_assessment_questions IS '
50-question Big Five personality assessment tailored for trades industry.

ANSWER SCALE (Likert 5-point):
1 = Strongly Disagree
2 = Disagree
3 = Neutral
4 = Agree
5 = Strongly Agree

REVERSE SCORING:
Questions with reverse_scored = true are inverted during calculation:
- Answer 1 becomes 5
- Answer 2 becomes 4
- Answer 3 stays 3
- Answer 4 becomes 2
- Answer 5 becomes 1

TRAITS MEASURED:
- Conscientiousness (Questions 1-10): Reliability, organization, responsibility
- Extraversion (Questions 11-20): Communication, sociability, assertiveness
- Agreeableness (Questions 21-30): Customer service, empathy, cooperation
- Openness (Questions 31-40): Problem-solving, creativity, adaptability
- Neuroticism (Questions 41-50): Stress tolerance, emotional stability (inverse)

DERIVED SCORES:
- Reliability Score = Conscientiousness score
- Communication Score = (Extraversion + Agreeableness) / 2
- Problem-Solving Score = Openness score
- Stress Tolerance Score = 100 - Neuroticism score (inverted)
- Overall Score = Average of all four derived scores
';

COMMIT;
