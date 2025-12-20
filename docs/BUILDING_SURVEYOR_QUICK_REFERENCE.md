# Building Surveyor Service - Quick Reference

## New Component Structure

```
building-surveyor/
├── config/
│   └── BuildingSurveyorConfig.ts      # All configuration
├── utils/
│   └── FeatureExtractionUtils.ts      # Shared feature extraction
├── orchestration/
│   ├── AssessmentOrchestrator.ts      # Main orchestration
│   ├── FeatureExtractionService.ts    # Feature extraction facade
│   └── PromptBuilder.ts               # Prompt construction
└── index.ts                            # Public API
```

## Quick Start

### Basic Assessment

```typescript
import { BuildingSurveyorService } from '@/lib/services/building-surveyor';

const assessment = await BuildingSurveyorService.assessDamage(
  ['https://example.com/damage.jpg'],
  {
    propertyType: 'residential',
    location: 'London',
    ageOfProperty: 50,
  }
);
```

### Configuration

```typescript
import { getConfig } from '@/lib/services/building-surveyor/config/BuildingSurveyorConfig';

const config = getConfig();
console.log(config.detectorTimeoutMs); // 7000
console.log(config.useLearnedFeatures); // true/false
```

### Feature Extraction

```typescript
import { FeatureExtractionService } from '@/lib/services/building-surveyor/orchestration/FeatureExtractionService';

// Automatic (learned or handcrafted with fallback)
const features = await FeatureExtractionService.extractFeatures(
  imageUrls,
  context,
  assessment,
  roboflowDetections,
  visionSummary
);

// Explicit handcrafted
const handcrafted = await FeatureExtractionService.extractHandcraftedFeatures(
  imageUrls,
  context,
  assessment,
  roboflowDetections,
  visionSummary
);
```

### Custom Prompts

```typescript
import { PromptBuilder } from '@/lib/services/building-surveyor/orchestration/PromptBuilder';

const messages = PromptBuilder.buildMessages(
  imageUrls,
  context,
  roboflowDetections,
  visionAnalysis
);
```

## Environment Variables

All environment variables are now centralized in `BuildingSurveyorConfig.ts`:

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | - | OpenAI API key (required) |
| `BUILDING_SURVEYOR_DETECTOR_TIMEOUT_MS` | 7000 | Roboflow timeout |
| `BUILDING_SURVEYOR_VISION_TIMEOUT_MS` | 9000 | Vision API timeout |
| `BUILDING_SURVEYOR_IMAGE_BASE_AREA` | 786432 | Base image area for normalization |
| `USE_LEARNED_FEATURES` | false | Enable learned feature extraction |
| `USE_TITANS` | false | Enable Titans self-modification |
| `AB_TEST_SFN_RATE_THRESHOLD` | 0.1 | A/B test SFN rate threshold |
| `AB_TEST_COVERAGE_VIOLATION_THRESHOLD` | 5.0 | Coverage violation threshold |
| `AB_TEST_AUTOMATION_SPIKE_THRESHOLD` | 20.0 | Automation spike threshold |
| `AB_TEST_CRITIC_OBSERVATIONS_THRESHOLD` | 100 | Critic observations threshold |
| `AB_TEST_CALIBRATION_DATA_THRESHOLD` | 100 | Calibration data threshold |
| `BUILDING_SURVEYOR_AUTO_VALIDATION_ENABLED` | false | Auto-validation enabled |
| `YOLO_DATA_YAML_PATH` | - | YOLO data YAML path |

## Component Responsibilities

### AssessmentOrchestrator
- Orchestrates complete assessment pipeline
- Manages detector services
- Coordinates memory systems
- Handles GPT-4 Vision API calls
- Builds final assessments

### FeatureExtractionService
- Manages learned vs handcrafted features
- Automatic fallback mechanism
- Initialization and state management
- Feedback loop for learning

### PromptBuilder
- Constructs system prompts
- Builds evidence summaries
- Creates user prompts with context
- Assembles message arrays

### BuildingSurveyorConfig
- Centralized configuration
- Type-safe access
- Validation on load
- Singleton pattern

## Testing

### Unit Tests

```typescript
import { extractHandcraftedFeatures } from '@/lib/services/building-surveyor/utils/FeatureExtractionUtils';

describe('Feature Extraction', () => {
  it('should extract 40 features', async () => {
    const features = await extractHandcraftedFeatures(
      imageUrls,
      context,
      undefined,
      roboflowDetections,
      visionSummary
    );
    
    expect(features).toHaveLength(40);
    expect(features.every(f => f >= 0 && f <= 1)).toBe(true);
  });
});
```

### Integration Tests

```typescript
import { BuildingSurveyorService } from '@/lib/services/building-surveyor';

describe('BuildingSurveyorService', () => {
  it('should assess damage', async () => {
    const assessment = await BuildingSurveyorService.assessDamage(
      imageUrls,
      context
    );
    
    expect(assessment.damageAssessment).toBeDefined();
    expect(assessment.urgency.urgency).toMatch(/immediate|urgent|soon|planned|monitor/);
  });
});
```

## Migration Checklist

- [ ] Update imports to use new entry point
- [ ] Replace direct `process.env` access with `getConfig()`
- [ ] Update tests to use new component structure
- [ ] Verify A/B tests use shared feature extraction
- [ ] Update documentation references
- [ ] Monitor metrics after deployment

## Common Patterns

### Adding a New Configuration Value

1. Add to `BuildingSurveyorConfig` interface
2. Add to `loadBuildingSurveyorConfig()` function
3. Add validation in `validateConfig()` if needed
4. Document in this file

### Adding a New Feature Extraction Method

1. Add to `FeatureExtractionUtils.ts` or create new utility
2. Export from `FeatureExtractionService` if needed
3. Add tests
4. Update documentation

### Modifying Prompts

1. Edit `PromptBuilder.ts`
2. Test with sample assessments
3. Monitor accuracy metrics
4. Document changes

## Troubleshooting

### Configuration Errors

```typescript
import { validateConfig, getConfig } from '@/lib/services/building-surveyor/config/BuildingSurveyorConfig';

try {
  const config = getConfig();
  validateConfig(config);
} catch (error) {
  console.error('Configuration error:', error.message);
}
```

### Feature Extraction Issues

```typescript
import { FeatureExtractionService } from '@/lib/services/building-surveyor/orchestration/FeatureExtractionService';

// Check if learned features are available
if (FeatureExtractionService.isLearnedFeaturesAvailable()) {
  console.log('Learned features enabled');
} else {
  console.log('Using handcrafted features');
}
```

### Assessment Failures

Check logs for:
- API key configuration
- Image URL validation
- Detector timeouts
- Memory system errors
- GPT-4 Vision API errors

## Best Practices

1. **Always use `getConfig()`** instead of direct `process.env` access
2. **Use `FeatureExtractionService`** for feature extraction (don't call utils directly)
3. **Test components in isolation** before integration testing
4. **Monitor A/B test metrics** after changes to feature extraction
5. **Document configuration changes** in this file
6. **Use TypeScript types** for all function parameters
7. **Handle errors gracefully** with appropriate fallbacks

## Resources

- [Full Refactoring Summary](./CODE_QUALITY_REFACTORING_SUMMARY.md)
- [Building Surveyor AI Training Guide](../BUILDING_SURVEYOR_AI_TRAINING_GUIDE.md)
- [API Documentation](../API_DOCUMENTATION.md)
