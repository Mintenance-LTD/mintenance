# Building Surveyor AI - Complete Implementation Plan

## 🎯 Executive Summary

Transform the flawed current system into a robust, honest, and effective building damage assessment AI that **knows when it doesn't know**.

**Timeline**: 8 weeks
**Team**: 3 engineers (1 ML, 1 Backend, 1 Frontend)
**Budget**: ~$75K (engineering + compute + data)
**Expected Outcome**: 25-30% automation rate with verified safety guarantees

---

## Phase 0: Emergency Patches (Day 1-2) 🚨

### 0.1 Fix UCB/LCB Error

**File**: `apps/web/lib/services/building-surveyor/critic.ts`

```typescript
// Step 1: Add new LCB method (Line 220)
private static computeSafetyLCB(
    context: number[],
    models: ModelParameters
): number {
    const meanSafety = this.dotProduct(models.phi, context);
    const confidenceInterval = models.gamma * this.matrixVectorNorm(context, models.B);
    return meanSafety - confidenceInterval; // LOWER bound (pessimistic)
}

// Step 2: Update decision logic (Line 119-134)
const safetyLcb = this.computeSafetyLCB(context, models);
if (safetyLcb < delta_safety) {
    logger.warn('Safety LCB below threshold', {
        safetyLcb,
        threshold: delta_safety,
        reason: 'Using pessimistic safety bound'
    });
    return {
        arm: 'escalate',
        reason: `Safety LCB (${safetyLcb.toFixed(4)}) below threshold (${delta_safety})`
    };
}
```

### 0.2 Add Critical Hazard Blacklist

**File**: `apps/web/lib/services/building-surveyor/BuildingSurveyorService.ts`

```typescript
// Add at line 150, before main assessment
const CRITICAL_HAZARDS = [
    'gas_leak', 'gas_smell', 'gas_pipe_damage',
    'chemical_spill', 'chemical_hazard',
    'asbestos', 'asbestos_suspected',
    'structural_collapse', 'structural_failure', 'structural_crack',
    'foundation_crack', 'foundation_issue',
    'electrical_hazard', 'exposed_wiring', 'electrical_fire_risk'
];

// Check all detections
const detectedClasses = [
    ...roboflowDetections.map(d => d.className.toLowerCase()),
    ...(visionAnalysis?.detectedFeatures || []).map(f => f.toLowerCase())
];

const criticalHazardDetected = detectedClasses.some(cls =>
    CRITICAL_HAZARDS.some(hazard => cls.includes(hazard))
);

if (criticalHazardDetected) {
    logger.error('CRITICAL HAZARD DETECTED - FORCING ESCALATION', {
        detected: detectedClasses.filter(cls =>
            CRITICAL_HAZARDS.some(h => cls.includes(h))
        ),
        assessmentId: context?.assessmentId
    });

    return {
        ...assessment,
        decisionResult: {
            decision: 'escalate',
            reason: 'Critical hazard detected - automatic escalation required',
            safetyOverride: true,
            criticalHazards: detectedClasses
        }
    };
}
```

### 0.3 Update Documentation & UI Warnings

**File**: `apps/web/app/contractor/dashboard/components/BuildingSurveyorWarning.tsx`

```tsx
export function BuildingSurveyorWarning() {
    return (
        <Alert className="mb-4 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle>AI Building Surveyor - Limited Automation</AlertTitle>
            <AlertDescription>
                <div className="mt-2 text-sm">
                    <p className="font-semibold mb-1">Current System Limitations:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                        <li>Only automates high-confidence cases (~15% of submissions)</li>
                        <li>Gas, chemical, and structural hazards are ALWAYS escalated to humans</li>
                        <li>Based on {stats.totalAutomated || 132} decisions to date (need 3,000+ for full confidence)</li>
                        <li>System is in learning mode - prioritizes safety over automation</li>
                    </ul>
                </div>
            </AlertDescription>
        </Alert>
    );
}
```

---

## Phase 1: Ensemble Foundation (Week 1-2) 🏗️

### 1.1 Create 5-Model YOLO Ensemble

**New File**: `apps/web/lib/services/building-surveyor/ensemble/YOLOEnsemble.ts`

```typescript
export class YOLOEnsemble {
    private models: YOLOModel[] = [];

    constructor() {
        // Train 5 variants with different:
        // - Random seeds
        // - Data augmentations
        // - Training subsets (bagging)
        // - Loss function weights
        // - Architecture variations (YOLOv8, YOLOv9, YOLOv11)

        this.models = [
            new YOLOModel({ seed: 42, augmentation: 'standard' }),
            new YOLOModel({ seed: 123, augmentation: 'aggressive' }),
            new YOLOModel({ seed: 456, augmentation: 'color_jitter' }),
            new YOLOModel({ seed: 789, augmentation: 'geometric' }),
            new YOLOModel({ seed: 101, augmentation: 'mixup' })
        ];
    }

    async detectWithUncertainty(images: string[]): Promise<EnsemblePrediction> {
        // Run all models in parallel
        const predictions = await Promise.all(
            this.models.map(model => model.detect(images))
        );

        // Calculate agreement metrics
        const epistemicUncertainty = this.calculateEpistemicUncertainty(predictions);
        const aleatoricUncertainty = this.calculateAleatoricUncertainty(predictions);

        // Aggregate predictions
        const consensus = this.aggregatePredictions(predictions);

        return {
            consensus,
            predictions,
            uncertainties: {
                epistemic: epistemicUncertainty,
                aleatoric: aleatoricUncertainty,
                total: Math.sqrt(epistemicUncertainty**2 + aleatoricUncertainty**2)
            },
            confidence: this.calculateConfidence(predictions),
            disagreementMap: this.getDisagreementDetails(predictions)
        };
    }

    private calculateEpistemicUncertainty(predictions: Prediction[]): number {
        // Variance across model predictions
        const allBoxes = predictions.flatMap(p => p.boxes);
        const avgConfidence = allBoxes.reduce((a, b) => a + b.confidence, 0) / allBoxes.length;

        // Calculate variance in predictions
        const variance = predictions.map(p => {
            const pAvg = p.boxes.reduce((a, b) => a + b.confidence, 0) / p.boxes.length;
            return Math.pow(pAvg - avgConfidence, 2);
        }).reduce((a, b) => a + b, 0) / predictions.length;

        return Math.sqrt(variance);
    }

    private calculateAleatoricUncertainty(predictions: Prediction[]): number {
        // Inherent noise in the data (e.g., image quality)
        const confidences = predictions.flatMap(p => p.boxes.map(b => b.confidence));
        const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;

        // Entropy-based uncertainty
        const entropy = -mean * Math.log2(mean) - (1 - mean) * Math.log2(1 - mean);
        return entropy;
    }
}
```

### 1.2 Training Pipeline for Ensemble

**New File**: `scripts/train-ensemble-models.ts`

```typescript
import { execSync } from 'child_process';
import { uploadToSupabaseStorage } from '@/lib/services/storage';

async function trainEnsembleModels() {
    const configs = [
        { seed: 42, augmentation: 'standard', subset: 'random_80%' },
        { seed: 123, augmentation: 'aggressive', subset: 'random_80%' },
        { seed: 456, augmentation: 'color_jitter', subset: 'bootstrap' },
        { seed: 789, augmentation: 'geometric', subset: 'stratified' },
        { seed: 101, augmentation: 'mixup', subset: 'full' }
    ];

    for (const [index, config] of configs.entries()) {
        console.log(`Training model ${index + 1}/5...`);

        // Create YOLO training config
        const yamlConfig = `
        train: /data/train_${config.subset}
        val: /data/val

        nc: 71  # number of classes
        names: ['crack', 'water_damage', 'mold', ...]

        # Augmentation settings
        augmentation: ${config.augmentation}
        seed: ${config.seed}
        `;

        // Train model
        execSync(`yolo train model=yolov11m.pt data=config.yaml epochs=100`);

        // Upload to storage
        const modelPath = `runs/train/weights/best.pt`;
        await uploadToSupabaseStorage(
            modelPath,
            `ensemble/model_${index + 1}.pt`
        );
    }
}
```

---

## Phase 2: Uncertainty Quantification (Week 2-3) 🎯

### 2.1 Implement Proper Uncertainty Decomposition

**New File**: `apps/web/lib/services/building-surveyor/uncertainty/UncertaintyCalculator.ts`

```typescript
export class UncertaintyCalculator {
    /**
     * Epistemic Uncertainty: Model uncertainty (reducible with more data)
     * High when models disagree
     */
    static calculateEpistemic(predictions: ModelPrediction[]): number {
        // For each detected object, calculate variance across models
        const objectGroups = this.groupPredictionsByIoU(predictions);

        let totalVariance = 0;
        for (const group of objectGroups) {
            // Variance in class predictions
            const classCounts = this.countClasses(group);
            const classEntropy = this.calculateEntropy(classCounts);

            // Variance in confidence scores
            const confidences = group.map(p => p.confidence);
            const confVariance = this.variance(confidences);

            totalVariance += classEntropy * 0.5 + confVariance * 0.5;
        }

        return totalVariance / objectGroups.length;
    }

    /**
     * Aleatoric Uncertainty: Data uncertainty (irreducible noise)
     * High for blurry/dark/ambiguous images
     */
    static calculateAleatoric(
        image: ImageData,
        predictions: ModelPrediction[]
    ): number {
        const factors = {
            // Image quality metrics
            blur: this.calculateBlurScore(image),
            darkness: this.calculateDarknessScore(image),
            occlusion: this.calculateOcclusionScore(predictions),

            // Prediction metrics
            avgConfidence: this.averageConfidence(predictions),
            boundaryUncertainty: this.boundaryUncertainty(predictions)
        };

        // Weighted combination
        return (
            factors.blur * 0.2 +
            factors.darkness * 0.2 +
            factors.occlusion * 0.2 +
            (1 - factors.avgConfidence) * 0.2 +
            factors.boundaryUncertainty * 0.2
        );
    }

    /**
     * Combined uncertainty for decision making
     */
    static calculateTotal(epistemic: number, aleatoric: number): {
        total: number;
        decision: 'automate' | 'escalate' | 'need_better_image';
    } {
        const total = Math.sqrt(epistemic ** 2 + aleatoric ** 2);

        if (aleatoric > 0.7 && epistemic < 0.3) {
            // High data uncertainty, low model uncertainty
            return { total, decision: 'need_better_image' };
        }

        if (epistemic > 0.5) {
            // High model uncertainty
            return { total, decision: 'escalate' };
        }

        if (total < 0.2) {
            // Low overall uncertainty
            return { total, decision: 'automate' };
        }

        return { total, decision: 'escalate' };
    }
}
```

### 2.2 Safety LCB Implementation

**New File**: `apps/web/lib/services/building-surveyor/safety/SafetyLCB.ts`

```typescript
export class SafetyLCB {
    private static readonly SAFETY_MULTIPLIER = 2.0; // Conservative factor

    /**
     * Calculate Lower Confidence Bound for safety
     * We're pessimistic - assume worst case within uncertainty
     */
    static calculateSafetyScore(
        prediction: number,
        epistemic: number,
        aleatoric: number,
        criticalityFactor: number = 1.0
    ): {
        lcb: number;
        safe: boolean;
        explanation: string;
    } {
        // Base uncertainty
        const totalUncertainty = Math.sqrt(epistemic ** 2 + aleatoric ** 2);

        // Adjust for criticality (higher for structural, gas, etc.)
        const adjustedUncertainty = totalUncertainty * criticalityFactor;

        // Lower Confidence Bound (pessimistic)
        const lcb = prediction - (adjustedUncertainty * this.SAFETY_MULTIPLIER);

        // Safety threshold (domain-specific)
        const threshold = this.getSafetyThreshold(criticalityFactor);

        const safe = lcb > threshold;

        const explanation = `
            Prediction: ${(prediction * 100).toFixed(1)}%
            Epistemic Uncertainty: ${(epistemic * 100).toFixed(1)}%
            Aleatoric Uncertainty: ${(aleatoric * 100).toFixed(1)}%
            Safety Multiplier: ${this.SAFETY_MULTIPLIER}x

            LCB = ${(prediction * 100).toFixed(1)}% - ${(adjustedUncertainty * this.SAFETY_MULTIPLIER * 100).toFixed(1)}%
            LCB = ${(lcb * 100).toFixed(1)}%

            Threshold: ${(threshold * 100).toFixed(1)}%
            Decision: ${safe ? 'SAFE TO AUTOMATE' : 'ESCALATE TO HUMAN'}
        `.trim();

        return { lcb, safe, explanation };
    }

    private static getSafetyThreshold(criticalityFactor: number): number {
        // Higher threshold for more critical damage types
        if (criticalityFactor > 2.0) return 0.95; // Structural
        if (criticalityFactor > 1.5) return 0.90; // Water/Mold
        return 0.85; // Cosmetic
    }
}
```

---

## Phase 3: Human-AI Collaboration (Week 3-4) 👥

### 3.1 Two-Phase Review Interface

**New File**: `apps/web/app/expert-review/components/TwoPhaseReview.tsx`

```tsx
export function TwoPhaseReview({ assessmentId }: { assessmentId: string }) {
    const [phase, setPhase] = useState<'image' | 'comparison' | 'complete'>('image');
    const [expertAssessment, setExpertAssessment] = useState<ExpertInput | null>(null);
    const [aiAssessment, setAiAssessment] = useState<AIAssessment | null>(null);

    // PHASE 1: Show only image
    if (phase === 'image') {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Expert Assessment Required</CardTitle>
                        <CardDescription>
                            Please analyze this image without AI assistance
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <img
                            src={assessment.imageUrl}
                            className="w-full rounded-lg"
                            alt="Damage assessment"
                        />

                        <form onSubmit={handleExpertSubmit} className="mt-6 space-y-4">
                            <div>
                                <Label>Damage Type</Label>
                                <Select name="damageType" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select damage type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="crack">Crack</SelectItem>
                                        <SelectItem value="water_damage">Water Damage</SelectItem>
                                        <SelectItem value="structural">Structural</SelectItem>
                                        {/* ... more options */}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Severity</Label>
                                <RadioGroup name="severity" required>
                                    <div className="flex space-x-4">
                                        <Label className="flex items-center">
                                            <RadioGroupItem value="low" />
                                            <span className="ml-2">Low</span>
                                        </Label>
                                        <Label className="flex items-center">
                                            <RadioGroupItem value="medium" />
                                            <span className="ml-2">Medium</span>
                                        </Label>
                                        <Label className="flex items-center">
                                            <RadioGroupItem value="high" />
                                            <span className="ml-2">High</span>
                                        </Label>
                                        <Label className="flex items-center">
                                            <RadioGroupItem value="critical" />
                                            <span className="ml-2">Critical</span>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div>
                                <Label>Confidence in Assessment</Label>
                                <Slider
                                    name="confidence"
                                    min={0}
                                    max={100}
                                    step={5}
                                    defaultValue={[75]}
                                />
                            </div>

                            <div>
                                <Label>Notes</Label>
                                <Textarea
                                    name="notes"
                                    placeholder="Any additional observations..."
                                    rows={4}
                                />
                            </div>

                            <Button type="submit" className="w-full">
                                Submit Expert Assessment
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // PHASE 2: Show AI comparison
    if (phase === 'comparison') {
        const agreement = calculateAgreement(expertAssessment!, aiAssessment!);

        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Assessment Comparison</CardTitle>
                        <CardDescription>
                            Compare your assessment with AI analysis
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-6">
                            {/* Expert Assessment */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-green-600">
                                    Your Assessment
                                </h3>
                                <dl className="space-y-2 text-sm">
                                    <div>
                                        <dt className="font-medium">Type:</dt>
                                        <dd>{expertAssessment!.damageType}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium">Severity:</dt>
                                        <dd>{expertAssessment!.severity}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium">Confidence:</dt>
                                        <dd>{expertAssessment!.confidence}%</dd>
                                    </div>
                                </dl>
                            </div>

                            {/* AI Assessment */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-blue-600">
                                    AI Assessment
                                </h3>
                                <dl className="space-y-2 text-sm">
                                    <div>
                                        <dt className="font-medium">Type:</dt>
                                        <dd>{aiAssessment!.damageType}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium">Severity:</dt>
                                        <dd>{aiAssessment!.severity}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium">Confidence:</dt>
                                        <dd>{aiAssessment!.confidence}%</dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium">Uncertainty:</dt>
                                        <dd>
                                            Epistemic: {aiAssessment!.epistemic}%<br/>
                                            Aleatoric: {aiAssessment!.aleatoric}%
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </div>

                        {/* Agreement Analysis */}
                        <Alert className={`mt-6 ${
                            agreement > 80 ? 'bg-green-50' :
                            agreement > 50 ? 'bg-yellow-50' :
                            'bg-red-50'
                        }`}>
                            <AlertTitle>
                                Agreement Level: {agreement}%
                            </AlertTitle>
                            <AlertDescription>
                                {agreement > 80 ?
                                    'High agreement - AI learning reinforced' :
                                    agreement > 50 ?
                                    'Partial agreement - Case flagged for review' :
                                    'Disagreement - Priority training case created'
                                }
                            </AlertDescription>
                        </Alert>

                        <div className="mt-6 space-y-4">
                            <div>
                                <Label>Do you agree with the AI assessment?</Label>
                                <RadioGroup name="agreement">
                                    <Label className="flex items-center">
                                        <RadioGroupItem value="agree" />
                                        <span className="ml-2">Yes, correct assessment</span>
                                    </Label>
                                    <Label className="flex items-center">
                                        <RadioGroupItem value="partial" />
                                        <span className="ml-2">Partially correct</span>
                                    </Label>
                                    <Label className="flex items-center">
                                        <RadioGroupItem value="disagree" />
                                        <span className="ml-2">No, incorrect assessment</span>
                                    </Label>
                                </RadioGroup>
                            </div>

                            {/* Feedback for AI improvement */}
                            <div>
                                <Label>Feedback for AI Improvement</Label>
                                <Textarea
                                    placeholder="What did the AI miss or get wrong?"
                                    rows={3}
                                />
                            </div>

                            <Button onClick={handleComplete} className="w-full">
                                Complete Review
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
}
```

### 3.2 Active Learning Queue

**New File**: `apps/web/lib/services/building-surveyor/learning/ActiveLearningQueue.ts`

```typescript
export class ActiveLearningQueue {
    /**
     * Prioritize cases for human annotation to maximize learning
     */
    static async prioritizeCases(
        cases: AssessmentCase[]
    ): Promise<PrioritizedCase[]> {
        const prioritized = cases.map(c => ({
            ...c,
            priority: this.calculatePriority(c)
        }));

        return prioritized.sort((a, b) => b.priority - a.priority);
    }

    private static calculatePriority(case: AssessmentCase): number {
        let priority = 0;

        // Priority 1: Disagreement between human and AI
        if (case.hasDisagreement) {
            priority += 100;
        }

        // Priority 2: High uncertainty cases
        const uncertainty = Math.sqrt(
            case.epistemicUncertainty ** 2 +
            case.aleatoricUncertainty ** 2
        );
        if (uncertainty > 0.7) {
            priority += 80;
        } else if (uncertainty > 0.5) {
            priority += 60;
        }

        // Priority 3: Near decision boundary
        const distanceToThreshold = Math.abs(case.confidence - 0.85);
        if (distanceToThreshold < 0.1) {
            priority += 70;
        }

        // Priority 4: Rare damage types
        const rareTypes = ['gas_leak', 'structural', 'foundation', 'asbestos'];
        if (rareTypes.includes(case.damageType)) {
            priority += 90;
        }

        // Priority 5: Diverse cases (different regions/seasons)
        if (case.isFromNewRegion || case.isFromNewSeason) {
            priority += 40;
        }

        // Priority 6: Critical safety cases
        if (case.hasSafetyImplications) {
            priority += 95;
        }

        // Deprioritize: Cases AI got right with high confidence
        if (case.aiCorrect && case.confidence > 0.95) {
            priority -= 50;
        }

        return priority;
    }

    /**
     * Get next batch of cases for annotation
     */
    static async getNextBatch(
        batchSize: number = 20
    ): Promise<AnnotationBatch> {
        const allCases = await this.getUnannotatedCases();
        const prioritized = await this.prioritizeCases(allCases);

        // Ensure diversity in batch
        const batch = this.ensureDiversity(prioritized.slice(0, batchSize * 2))
            .slice(0, batchSize);

        return {
            cases: batch,
            estimatedValue: this.estimateLearningValue(batch),
            expectedTimeMinutes: batch.length * 2
        };
    }

    private static ensureDiversity(cases: PrioritizedCase[]): PrioritizedCase[] {
        const selected: PrioritizedCase[] = [];
        const seenTypes = new Set<string>();
        const seenRegions = new Set<string>();

        for (const c of cases) {
            // Ensure we get different damage types and regions
            if (!seenTypes.has(c.damageType) || !seenRegions.has(c.region)) {
                selected.push(c);
                seenTypes.add(c.damageType);
                seenRegions.add(c.region);
            }
        }

        // Fill remaining with highest priority
        const remaining = cases.filter(c => !selected.includes(c));
        selected.push(...remaining.slice(0, 20 - selected.length));

        return selected;
    }
}
```

---

## Phase 4: Adaptive Conformal Prediction (Week 4-5) 📊

### 4.1 Coverage Monitoring

**New File**: `apps/web/lib/services/building-surveyor/calibration/AdaptiveConformalPrediction.ts`

```typescript
export class AdaptiveConformalPrediction {
    private static calibrationSets: Map<string, CalibrationSet> = new Map();
    private static coverageHistory: CoverageHistory[] = [];

    /**
     * Monitor and adapt coverage to maintain guarantees
     */
    static async monitorCoverage(): Promise<CoverageReport> {
        const recentPredictions = await this.getRecentPredictions(7); // Last week
        const actualOutcomes = await this.getActualOutcomes(recentPredictions);

        // Calculate empirical coverage
        const coverage = this.calculateCoverage(recentPredictions, actualOutcomes);

        // Check if we're meeting target
        const target = 0.90; // 90% coverage target
        const deviation = coverage.empirical - target;

        // Alert if coverage drops
        if (Math.abs(deviation) > 0.05) {
            await this.alertCoverageViolation(coverage, target);
            await this.adjustThresholds(deviation);
        }

        // Store history
        this.coverageHistory.push({
            timestamp: new Date(),
            coverage: coverage.empirical,
            target,
            sampleSize: recentPredictions.length,
            adjusted: Math.abs(deviation) > 0.05
        });

        return {
            currentCoverage: coverage.empirical,
            target,
            status: Math.abs(deviation) <= 0.05 ? 'healthy' : 'adjusting',
            recentAdjustment: Math.abs(deviation) > 0.05,
            history: this.coverageHistory.slice(-30) // Last 30 days
        };
    }

    /**
     * Adjust decision thresholds based on coverage
     */
    private static async adjustThresholds(deviation: number): Promise<void> {
        // If under-covering (too many errors), become more conservative
        if (deviation < -0.05) {
            const adjustment = Math.abs(deviation) * 2; // Aggressive adjustment

            await this.updateThresholds({
                confidence: currentThreshold => currentThreshold + adjustment,
                uncertainty: currentThreshold => currentThreshold - adjustment
            });

            logger.warn('Coverage below target - increasing conservatism', {
                deviation,
                adjustment
            });
        }

        // If over-covering (too conservative), can relax slightly
        if (deviation > 0.10) {
            const adjustment = deviation * 0.5; // Gentle relaxation

            await this.updateThresholds({
                confidence: currentThreshold => currentThreshold - adjustment,
                uncertainty: currentThreshold => currentThreshold + adjustment
            });

            logger.info('Coverage above target - relaxing thresholds', {
                deviation,
                adjustment
            });
        }
    }

    /**
     * Calculate prediction sets with coverage guarantee
     */
    static calculatePredictionSet(
        prediction: Prediction,
        stratum: string
    ): PredictionSet {
        const calibrationSet = this.calibrationSets.get(stratum) ||
                               this.calibrationSets.get('global')!;

        // Get nonconformity scores from calibration set
        const scores = calibrationSet.nonconformityScores;

        // Calculate quantile for coverage
        const alpha = 0.10; // For 90% coverage
        const quantileIndex = Math.ceil((1 - alpha) * (scores.length + 1)) - 1;
        const threshold = scores.sort((a, b) => a - b)[quantileIndex];

        // Build prediction set
        const predictionSet: string[] = [];
        for (const [damageType, confidence] of Object.entries(prediction.classScores)) {
            const nonconformity = 1 - confidence;
            if (nonconformity <= threshold) {
                predictionSet.push(damageType);
            }
        }

        return {
            set: predictionSet,
            threshold,
            coverage: 1 - alpha,
            stratum,
            calibrationSize: scores.length
        };
    }
}
```

### 4.2 Drift Detection & Adaptation

**New File**: `apps/web/lib/services/building-surveyor/monitoring/DriftMonitor.ts`

```typescript
export class DriftMonitor {
    private static readonly DRIFT_THRESHOLD = 0.15;

    /**
     * Detect distribution drift and trigger retraining if needed
     */
    static async detectDrift(): Promise<DriftReport> {
        const baseline = await this.getBaselineDistribution();
        const current = await this.getCurrentDistribution();

        // Multiple drift detection methods
        const drifts = {
            kl: this.calculateKLDivergence(baseline, current),
            wasserstein: this.calculateWasserstein(baseline, current),
            mmd: this.calculateMMD(baseline, current),
            feature: this.calculateFeatureDrift(baseline, current)
        };

        // Check for seasonal patterns
        const seasonalDrift = await this.detectSeasonalDrift();

        // Aggregate drift score
        const aggregateDrift = (
            drifts.kl * 0.25 +
            drifts.wasserstein * 0.25 +
            drifts.mmd * 0.25 +
            drifts.feature * 0.25
        );

        const hasDrift = aggregateDrift > this.DRIFT_THRESHOLD;

        if (hasDrift) {
            await this.triggerAdaptation({
                driftScore: aggregateDrift,
                driftTypes: drifts,
                seasonal: seasonalDrift
            });
        }

        return {
            hasDrift,
            score: aggregateDrift,
            components: drifts,
            seasonal: seasonalDrift,
            recommendation: hasDrift ?
                'Retrain models with recent data' :
                'No significant drift detected'
        };
    }

    private static async triggerAdaptation(drift: DriftInfo): Promise<void> {
        // 1. Increase uncertainty estimates
        await UncertaintyCalculator.adjustForDrift(drift.score);

        // 2. Become more conservative
        await SafetyLCB.increaseConservatism(drift.score);

        // 3. Trigger retraining
        if (drift.score > 0.25) {
            await this.scheduleRetraining();
        }

        // 4. Alert team
        await this.alertTeam(drift);
    }
}
```

---

## Phase 5: Production Monitoring (Week 5-6) 📈

### 5.1 Honest Metrics Dashboard

**New File**: `apps/web/app/admin/building-surveyor/page.tsx`

```tsx
export default function BuildingSurveyorDashboard() {
    const metrics = useBuilderSurveyorMetrics();

    return (
        <div className="space-y-6">
            {/* Honest Statistics */}
            <Card>
                <CardHeader>
                    <CardTitle>System Performance - Honest Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                        <Stat
                            label="Total Assessments"
                            value={metrics.totalAssessments}
                            subtext="All time"
                        />
                        <Stat
                            label="Automated Decisions"
                            value={metrics.automatedDecisions}
                            subtext={`${metrics.automationRate}% automation rate`}
                            warning={metrics.automatedDecisions < 1000}
                        />
                        <Stat
                            label="Sample Size Gap"
                            value={`${metrics.sampleGap}×`}
                            subtext="Need 3,000 for claims"
                            error={true}
                        />
                        <Stat
                            label="True 95% CI for FNR"
                            value="[0%, 2.8%]"
                            subtext="NOT [0%, 0.35%]"
                            warning={true}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Performance by Category</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {metrics.categories.map(cat => (
                            <CategoryRow
                                key={cat.name}
                                name={cat.name}
                                automated={cat.automated}
                                total={cat.total}
                                rate={cat.rate}
                                status={cat.status}
                            />
                        ))}
                    </div>

                    <Alert className="mt-4 border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertTitle>Critical Failures</AlertTitle>
                        <AlertDescription>
                            Gas/Chemical: 0/43 automated (Complete failure)<br/>
                            Foundation: Below 90% coverage target
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Uncertainty Distribution */}
            <Card>
                <CardHeader>
                    <CardTitle>Uncertainty Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                    <UncertaintyChart
                        epistemic={metrics.uncertaintyDist.epistemic}
                        aleatoric={metrics.uncertaintyDist.aleatoric}
                    />
                </CardContent>
            </Card>

            {/* Coverage Monitoring */}
            <Card>
                <CardHeader>
                    <CardTitle>Coverage Monitoring</CardTitle>
                </CardHeader>
                <CardContent>
                    <CoverageChart
                        target={0.90}
                        actual={metrics.coverage.empirical}
                        history={metrics.coverage.history}
                    />
                    {metrics.coverage.empirical < 0.85 && (
                        <Alert className="mt-4 border-orange-200 bg-orange-50">
                            <AlertDescription>
                                Coverage below target - system automatically increasing conservatism
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
```

### 5.2 API Monitoring Endpoints

**New File**: `apps/web/app/api/building-surveyor/metrics/route.ts`

```typescript
export async function GET() {
    const [
        performance,
        uncertainty,
        coverage,
        drift,
        learningQueue
    ] = await Promise.all([
        getPerformanceMetrics(),
        getUncertaintyDistribution(),
        AdaptiveConformalPrediction.monitorCoverage(),
        DriftMonitor.detectDrift(),
        ActiveLearningQueue.getQueueStatus()
    ]);

    // Calculate honest statistics
    const stats = {
        totalAssessments: performance.total,
        automatedDecisions: performance.automated,
        automationRate: (performance.automated / performance.total * 100).toFixed(1),

        // Statistical reality
        requiredSampleSize: 3000,
        currentSampleSize: performance.automated,
        sampleSizeGap: Math.round(3000 / performance.automated),

        // True confidence intervals
        observedFNR: 0,
        true95CI: {
            lower: 0,
            upper: calculateWilsonUpper(0, performance.automated)
        },

        // Category failures
        completeFailures: {
            gasChemical: { automated: 0, total: 43, rate: '0%' },
            foundation: { coverage: '88.1%', target: '90%', failing: true }
        },

        // System health
        coverage: {
            target: 90,
            empirical: coverage.currentCoverage * 100,
            status: coverage.status,
            recentAdjustment: coverage.recentAdjustment
        },

        drift: {
            detected: drift.hasDrift,
            score: drift.score,
            recommendation: drift.recommendation
        },

        learningPriorities: {
            queueSize: learningQueue.size,
            topPriority: learningQueue.topPriorities
        }
    };

    return Response.json(stats);
}
```

---

## Phase 6: Testing & Validation (Week 6-7) 🧪

### 6.1 Ensemble Testing

```typescript
// __tests__/ensemble/YOLOEnsemble.test.ts
describe('YOLO Ensemble', () => {
    it('should detect epistemic uncertainty when models disagree', async () => {
        const mockPredictions = [
            { class: 'crack', confidence: 0.9 },
            { class: 'crack', confidence: 0.85 },
            { class: 'water_damage', confidence: 0.8 },
            { class: 'crack', confidence: 0.88 },
            { class: 'settlement', confidence: 0.7 }
        ];

        const uncertainty = calculateEpistemicUncertainty(mockPredictions);
        expect(uncertainty).toBeGreaterThan(0.3); // High disagreement
    });

    it('should have low uncertainty when models agree', async () => {
        const mockPredictions = Array(5).fill({ class: 'crack', confidence: 0.92 });
        const uncertainty = calculateEpistemicUncertainty(mockPredictions);
        expect(uncertainty).toBeLessThan(0.1); // Low disagreement
    });
});
```

### 6.2 Safety Testing

```typescript
// __tests__/safety/SafetyGates.test.ts
describe('Safety Gates', () => {
    it('should ALWAYS escalate critical hazards', async () => {
        const criticalCases = [
            'gas_leak',
            'structural_collapse',
            'asbestos',
            'foundation_crack'
        ];

        for (const hazard of criticalCases) {
            const decision = await assessWithSafetyGates({
                detections: [{ class: hazard, confidence: 1.0 }]
            });

            expect(decision).toBe('escalate');
            expect(decision.reason).toContain('Critical hazard');
        }
    });

    it('should use LCB (pessimistic) not UCB', () => {
        const lcb = SafetyLCB.calculateSafetyScore(0.8, 0.1, 0.1);
        expect(lcb.lcb).toBeLessThan(0.8); // Lower than prediction

        // Old system would use UCB (wrong)
        const ucb = 0.8 + (0.1 * 2); // Would be 1.0
        expect(ucb).toBeGreaterThan(0.8); // Higher than prediction (optimistic)
    });
});
```

---

## Phase 7: Rollout Strategy (Week 7-8) 🚀

### 7.1 Staged Rollout Plan

```typescript
const rolloutStages = [
    {
        week: 1,
        percentage: 5,
        criteria: 'Internal testing only',
        rollback: 'Immediate if any critical hazard missed'
    },
    {
        week: 2,
        percentage: 10,
        criteria: 'Beta customers with consent',
        rollback: 'If FNR > 1% or coverage < 85%'
    },
    {
        week: 3,
        percentage: 25,
        criteria: 'Expanded beta',
        rollback: 'If automation rate < 20%'
    },
    {
        week: 4,
        percentage: 50,
        criteria: 'Half of traffic',
        rollback: 'If any safety incidents'
    },
    {
        week: 5,
        percentage: 100,
        criteria: 'Full rollout',
        rollback: 'Keep 10% on old system as control'
    }
];
```

### 7.2 Success Metrics

```typescript
const successCriteria = {
    safety: {
        maxFNR: 0.01, // 1% max false negative rate
        criticalHazardMissed: 0, // Zero tolerance
        coverageTarget: 0.90 // 90% coverage
    },
    performance: {
        minAutomationRate: 0.25, // 25% minimum
        maxLatency: 200, // 200ms max
        minAgreementRate: 0.80 // 80% human-AI agreement
    },
    learning: {
        weeklyAnnotations: 100, // Active learning targets
        modelImprovement: 0.02, // 2% improvement per cycle
        driftDetection: true // Must detect known drifts
    }
};
```

---

## 📊 Budget & Resources

### Engineering Costs
- 1 ML Engineer × 8 weeks @ $200/hr = $64,000
- 1 Backend Engineer × 6 weeks @ $150/hr = $36,000
- 1 Frontend Engineer × 4 weeks @ $150/hr = $24,000
- **Total Engineering**: $124,000

### Infrastructure
- GPU compute for training: $5,000
- Storage & API costs: $2,000/month
- Monitoring tools: $500/month

### Data Collection
- Expert annotations (1000 cases): $10,000
- Diverse data acquisition: $5,000

### Total Project Cost: ~$150,000

---

## 🎯 Final Outcome

After 8 weeks, you'll have:

1. ✅ **Safe System**: Proper LCB, hard safety gates, verified shields
2. ✅ **Honest Metrics**: True confidence intervals, transparent limitations
3. ✅ **Effective Learning**: Active learning, disagreement prioritization
4. ✅ **Robust Uncertainty**: 5-model ensemble with proper decomposition
5. ✅ **Human-Centered**: Image-first review, prevents anchoring bias
6. ✅ **Adaptive**: Automatic threshold adjustment, drift detection

**Expected Performance**:
- 25-30% automation rate (vs current 15.5%)
- <1% FNR with proper confidence intervals
- 90% coverage maintained
- 80%+ human-AI agreement
- 150ms average latency

The system will finally **know when it doesn't know** and make safe, transparent decisions.