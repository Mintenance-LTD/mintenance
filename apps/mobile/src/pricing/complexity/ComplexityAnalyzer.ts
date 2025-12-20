/**
 * JOB COMPLEXITY ANALYZER
 * Specialized module for analyzing job complexity factors
 *
 * Responsibilities:
 * - Text complexity analysis using NLP techniques
 * - Technical skill requirement extraction
 * - Risk assessment based on job characteristics
 * - Time estimation for job completion
 * - Material complexity evaluation
 */

import { logger } from '../../utils/logger';

export interface JobComplexityResult {
  overallComplexity: number; // 0-1 scale
  textComplexity: number; // Language complexity score
  skillRequirements: string[]; // Required skills list
  timeEstimate: number; // Estimated hours
  materialComplexity: number; // Material complexity score
  riskLevel: number; // Risk assessment score
  specialEquipment: boolean; // Special equipment needed
  certificationRequired: boolean; // Professional certification needed
}

interface ComplexityKeywords {
  high: string[];
  medium: string[];
  low: string[];
  technical: string[];
  risk: string[];
  materials: string[];
  equipment: string[];
  certifications: string[];
}

/**
 * Job Complexity Analyzer
 * Analyzes various aspects of job complexity
 */
export class ComplexityAnalyzer {
  private keywords: ComplexityKeywords;
  private initialized = false;

  constructor() {
    this.keywords = this.initializeKeywords();
  }

  /**
   * Initialize the complexity analyzer
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load additional complexity models or data if needed
      this.initialized = true;
      logger.info('Complexity analyzer initialized');
    } catch (error) {
      logger.error('Failed to initialize complexity analyzer:', error);
      throw error;
    }
  }

  /**
   * Analyze job complexity from input data
   */
  async analyze(input: {
    title: string;
    description: string;
    category: string;
    photos?: string[];
    estimatedDuration?: number;
  }): Promise<JobComplexityResult> {
    const combinedText = `${input.title} ${input.description}`.toLowerCase();

    // Analyze different complexity aspects
    const textComplexity = this.analyzeTextComplexity(combinedText);
    const skillRequirements = this.extractSkillRequirements(
      combinedText,
      input.category
    );
    const riskLevel = this.assessRiskLevel(combinedText, input.category);
    const materialComplexity = this.assessMaterialComplexity(combinedText);
    const timeEstimate = this.estimateTimeRequirement(
      combinedText,
      input.category,
      input.estimatedDuration
    );
    const specialEquipment = this.requiresSpecialEquipment(combinedText);
    const certificationRequired = this.requiresCertification(
      combinedText,
      input.category
    );

    // Calculate overall complexity
    const overallComplexity = this.calculateOverallComplexity({
      textComplexity,
      skillRequirements: skillRequirements.length,
      riskLevel,
      materialComplexity,
      specialEquipment,
      certificationRequired,
    });

    const result: JobComplexityResult = {
      overallComplexity,
      textComplexity,
      skillRequirements,
      timeEstimate,
      materialComplexity,
      riskLevel,
      specialEquipment,
      certificationRequired,
    };

    logger.info('Job complexity analysis completed', {
      overallComplexity: result.overallComplexity.toFixed(2),
      skillsCount: result.skillRequirements.length,
      riskLevel: result.riskLevel.toFixed(2),
      timeEstimate: result.timeEstimate,
    });

    return result;
  }

  /**
   * Analyze text complexity using linguistic features
   */
  private analyzeTextComplexity(text: string): number {
    const words = text.split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    let complexity = 0.5; // Base complexity

    // Word count factor
    if (words.length > 100) complexity += 0.2;
    else if (words.length > 50) complexity += 0.1;

    // Average sentence length
    const avgSentenceLength = words.length / Math.max(sentences.length, 1);
    if (avgSentenceLength > 20) complexity += 0.15;
    else if (avgSentenceLength > 15) complexity += 0.1;

    // Technical vocabulary density
    const technicalWords = words.filter((word) =>
      this.keywords.technical.some((tech) => word.includes(tech))
    ).length;
    const technicalDensity = technicalWords / words.length;
    complexity += Math.min(technicalDensity * 2, 0.3);

    // Complexity keywords
    this.keywords.high.forEach((keyword) => {
      if (text.includes(keyword)) complexity += 0.1;
    });

    this.keywords.medium.forEach((keyword) => {
      if (text.includes(keyword)) complexity += 0.05;
    });

    this.keywords.low.forEach((keyword) => {
      if (text.includes(keyword)) complexity -= 0.05;
    });

    return Math.max(0, Math.min(1, complexity));
  }

  /**
   * Extract required skills from job description
   */
  private extractSkillRequirements(text: string, category: string): string[] {
    const skills = new Set<string>();

    // Category-based base skills
    const categorySkills = this.getCategorySkills(category);
    categorySkills.forEach((skill) => skills.add(skill));

    // Extract skills from text
    const skillPatterns = [
      /need.*?([a-z]+ experience)/gi,
      /require.*?([a-z]+ skills?)/gi,
      /must have.*?([a-z]+ knowledge)/gi,
      /(certified|licensed|qualified) in ([a-z\s]+)/gi,
    ];

    skillPatterns.forEach((pattern) => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] || match[2]) {
          skills.add((match[1] || match[2]).trim());
        }
      }
    });

    // Technical skills detection
    this.keywords.technical.forEach((tech) => {
      if (text.includes(tech)) {
        skills.add(tech.replace(/_/g, ' '));
      }
    });

    // Equipment-specific skills
    this.keywords.equipment.forEach((equipment) => {
      if (text.includes(equipment)) {
        skills.add(`${equipment} operation`);
      }
    });

    return Array.from(skills).slice(0, 8); // Limit to 8 most relevant skills
  }

  /**
   * Assess risk level based on job characteristics
   */
  private assessRiskLevel(text: string, category: string): number {
    let risk = this.getCategoryBaseRisk(category);

    // Risk keywords increase risk score
    this.keywords.risk.forEach((riskWord) => {
      if (text.includes(riskWord)) {
        risk += 0.15;
      }
    });

    // Height-related work
    if (text.match(/roof|ladder|height|ceiling|tall|stories|floors above/i)) {
      risk += 0.2;
    }

    // Electrical work
    if (text.match(/electric|wiring|circuit|voltage|power|electrical/i)) {
      risk += 0.15;
    }

    // Gas work
    if (text.match(/gas|boiler|heating system|gas line|gas leak/i)) {
      risk += 0.25;
    }

    // Structural work
    if (text.match(/structural|foundation|bearing wall|load.*bearing/i)) {
      risk += 0.3;
    }

    // Emergency/urgent situations
    if (
      text.match(/emergency|urgent|asap|immediately|broken|leaking|flooding/i)
    ) {
      risk += 0.1;
    }

    return Math.max(0, Math.min(1, risk));
  }

  /**
   * Assess material complexity
   */
  private assessMaterialComplexity(text: string): number {
    let complexity = 0.3; // Base material complexity

    // Specialized materials
    const specialMaterials = [
      'marble',
      'granite',
      'hardwood',
      'engineered',
      'composite',
      'stainless steel',
      'copper',
      'cast iron',
      'porcelain',
      'natural stone',
      'tile',
      'laminate',
      'vinyl',
    ];

    specialMaterials.forEach((material) => {
      if (text.includes(material)) complexity += 0.1;
    });

    // Custom/bespoke materials
    if (text.match(/custom|bespoke|made.*measure|specific.*requirements/i)) {
      complexity += 0.2;
    }

    // Multiple material types
    const materialCount = this.keywords.materials.filter((material) =>
      text.includes(material)
    ).length;

    if (materialCount > 3) complexity += 0.15;
    else if (materialCount > 1) complexity += 0.1;

    return Math.max(0, Math.min(1, complexity));
  }

  /**
   * Estimate time requirement for job completion
   */
  private estimateTimeRequirement(
    text: string,
    category: string,
    providedEstimate?: number
  ): number {
    if (providedEstimate) {
      return providedEstimate;
    }

    // Base time estimates by category (in hours)
    const baseTimes = {
      plumbing: 4,
      electrical: 3,
      painting: 8,
      carpentry: 6,
      cleaning: 2,
      gardening: 4,
      roofing: 12,
      heating: 5,
      flooring: 10,
    };

    let estimate = baseTimes[category as keyof typeof baseTimes] || 4;

    // Adjust based on job size indicators
    if (text.match(/entire|whole|complete|full/i)) estimate *= 2;
    if (text.match(/small|minor|quick|simple/i)) estimate *= 0.5;
    if (text.match(/large|major|extensive|complex/i)) estimate *= 1.5;

    // Room/area indicators
    const roomMatches = text.match(/(\d+)\s*(room|bedroom|bathroom)/gi);
    if (roomMatches) {
      const rooms = parseInt(roomMatches[0]) || 1;
      estimate *= Math.max(1, rooms * 0.5);
    }

    // Multiple phases/steps
    if (text.match(/phase|step|stage|first.*then|multiple/i)) {
      estimate *= 1.3;
    }

    return Math.max(0.5, Math.round(estimate * 2) / 2); // Round to nearest 0.5 hour
  }

  /**
   * Check if special equipment is required
   */
  private requiresSpecialEquipment(text: string): boolean {
    const equipmentNeeded = this.keywords.equipment.some((equipment) =>
      text.includes(equipment)
    );

    const specialIndicators = [
      'scaffold',
      'crane',
      'hoist',
      'compressor',
      'generator',
      'specialized tool',
      'professional equipment',
      'industrial',
    ];

    const specialNeeded = specialIndicators.some((indicator) =>
      text.includes(indicator)
    );

    return equipmentNeeded || specialNeeded;
  }

  /**
   * Check if professional certification is required
   */
  private requiresCertification(text: string, category: string): boolean {
    // Category-specific certification requirements
    const certificationCategories = [
      'electrical',
      'gas',
      'plumbing',
      'roofing',
    ];
    if (certificationCategories.includes(category)) {
      return true;
    }

    // Text-based certification indicators
    const certificationIndicators = this.keywords.certifications;
    return certificationIndicators.some((cert) => text.includes(cert));
  }

  /**
   * Calculate overall complexity score
   */
  private calculateOverallComplexity(factors: {
    textComplexity: number;
    skillRequirements: number;
    riskLevel: number;
    materialComplexity: number;
    specialEquipment: boolean;
    certificationRequired: boolean;
  }): number {
    const weights = {
      textComplexity: 0.2,
      skillRequirements: 0.25,
      riskLevel: 0.3,
      materialComplexity: 0.15,
      specialEquipment: 0.05,
      certificationRequired: 0.05,
    };

    const skillScore = Math.min(1, factors.skillRequirements / 5); // Normalize to 0-1

    const complexity =
      factors.textComplexity * weights.textComplexity +
      skillScore * weights.skillRequirements +
      factors.riskLevel * weights.riskLevel +
      factors.materialComplexity * weights.materialComplexity +
      (factors.specialEquipment ? 1 : 0) * weights.specialEquipment +
      (factors.certificationRequired ? 1 : 0) * weights.certificationRequired;

    return Math.max(0, Math.min(1, complexity));
  }

  /**
   * Get base skills for category
   */
  private getCategorySkills(category: string): string[] {
    const skillMap = {
      plumbing: ['pipe fitting', 'leak repair', 'water systems', 'drainage'],
      electrical: [
        'wiring',
        'circuit installation',
        'electrical safety',
        'troubleshooting',
      ],
      carpentry: ['wood working', 'joinery', 'measuring', 'tool handling'],
      painting: [
        'surface preparation',
        'color matching',
        'brush techniques',
        'finishing',
      ],
      gardening: ['plant care', 'soil management', 'pruning', 'landscaping'],
      roofing: [
        'height work',
        'weatherproofing',
        'tile installation',
        'safety protocols',
      ],
      cleaning: [
        'sanitation',
        'product knowledge',
        'time management',
        'attention to detail',
      ],
      heating: [
        'HVAC systems',
        'gas safety',
        'thermostat installation',
        'maintenance',
      ],
      flooring: [
        'measuring',
        'subfloor preparation',
        'installation techniques',
        'finishing',
      ],
    };

    return (
      skillMap[category as keyof typeof skillMap] || ['general maintenance']
    );
  }

  /**
   * Get base risk level for category
   */
  private getCategoryBaseRisk(category: string): number {
    const riskLevels = {
      electrical: 0.4,
      roofing: 0.5,
      plumbing: 0.3,
      heating: 0.4,
      carpentry: 0.2,
      painting: 0.1,
      cleaning: 0.05,
      gardening: 0.1,
      flooring: 0.15,
    };

    return riskLevels[category as keyof typeof riskLevels] || 0.2;
  }

  /**
   * Initialize complexity keywords
   */
  private initializeKeywords(): ComplexityKeywords {
    return {
      high: [
        'complex',
        'complicated',
        'difficult',
        'challenging',
        'specialist',
        'custom',
        'bespoke',
        'professional',
        'certified',
        'licensed',
        'structural',
        'bearing',
        'foundation',
        'rewire',
        'replumb',
      ],
      medium: [
        'repair',
        'replace',
        'install',
        'upgrade',
        'maintenance',
        'service',
        'check',
        'inspect',
        'diagnose',
        'troubleshoot',
      ],
      low: [
        'simple',
        'basic',
        'easy',
        'quick',
        'minor',
        'small',
        'touch up',
        'clean',
        'tidy',
        'straightforward',
        'routine',
      ],
      technical: [
        'circuit',
        'voltage',
        'amperage',
        'pressure',
        'temperature',
        'thermostat',
        'valve',
        'junction',
        'fitting',
        'insulation',
        'waterproofing',
        'ventilation',
        'drainage',
        'heating_system',
      ],
      risk: [
        'dangerous',
        'hazardous',
        'safety',
        'risk',
        'caution',
        'warning',
        'emergency',
        'leak',
        'gas',
        'electrical',
        'height',
        'ladder',
        'scaffold',
        'structural',
        'bearing',
      ],
      materials: [
        'wood',
        'metal',
        'plastic',
        'ceramic',
        'stone',
        'glass',
        'concrete',
        'brick',
        'tile',
        'vinyl',
        'laminate',
        'carpet',
      ],
      equipment: [
        'drill',
        'saw',
        'grinder',
        'compressor',
        'generator',
        'ladder',
        'scaffold',
        'crane',
        'hoist',
        'pump',
      ],
      certifications: [
        'licensed',
        'certified',
        'qualified',
        'registered',
        'approved',
        'gas safe',
        'part p',
        'city and guilds',
        'nvq',
        'btec',
      ],
    };
  }

  /**
   * Check if analyzer is healthy and ready
   */
  isHealthy(): boolean {
    return this.initialized;
  }
}

export const complexityAnalyzer = new ComplexityAnalyzer();
