/**
 * Shared AI Types for Mintenance Platform
 * Used by both web and mobile applications
 */
// Building Assessment Types
export interface BuildingAssessment {
  id: string;
  timestamp: string;
  damageAssessment: DamageAssessment;
  safetyHazards: SafetyHazards;
  insuranceRisk: InsuranceRisk;
  complianceFlags: ComplianceFlag[];
  recommendations: string[];
  estimatedCost: CostEstimate;
  confidence: number;
  metadata: AssessmentMetadata;
  trainingData?: TrainingDataEntry;
}
export interface DamageAssessment {
  damageType: string;
  severity: 'minimal' | 'moderate' | 'severe' | 'critical';
  confidence: number;
  description: string;
  affectedArea?: number;
  progression?: 'early' | 'midway' | 'full';
  detectedIssues: DetectedIssue[];
}
export interface DetectedIssue {
  type: string;
  location: string;
  severity: number;
  boundingBox?: BoundingBox;
  confidence: number;
  source: 'gpt4' | 'roboflow' | 'google_vision' | 'sam3' | 'fusion';
}
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface SafetyHazards {
  hasSafetyHazards: boolean;
  criticalFlags: string[];
  immediateActionRequired: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  details: string;
}
export interface InsuranceRisk {
  riskScore: number;
  category: 'low' | 'medium' | 'high' | 'very_high';
  factors: string[];
  recommendedAction: string;
  estimatedPremiumImpact?: number;
}
export interface ComplianceFlag {
  regulation: string;
  status: 'compliant' | 'non_compliant' | 'requires_review';
  details: string;
  priority: 'low' | 'medium' | 'high';
}
export interface CostEstimate {
  min: number;
  max: number;
  likely: number;
  currency: string;
  breakdown?: CostBreakdown[];
  confidence: number;
}
export interface CostBreakdown {
  item: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  category: string;
}
export interface AssessmentMetadata {
  model: string;
  version: string;
  processingTime: number;
  imageCount: number;
  apiCalls: APICallRecord[];
  costTracking: CostTracking;
}
export interface APICallRecord {
  service: string;
  timestamp: string;
  duration: number;
  success: boolean;
  cost?: number;
}
export interface CostTracking {
  estimatedCost: number;
  actualCost: number;
  breakdown: { [service: string]: number };
}
// Training Data Types
export interface TrainingDataEntry {
  assessmentId: string;
  images: string[];
  labels: unknown;
  corrections?: UserCorrection[];
  confidence: number;
  useForTraining: boolean;
  modelVersion?: string;
}
export interface UserCorrection {
  field: string;
  originalValue: unknown;
  correctedValue: unknown;
  userId: string;
  timestamp: string;
  confidence: number;
}
// Pricing Types
export interface PricingRecommendation {
  jobId: string;
  recommendedPrice: number;
  priceRange: {
    min: number;
    max: number;
    optimal: number;
  };
  marketAnalysis: MarketAnalysis;
  factors: PricingFactor[];
  confidence: number;
  competitiveness: 'too_low' | 'competitive' | 'premium' | 'too_high';
  reasoning: string;
}
export interface MarketAnalysis {
  averagePrice: number;
  medianPrice: number;
  priceDistribution: number[];
  demandLevel: 'low' | 'medium' | 'high';
  competitorCount: number;
  historicalTrend: 'decreasing' | 'stable' | 'increasing';
}
export interface PricingFactor {
  name: string;
  impact: number;
  weight: number;
  description: string;
}
// Agent Types
export interface AgentDecision {
  agentName: string;
  decisionType: string;
  actionTaken: string;
  confidence: number;
  reasoning: string;
  metadata: Record<string, unknown>;
  timestamp: string;
  userId?: string;
  automated: boolean;
}
export interface AgentContext {
  userId: string;
  jobId?: string;
  contractorId?: string;
  automationPreferences: AutomationPreferences;
  historicalData?: unknown;
}
export interface AutomationPreferences {
  enableAutomation: boolean;
  automationLevel: 'none' | 'minimal' | 'moderate' | 'full';
  requireApproval: boolean;
  notificationSettings: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}
// Search Types
export interface SemanticSearchQuery {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
  includeEmbeddings?: boolean;
}
export interface SearchFilters {
  category?: string;
  location?: string;
  priceRange?: { min: number; max: number };
  dateRange?: { start: Date; end: Date };
  status?: string[];
}
export interface SearchResult {
  id: string;
  type: 'job' | 'contractor' | 'service';
  title: string;
  description: string;
  relevanceScore: number;
  highlights: string[];
  metadata: Record<string, unknown>;
}
// Sustainability Types (from mobile)
export interface ESGScore {
  overall: number;
  environmental: number;
  social: number;
  governance: number;
  breakdown: ESGBreakdown;
  recommendations: string[];
  certifications: string[];
}
export interface ESGBreakdown {
  carbonFootprint: number;
  wasteReduction: number;
  energyEfficiency: number;
  localSourcing: number;
  fairLabor: number;
  communityImpact: number;
  ethicalPractices: number;
}
// Image Analysis Types
export interface ImageAnalysis {
  labels: DetectedLabel[];
  objects: DetectedObject[];
  text: DetectedText[];
  properties: ImageProperties;
  category: string;
  suggestedActions: string[];
}
export interface DetectedLabel {
  name: string;
  confidence: number;
  topicality: number;
}
export interface DetectedObject {
  name: string;
  confidence: number;
  boundingBox: BoundingBox;
}
export interface DetectedText {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
}
export interface ImageProperties {
  dominantColors: string[];
  brightness: number;
  contrast: number;
  quality: 'low' | 'medium' | 'high';
}
// Model Training Types
export interface ModelTrainingConfig {
  modelType: 'yolo' | 'classification' | 'segmentation';
  datasetSize: number;
  epochs: number;
  batchSize: number;
  learningRate: number;
  validationSplit: number;
  augmentation: boolean;
}
export interface TrainingProgress {
  currentEpoch: number;
  totalEpochs: number;
  loss: number;
  accuracy: number;
  validationLoss?: number;
  validationAccuracy?: number;
  timeRemaining: number;
  status: 'preparing' | 'training' | 'validating' | 'completed' | 'failed';
}
// Cost Control Types
export interface CostLimit {
  daily: number;
  weekly: number;
  monthly: number;
  perUser?: number;
  perRequest?: number;
}
export interface UsageMetrics {
  service: string;
  period: 'daily' | 'weekly' | 'monthly';
  requests: number;
  cost: number;
  avgCostPerRequest: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}
// Shared Response Types
export interface AIServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: AIServiceError;
  metadata: ResponseMetadata;
}
export interface AIServiceError {
  code: string;
  message: string;
  details?: unknown;
  retryable: boolean;
  fallbackUsed?: boolean;
}
export interface ResponseMetadata {
  requestId: string;
  timestamp: string;
  processingTime: number;
  apiCalls: number;
  totalCost: number;
  cacheHit: boolean;
  modelVersion: string;
}
// Configuration Types
export interface AIServiceConfig {
  apiKeys: {
    openai?: string;
    googleCloud?: string;
    roboflow?: string;
    huggingface?: string;
  };
  endpoints: {
    buildingSurveyor: string;
    agents: string;
    search: string;
    training: string;
  };
  limits: CostLimit;
  features: {
    enableSAM3: boolean;
    enableShadowMode: boolean;
    enableABTesting: boolean;
    enableContinuousLearning: boolean;
    enableTrainingDataCollection: boolean;
  };
  performance: {
    timeout: number;
    maxRetries: number;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
}