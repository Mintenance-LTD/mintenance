/**
 * Unit tests for ComplexityAnalyzer
 *
 * Strategy: the unit under test is pure pricing/complexity logic with the only
 * external dependency being `logger`. We mock the logger and assert EXACT numeric
 * outputs for inputs that exercise every method and branch.
 */

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { ComplexityAnalyzer, complexityAnalyzer } from '../ComplexityAnalyzer';
import { logger } from '../../../utils/logger';

// Helper handles to access private methods with exact-value assertions.
type AnyAnalyzer = ComplexityAnalyzer & {
  analyzeTextComplexity: (text: string) => number;
  extractSkillRequirements: (text: string, category: string) => string[];
  assessRiskLevel: (text: string, category: string) => number;
  assessMaterialComplexity: (text: string) => number;
  estimateTimeRequirement: (
    text: string,
    category: string,
    providedEstimate?: number
  ) => number;
  requiresSpecialEquipment: (text: string) => boolean;
  requiresCertification: (text: string, category: string) => boolean;
  calculateOverallComplexity: (factors: {
    textComplexity: number;
    skillRequirements: number;
    riskLevel: number;
    materialComplexity: number;
    specialEquipment: boolean;
    certificationRequired: boolean;
  }) => number;
  getCategorySkills: (category: string) => string[];
  getCategoryBaseRisk: (category: string) => number;
  initialized: boolean;
};

describe('ComplexityAnalyzer', () => {
  let analyzer: AnyAnalyzer;

  beforeEach(() => {
    jest.clearAllMocks();
    analyzer = new ComplexityAnalyzer() as AnyAnalyzer;
  });

  // ---------------------------------------------------------------------------
  // construction + singleton
  // ---------------------------------------------------------------------------
  describe('construction', () => {
    it('constructs and exposes a not-yet-initialized analyzer', () => {
      expect(analyzer).toBeInstanceOf(ComplexityAnalyzer);
      expect(analyzer.isHealthy()).toBe(false);
    });

    it('exports a shared singleton instance', () => {
      expect(complexityAnalyzer).toBeInstanceOf(ComplexityAnalyzer);
    });
  });

  // ---------------------------------------------------------------------------
  // initialize() + isHealthy()
  // ---------------------------------------------------------------------------
  describe('initialize / isHealthy', () => {
    it('initializes, becomes healthy, and logs', async () => {
      expect(analyzer.isHealthy()).toBe(false);
      await analyzer.initialize();
      expect(analyzer.isHealthy()).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        'Complexity analyzer initialized'
      );
    });

    it('is idempotent: a second initialize returns early (no re-log)', async () => {
      await analyzer.initialize();
      (logger.info as jest.Mock).mockClear();
      await analyzer.initialize();
      expect(logger.info).not.toHaveBeenCalled();
      expect(analyzer.isHealthy()).toBe(true);
    });

    it('logs and rethrows when initialization throws', async () => {
      const boom = new Error('init boom');
      // The only statement in the try body that can throw is the success log;
      // force it to throw to drive the catch/error path.
      (logger.info as jest.Mock).mockImplementationOnce(() => {
        throw boom;
      });
      await expect(analyzer.initialize()).rejects.toThrow('init boom');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize complexity analyzer:',
        boom
      );
    });
  });

  // ---------------------------------------------------------------------------
  // analyzeTextComplexity — exact values for every branch
  // ---------------------------------------------------------------------------
  describe('analyzeTextComplexity', () => {
    it('returns base 0.5 for empty text', () => {
      expect(analyzer.analyzeTextComplexity('')).toBe(0.5);
    });

    it('adds 0.1 for word count > 50 (<=100)', () => {
      // 60 plain words, no sentence-ending punctuation, no keywords.
      const text = Array(60).fill('zzz').join(' ');
      // base 0.5 + 0.1 (words>50). avgSentenceLength = 60/1 = 60 > 20 => +0.15.
      // No technical words, no high/med/low keywords.
      expect(analyzer.analyzeTextComplexity(text)).toBeCloseTo(0.75, 10);
    });

    it('adds 0.2 for word count > 100', () => {
      const text = Array(101).fill('zzz').join(' ');
      // base 0.5 + 0.2 (words>100) + 0.15 (avgSentenceLength 101>20) = 0.85
      expect(analyzer.analyzeTextComplexity(text)).toBeCloseTo(0.85, 10);
    });

    it('adds 0.1 for avg sentence length > 15 (<=20)', () => {
      // 16 words across 1 sentence => avgSentenceLength 16 (>15, <=20).
      const text = Array(16).fill('zzz').join(' ');
      // base 0.5, words 16 (not >50), avg 16 => +0.1 = 0.6
      expect(analyzer.analyzeTextComplexity(text)).toBeCloseTo(0.6, 10);
    });

    it('adds 0.15 for avg sentence length > 20', () => {
      // 21 words across 1 sentence => avgSentenceLength 21 (>20).
      const text = Array(21).fill('zzz').join(' ');
      // base 0.5, words 21 (not>50), avg 21 => +0.15 = 0.65
      expect(analyzer.analyzeTextComplexity(text)).toBeCloseTo(0.65, 10);
    });

    it('keeps short low-avg-sentence text at base', () => {
      // 3 words, 1 sentence => avg 3, no thresholds hit.
      expect(analyzer.analyzeTextComplexity('aaa bbb ccc')).toBe(0.5);
    });

    it('adds technical density capped at 0.3', () => {
      // All 10 words are "circuit" (a technical keyword) => density = 1.
      // min(1*2, 0.3) = 0.3. avg sentence length = 10/1 = 10 (no add).
      const text = Array(10).fill('circuit').join(' ');
      // base 0.5 + 0.3 (technical) = 0.8. ('circuit' contains no high/med/low kw)
      expect(analyzer.analyzeTextComplexity(text)).toBeCloseTo(0.8, 10);
    });

    it('adds 0.1 per high keyword present', () => {
      // "complex" is a high keyword. Single word => 1 word, 1 sentence.
      // base 0.5 + 0.1 (high "complex") = 0.6
      expect(analyzer.analyzeTextComplexity('complex')).toBeCloseTo(0.6, 10);
    });

    it('adds 0.05 per medium keyword present', () => {
      // "repair" is medium. base 0.5 + 0.05 = 0.55
      expect(analyzer.analyzeTextComplexity('repair')).toBeCloseTo(0.55, 10);
    });

    it('subtracts 0.05 per low keyword present', () => {
      // "simple" is low. base 0.5 - 0.05 = 0.45
      expect(analyzer.analyzeTextComplexity('simple')).toBeCloseTo(0.45, 10);
    });

    it('clamps to lower bound 0', () => {
      // Many low keywords drive complexity below 0; clamp to 0.
      const text =
        'simple basic easy quick minor small touch up clean tidy straightforward routine';
      expect(analyzer.analyzeTextComplexity(text)).toBe(0);
    });

    it('clamps to upper bound 1', () => {
      // Stack high keywords + technical + length to exceed 1, then clamp.
      const highWords =
        'complex complicated difficult challenging specialist custom bespoke ' +
        'professional certified licensed structural bearing foundation rewire replumb';
      const text = `${highWords} ${Array(120).fill('circuit').join(' ')}`;
      expect(analyzer.analyzeTextComplexity(text)).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // getCategorySkills + getCategoryBaseRisk — every mapped branch + default
  // ---------------------------------------------------------------------------
  describe('getCategorySkills', () => {
    it.each([
      [
        'plumbing',
        ['pipe fitting', 'leak repair', 'water systems', 'drainage'],
      ],
      [
        'electrical',
        [
          'wiring',
          'circuit installation',
          'electrical safety',
          'troubleshooting',
        ],
      ],
      ['carpentry', ['wood working', 'joinery', 'measuring', 'tool handling']],
      [
        'painting',
        [
          'surface preparation',
          'color matching',
          'brush techniques',
          'finishing',
        ],
      ],
      [
        'gardening',
        ['plant care', 'soil management', 'pruning', 'landscaping'],
      ],
      [
        'roofing',
        [
          'height work',
          'weatherproofing',
          'tile installation',
          'safety protocols',
        ],
      ],
      [
        'cleaning',
        [
          'sanitation',
          'product knowledge',
          'time management',
          'attention to detail',
        ],
      ],
      [
        'heating',
        [
          'HVAC systems',
          'gas safety',
          'thermostat installation',
          'maintenance',
        ],
      ],
      [
        'flooring',
        [
          'measuring',
          'subfloor preparation',
          'installation techniques',
          'finishing',
        ],
      ],
    ])('returns mapped skills for %s', (cat, expected) => {
      expect(analyzer.getCategorySkills(cat as string)).toEqual(expected);
    });

    it('falls back to general maintenance for unknown category', () => {
      expect(analyzer.getCategorySkills('unknown')).toEqual([
        'general maintenance',
      ]);
    });
  });

  describe('getCategoryBaseRisk', () => {
    it.each([
      ['electrical', 0.4],
      ['roofing', 0.5],
      ['plumbing', 0.3],
      ['heating', 0.4],
      ['carpentry', 0.2],
      ['painting', 0.1],
      ['cleaning', 0.05],
      ['gardening', 0.1],
      ['flooring', 0.15],
    ])('returns base risk for %s', (cat, expected) => {
      expect(analyzer.getCategoryBaseRisk(cat as string)).toBe(expected);
    });

    it('defaults to 0.2 for unknown category', () => {
      expect(analyzer.getCategoryBaseRisk('unknown')).toBe(0.2);
    });
  });

  // ---------------------------------------------------------------------------
  // extractSkillRequirements — patterns, technical/equipment skills, dedupe, cap
  // ---------------------------------------------------------------------------
  describe('extractSkillRequirements', () => {
    it('includes category base skills for empty text', () => {
      const skills = analyzer.extractSkillRequirements('', 'painting');
      expect(skills).toEqual([
        'surface preparation',
        'color matching',
        'brush techniques',
        'finishing',
      ]);
    });

    it('uses general maintenance fallback for unknown category', () => {
      expect(analyzer.extractSkillRequirements('', 'unknown')).toEqual([
        'general maintenance',
      ]);
    });

    it('extracts "X experience" via need pattern', () => {
      const skills = analyzer.extractSkillRequirements(
        'we need plumbing experience here',
        'unknown'
      );
      expect(skills).toContain('plumbing experience');
    });

    it('extracts "X skills" via require pattern', () => {
      const skills = analyzer.extractSkillRequirements(
        'require welding skills',
        'unknown'
      );
      expect(skills).toContain('welding skills');
    });

    it('extracts "X knowledge" via must-have pattern', () => {
      const skills = analyzer.extractSkillRequirements(
        'you must have electrical knowledge',
        'unknown'
      );
      expect(skills).toContain('electrical knowledge');
    });

    it('extracts the certified/licensed/qualified pattern (group 1 preferred)', () => {
      // Pattern /(certified|licensed|qualified) in ([a-z\s]+)/ captures group 1
      // ("certified") and group 2 ("gas work"). The impl adds (match[1] ?? match[2]),
      // i.e. group 1 wins => "certified" is the skill added.
      const skills = analyzer.extractSkillRequirements(
        'must be certified in gas work',
        'unknown'
      );
      expect(skills).toContain('certified');
    });

    it('adds technical keyword skills (underscores normalized to spaces)', () => {
      const skills = analyzer.extractSkillRequirements(
        'work on the heating_system valve',
        'unknown'
      );
      expect(skills).toContain('heating system');
      expect(skills).toContain('valve');
    });

    it('adds "<equipment> operation" skills for equipment keywords', () => {
      const skills = analyzer.extractSkillRequirements(
        'use a drill and a saw',
        'unknown'
      );
      expect(skills).toContain('drill operation');
      expect(skills).toContain('saw operation');
    });

    it('caps the returned skills at 8', () => {
      const text =
        'drill saw grinder compressor generator ladder pump ' +
        'circuit voltage valve fitting insulation drainage';
      const skills = analyzer.extractSkillRequirements(text, 'electrical');
      expect(skills.length).toBe(8);
    });

    it('dedupes skills via the Set', () => {
      const skills = analyzer.extractSkillRequirements(
        'drill drill drill',
        'unknown'
      );
      expect(skills.filter((s) => s === 'drill operation').length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // assessRiskLevel — base + each additive branch + clamp
  // ---------------------------------------------------------------------------
  describe('assessRiskLevel', () => {
    it('returns category base risk for neutral text', () => {
      expect(
        analyzer.assessRiskLevel('paint the door', 'painting')
      ).toBeCloseTo(0.1, 10);
    });

    it('adds 0.15 per risk keyword present', () => {
      // category cleaning base 0.05. "caution" is a single risk keyword.
      expect(analyzer.assessRiskLevel('caution sign', 'cleaning')).toBeCloseTo(
        0.2,
        10
      );
    });

    it('adds 0.2 for height-related work', () => {
      // base painting 0.1 + risk-kw "ladder" 0.15 + height regex 0.2 = 0.45
      expect(analyzer.assessRiskLevel('on a ladder', 'painting')).toBeCloseTo(
        0.45,
        10
      );
    });

    it('adds 0.25 for gas work', () => {
      // cleaning base 0.05; "boiler" matches gas regex only (not a risk keyword).
      expect(
        analyzer.assessRiskLevel('check the boiler', 'cleaning')
      ).toBeCloseTo(0.3, 10);
    });

    it('adds 0.3 for structural work', () => {
      // "foundation" matches structural regex => +0.3. cleaning base 0.05 = 0.35.
      expect(
        analyzer.assessRiskLevel('repair the foundation', 'cleaning')
      ).toBeCloseTo(0.35, 10);
    });

    it('adds 0.1 for emergency/urgent situations', () => {
      // cleaning base 0.05; "urgent" matches emergency regex (+0.1) only.
      expect(analyzer.assessRiskLevel('urgent please', 'cleaning')).toBeCloseTo(
        0.15,
        10
      );
    });

    it('adds 0.15 for electrical regex match', () => {
      // cleaning base 0.05; "wiring" matches electrical regex only (+0.15).
      expect(
        analyzer.assessRiskLevel('check the wiring', 'cleaning')
      ).toBeCloseTo(0.2, 10);
    });

    it('clamps risk to 1 when many factors stack', () => {
      const text =
        'dangerous gas leak electrical wiring on a ladder roof structural foundation emergency flooding';
      expect(analyzer.assessRiskLevel(text, 'roofing')).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // assessMaterialComplexity — base + special materials + custom + count tiers
  // ---------------------------------------------------------------------------
  describe('assessMaterialComplexity', () => {
    it('returns base 0.3 for neutral text', () => {
      expect(analyzer.assessMaterialComplexity('a quiet job')).toBeCloseTo(
        0.3,
        10
      );
    });

    it('adds 0.1 per special material', () => {
      // "marble" special material (+0.1). Not in keywords.materials list.
      expect(analyzer.assessMaterialComplexity('marble worktop')).toBeCloseTo(
        0.4,
        10
      );
    });

    it('adds 0.2 for custom/bespoke materials', () => {
      // "bespoke" matches custom regex (+0.2). 0.3 + 0.2 = 0.5
      expect(analyzer.assessMaterialComplexity('bespoke unit')).toBeCloseTo(
        0.5,
        10
      );
    });

    it('adds 0.1 for 2-3 material-type keywords', () => {
      // "wood" + "metal" are keywords.materials => count 2 (>1, <=3) +0.1.
      expect(analyzer.assessMaterialComplexity('wood and metal')).toBeCloseTo(
        0.4,
        10
      );
    });

    it('adds 0.15 for more than 3 material-type keywords', () => {
      // wood metal plastic ceramic => 4 materials (>3) +0.15. None special.
      expect(
        analyzer.assessMaterialComplexity('wood metal plastic ceramic')
      ).toBeCloseTo(0.45, 10);
    });

    it('clamps material complexity to 1', () => {
      const text =
        'marble granite hardwood engineered composite stainless steel copper ' +
        'cast iron porcelain natural stone tile laminate vinyl custom bespoke ' +
        'wood metal plastic ceramic stone glass';
      expect(analyzer.assessMaterialComplexity(text)).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // estimateTimeRequirement — provided estimate, category bases, size multipliers
  // ---------------------------------------------------------------------------
  describe('estimateTimeRequirement', () => {
    it('returns the provided estimate verbatim when given', () => {
      expect(
        analyzer.estimateTimeRequirement('anything', 'plumbing', 7.5)
      ).toBe(7.5);
    });

    it.each([
      ['plumbing', 4],
      ['electrical', 3],
      ['painting', 8],
      ['carpentry', 6],
      ['cleaning', 2],
      ['gardening', 4],
      ['roofing', 12],
      ['heating', 5],
      ['flooring', 10],
    ])('uses base time for category %s', (cat, expected) => {
      expect(
        analyzer.estimateTimeRequirement('do the job', cat as string)
      ).toBe(expected);
    });

    it('defaults base time to 4 for unknown category', () => {
      expect(analyzer.estimateTimeRequirement('do the job', 'unknown')).toBe(4);
    });

    it('doubles for whole-job indicators', () => {
      // plumbing 4 * 2 (entire) = 8
      expect(analyzer.estimateTimeRequirement('entire house', 'plumbing')).toBe(
        8
      );
    });

    it('halves for small-job indicators', () => {
      // plumbing 4 * 0.5 (small) = 2
      expect(analyzer.estimateTimeRequirement('small fix', 'plumbing')).toBe(2);
    });

    it('multiplies by 1.5 for large/major indicators', () => {
      // plumbing 4 * 1.5 (major) = 6
      expect(analyzer.estimateTimeRequirement('major works', 'plumbing')).toBe(
        6
      );
    });

    it('scales by room count', () => {
      // cleaning base 2. "3 rooms" => rooms 3 => *max(1, 3*0.5=1.5) => 3.
      expect(analyzer.estimateTimeRequirement('3 rooms', 'cleaning')).toBe(3);
    });

    it('applies a 1.3 multiplier for multiple phases', () => {
      // electrical 3 * 1.3 (phase) = 3.9 => round(7.8)/2 = 8/2 = 4
      expect(
        analyzer.estimateTimeRequirement(
          'phase one then phase two',
          'electrical'
        )
      ).toBe(4);
    });

    it('rounds to nearest 0.5 hour', () => {
      // carpentry 6 * 1.3 (phase) = 7.8 => round(15.6)/2 = 16/2 = 8
      expect(analyzer.estimateTimeRequirement('phase work', 'carpentry')).toBe(
        8
      );
    });

    it('enforces a 0.5 hour minimum floor', () => {
      const result = analyzer.estimateTimeRequirement(
        'small quick simple minor',
        'cleaning'
      );
      expect(result).toBeGreaterThanOrEqual(0.5);
    });
  });

  // ---------------------------------------------------------------------------
  // requiresSpecialEquipment
  // ---------------------------------------------------------------------------
  describe('requiresSpecialEquipment', () => {
    it('returns false for neutral text', () => {
      expect(analyzer.requiresSpecialEquipment('paint the wall')).toBe(false);
    });

    it('returns true when an equipment keyword is present', () => {
      expect(analyzer.requiresSpecialEquipment('bring a drill')).toBe(true);
    });

    it('returns true when a special indicator is present', () => {
      expect(analyzer.requiresSpecialEquipment('erect a scaffold')).toBe(true);
    });

    it('returns true for industrial indicator', () => {
      expect(analyzer.requiresSpecialEquipment('industrial setup')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // requiresCertification
  // ---------------------------------------------------------------------------
  describe('requiresCertification', () => {
    it.each(['electrical', 'gas', 'plumbing', 'roofing'])(
      'returns true for certification category %s',
      (cat) => {
        expect(analyzer.requiresCertification('any text', cat)).toBe(true);
      }
    );

    it('returns false for non-cert category with no cert keyword', () => {
      expect(
        analyzer.requiresCertification('clean the floor', 'cleaning')
      ).toBe(false);
    });

    it('returns true when a certification keyword is present', () => {
      expect(
        analyzer.requiresCertification(
          'must be gas safe registered',
          'cleaning'
        )
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateOverallComplexity — exact weighted sums + clamp
  // ---------------------------------------------------------------------------
  describe('calculateOverallComplexity', () => {
    it('returns 0 for all-zero factors', () => {
      expect(
        analyzer.calculateOverallComplexity({
          textComplexity: 0,
          skillRequirements: 0,
          riskLevel: 0,
          materialComplexity: 0,
          specialEquipment: false,
          certificationRequired: false,
        })
      ).toBe(0);
    });

    it('computes the exact weighted sum for mixed factors', () => {
      // text 0.5*0.2=0.1; skillScore min(1,4/5)=0.8*0.25=0.2;
      // risk 0.4*0.3=0.12; material 0.6*0.15=0.09; equip true 0.05; cert false 0
      // total = 0.56
      expect(
        analyzer.calculateOverallComplexity({
          textComplexity: 0.5,
          skillRequirements: 4,
          riskLevel: 0.4,
          materialComplexity: 0.6,
          specialEquipment: true,
          certificationRequired: false,
        })
      ).toBeCloseTo(0.56, 10);
    });

    it('normalizes skillRequirements at/above 5 to 1', () => {
      // skill 10 => min(1, 10/5)=1 *0.25 = 0.25. All else 0 / false.
      expect(
        analyzer.calculateOverallComplexity({
          textComplexity: 0,
          skillRequirements: 10,
          riskLevel: 0,
          materialComplexity: 0,
          specialEquipment: false,
          certificationRequired: false,
        })
      ).toBeCloseTo(0.25, 10);
    });

    it('clamps to 1 when all factors are maxed', () => {
      expect(
        analyzer.calculateOverallComplexity({
          textComplexity: 1,
          skillRequirements: 100,
          riskLevel: 1,
          materialComplexity: 1,
          specialEquipment: true,
          certificationRequired: true,
        })
      ).toBe(1);
    });

    it('counts certificationRequired weight when true', () => {
      // only cert true => 1*0.05 = 0.05
      expect(
        analyzer.calculateOverallComplexity({
          textComplexity: 0,
          skillRequirements: 0,
          riskLevel: 0,
          materialComplexity: 0,
          specialEquipment: false,
          certificationRequired: true,
        })
      ).toBeCloseTo(0.05, 10);
    });
  });

  // ---------------------------------------------------------------------------
  // analyze() — full integration, exact result shape + logging
  // ---------------------------------------------------------------------------
  describe('analyze (integration)', () => {
    it('produces an exact result for a simple cleaning job', async () => {
      const result = await analyzer.analyze({
        title: 'Clean',
        description: 'tidy the room',
        category: 'cleaning',
        estimatedDuration: 2,
      });

      // combinedText = "clean tidy the room"
      // textComplexity: base 0.5, low kw "clean"(-0.05) + "tidy"(-0.05) = 0.40
      expect(result.textComplexity).toBeCloseTo(0.4, 10);

      expect(result.skillRequirements).toEqual([
        'sanitation',
        'product knowledge',
        'time management',
        'attention to detail',
      ]);

      // riskLevel: cleaning base 0.05.
      expect(result.riskLevel).toBeCloseTo(0.05, 10);
      // materialComplexity: base 0.3.
      expect(result.materialComplexity).toBeCloseTo(0.3, 10);
      // timeEstimate: providedEstimate 2.
      expect(result.timeEstimate).toBe(2);
      expect(result.specialEquipment).toBe(false);
      expect(result.certificationRequired).toBe(false);

      // overall: text 0.4*0.2=0.08; skill 0.8*0.25=0.2; risk 0.05*0.3=0.015;
      // material 0.3*0.15=0.045; total = 0.34
      expect(result.overallComplexity).toBeCloseTo(0.34, 10);

      expect(logger.info).toHaveBeenCalledWith(
        'Job complexity analysis completed',
        expect.objectContaining({
          overallComplexity: '0.34',
          skillsCount: 4,
          riskLevel: '0.05',
          timeEstimate: 2,
        })
      );
    });

    it('handles a complex high-risk electrical job without an estimate', async () => {
      const result = await analyzer.analyze({
        title: 'Emergency rewire',
        description:
          'Complex structural electrical rewire with dangerous gas leak near the ladder on the roof',
        category: 'electrical',
        photos: ['a.jpg'],
      });

      expect(result.certificationRequired).toBe(true); // electrical category
      expect(result.specialEquipment).toBe(true); // "ladder" equipment keyword
      expect(result.riskLevel).toBeGreaterThan(0.5);
      expect(result.riskLevel).toBeLessThanOrEqual(1);
      expect(result.overallComplexity).toBeGreaterThan(0.4);
      expect(result.overallComplexity).toBeLessThanOrEqual(1);
      expect(result.timeEstimate).toBeGreaterThanOrEqual(0.5);
      expect((result.timeEstimate * 2) % 1).toBe(0);
      expect(result.skillRequirements.length).toBeLessThanOrEqual(8);
    });

    it('handles empty title/description gracefully', async () => {
      const result = await analyzer.analyze({
        title: '',
        description: '',
        category: 'gardening',
      });
      expect(result.textComplexity).toBeGreaterThanOrEqual(0);
      expect(result.textComplexity).toBeLessThanOrEqual(1);
      expect(result.skillRequirements).toEqual([
        'plant care',
        'soil management',
        'pruning',
        'landscaping',
      ]);
      expect(result.riskLevel).toBeCloseTo(0.1, 10); // gardening base
      expect(result.timeEstimate).toBe(4); // gardening base
      expect(result.certificationRequired).toBe(false);
      expect(result.specialEquipment).toBe(false);
    });
  });
});
