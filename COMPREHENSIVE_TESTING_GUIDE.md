# 🧪 Comprehensive Testing Guide - Advanced Features Review

## Overview

This document provides comprehensive testing guidance for the 5 advanced features implemented in the Mintenance platform, including Playwright browser testing strategies, integration testing, and manual testing procedures.

---

## 🔬 Testing Infrastructure

### Playwright Browser Testing Setup

#### Prerequisites
```bash
# Install Playwright (already installed in project)
npm install @playwright/test

# Install browsers (requires admin privileges)
npx playwright install chrome
npx playwright install firefox
npx playwright install webkit
```

#### Web Server Configuration
```bash
# Start web development server
npx expo start --web --port 3002

# Alternative: Static build testing
npx expo export:web
npx serve web-build -p 3002
```

#### Browser Testing Environment
- **Web URL:** http://localhost:3002
- **Mobile Simulation:** Chrome DevTools Device Toolbar
- **Cross-browser:** Chrome, Firefox, Safari (WebKit)
- **Responsive Testing:** Mobile (375px), Tablet (768px), Desktop (1200px)

---

## 🚀 Feature Testing Matrix

### 1. Advanced ML Framework Testing

#### **Service File:** `src/services/ml-engine/AdvancedMLFramework.ts`

#### **Unit Tests**
```typescript
// Create: src/__tests__/services/AdvancedMLFramework.test.ts

describe('AdvancedMLFramework', () => {
  test('should deploy ML model successfully', async () => {
    const framework = new AdvancedMLFramework();
    const result = await framework.deployModel('test-model', {
      environment: 'staging',
      trafficPercentage: 10
    });
    expect(result.success).toBe(true);
  });

  test('should create A/B test configuration', async () => {
    const framework = new AdvancedMLFramework();
    const testId = framework.createABTest({
      name: 'Contractor Matching Test',
      variants: [
        { id: 'control', allocation: 50 },
        { id: 'ml_enhanced', allocation: 50 }
      ]
    });
    expect(testId).toBeDefined();
  });

  test('should generate accurate predictions', async () => {
    const framework = new AdvancedMLFramework();
    const prediction = await framework.predict('contractor_matching_v2', [
      { name: 'skills_match', type: 'numerical', value: 0.85 },
      { name: 'location_distance', type: 'numerical', value: 2.5 }
    ]);
    expect(prediction.confidence).toBeGreaterThan(0.5);
  });
});
```

#### **Integration Tests**
```typescript
// Test ML integration with job recommendation system
describe('ML Integration Tests', () => {
  test('should recommend contractors using ML', async () => {
    const jobData = { skills: ['plumbing'], location: { lat: 40.7128, lng: -74.0060 } };
    const recommendations = await MLJobRecommendationService.getRecommendations(jobData);
    expect(recommendations).toHaveLength(5);
    expect(recommendations[0].confidence).toBeGreaterThan(0.7);
  });
});
```

#### **Playwright Browser Tests**
```typescript
// Create: e2e/ml-features.spec.ts

test.describe('ML Features - Browser Testing', () => {
  test('should display ML-powered job recommendations', async ({ page }) => {
    await page.goto('http://localhost:3002');
    await page.click('[data-testid="find-contractors"]');

    // Wait for ML recommendations to load
    await page.waitForSelector('[data-testid="ml-recommendations"]');

    const recommendations = await page.locator('[data-testid="contractor-card"]').count();
    expect(recommendations).toBeGreaterThan(0);

    // Check confidence scores are displayed
    const confidenceScore = await page.locator('[data-testid="confidence-score"]').first().textContent();
    expect(parseFloat(confidenceScore)).toBeGreaterThan(0.5);
  });

  test('should handle A/B test variants correctly', async ({ page }) => {
    await page.goto('http://localhost:3002');

    // Check which A/B test variant is loaded
    const variant = await page.evaluate(() => window.abTestVariant);
    expect(['control', 'ml_enhanced']).toContain(variant);

    // Verify different UI based on variant
    if (variant === 'ml_enhanced') {
      await expect(page.locator('[data-testid="ml-insights-panel"]')).toBeVisible();
    }
  });
});
```

#### **Performance Tests**
```typescript
test('ML framework performance benchmarks', async ({ page }) => {
  await page.goto('http://localhost:3002');

  const startTime = Date.now();
  await page.click('[data-testid="get-recommendations"]');
  await page.waitForSelector('[data-testid="recommendations-loaded"]');
  const endTime = Date.now();

  const responseTime = endTime - startTime;
  expect(responseTime).toBeLessThan(2000); // Under 2 seconds
});
```

---

### 2. Video Calling Service Testing

#### **Service File:** `src/services/VideoCallService.ts`

#### **WebRTC Testing**
```typescript
// Create: src/__tests__/services/VideoCallService.test.ts

describe('VideoCallService', () => {
  test('should initialize video call session', async () => {
    const callId = await VideoCallService.scheduleCall({
      jobId: 'test-job',
      participants: ['user1', 'user2'],
      scheduledTime: new Date().toISOString()
    });
    expect(callId).toBeDefined();
  });

  test('should handle WebRTC connection', async () => {
    const session = await VideoCallService.initializeCall('test-call-id');
    expect(session.iceServers).toBeDefined();
    expect(session.mediaConstraints).toEqual({
      audio: true,
      video: true
    });
  });
});
```

#### **Playwright Video Call Tests**
```typescript
// e2e/video-calls.spec.ts

test.describe('Video Calling Features', () => {
  test('should start video call interface', async ({ page, context }) => {
    // Grant camera/microphone permissions
    await context.grantPermissions(['camera', 'microphone']);

    await page.goto('http://localhost:3002/job/123');
    await page.click('[data-testid="start-video-call"]');

    // Check video call interface loads
    await expect(page.locator('[data-testid="video-call-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="local-video"]')).toBeVisible();
    await expect(page.locator('[data-testid="call-controls"]')).toBeVisible();
  });

  test('should enable screen sharing', async ({ page, context }) => {
    await context.grantPermissions(['camera', 'microphone']);

    await page.goto('http://localhost:3002/video-call/active');
    await page.click('[data-testid="screen-share-button"]');

    // Mock screen share permission
    await page.evaluate(() => {
      navigator.mediaDevices.getDisplayMedia = () =>
        Promise.resolve(new MediaStream());
    });

    await expect(page.locator('[data-testid="screen-share-active"]')).toBeVisible();
  });

  test('should record call when enabled', async ({ page }) => {
    await page.goto('http://localhost:3002/video-call/active');

    await page.check('[data-testid="enable-recording"]');
    await page.click('[data-testid="start-call"]');

    await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();

    // End call and check recording
    await page.click('[data-testid="end-call"]');
    await expect(page.locator('[data-testid="recording-saved"]')).toBeVisible();
  });
});
```

#### **Cross-Platform Testing**
```typescript
test.describe('Cross-Platform Video Calls', () => {
  ['mobile', 'tablet', 'desktop'].forEach(device => {
    test(`should work on ${device}`, async ({ page, context }) => {
      if (device === 'mobile') {
        await page.setViewportSize({ width: 375, height: 667 });
      } else if (device === 'tablet') {
        await page.setViewportSize({ width: 768, height: 1024 });
      } else {
        await page.setViewportSize({ width: 1200, height: 800 });
      }

      await context.grantPermissions(['camera', 'microphone']);
      await page.goto('http://localhost:3002/video-call');

      await expect(page.locator('[data-testid="video-interface"]')).toBeVisible();

      // Check responsive layout
      const controlsPosition = await page.locator('[data-testid="call-controls"]').boundingBox();
      expect(controlsPosition.y).toBeGreaterThan(0);
    });
  });
});
```

---

### 3. AR/VR Visualization Testing

#### **Service File:** `src/services/ARVRVisualizationService.ts`

#### **AR Capabilities Testing**
```typescript
// src/__tests__/services/ARVRVisualizationService.test.ts

describe('ARVRVisualizationService', () => {
  test('should create AR job visualization', async () => {
    const service = new ARVRVisualizationService();
    const visualizationId = await service.createARJobVisualization(
      'job-123',
      'Kitchen Renovation',
      'room_design'
    );
    expect(visualizationId).toBeDefined();
  });

  test('should add 3D models to AR scene', async () => {
    const service = new ARVRVisualizationService();
    const modelId = await service.addModelToVisualization(
      'viz-123',
      'kitchen-cabinet-model',
      { x: 0, y: 0, z: 0 }
    );
    expect(modelId).toBeDefined();
  });

  test('should generate cost estimates from AR models', async () => {
    const service = new ARVRVisualizationService();
    const estimate = service.generateCostEstimate('viz-123');
    expect(estimate.total).toBeGreaterThan(0);
    expect(estimate.materials).toBeDefined();
    expect(estimate.labor).toBeDefined();
  });
});
```

#### **WebXR Browser Testing**
```typescript
// e2e/ar-vr-features.spec.ts

test.describe('AR/VR Features', () => {
  test('should detect WebXR support', async ({ page }) => {
    await page.goto('http://localhost:3002/job/123/ar-view');

    const webxrSupported = await page.evaluate(() =>
      'xr' in navigator && 'requestSession' in navigator.xr
    );

    if (webxrSupported) {
      await expect(page.locator('[data-testid="ar-start-button"]')).toBeVisible();
    } else {
      await expect(page.locator('[data-testid="ar-fallback-mode"]')).toBeVisible();
    }
  });

  test('should load 3D models in browser', async ({ page }) => {
    await page.goto('http://localhost:3002/job/123/3d-view');

    // Wait for 3D scene to initialize
    await page.waitForFunction(() => window.THREE !== undefined);

    await expect(page.locator('[data-testid="3d-scene-container"]')).toBeVisible();

    // Check models are loaded
    const modelCount = await page.evaluate(() =>
      window.arScene ? window.arScene.children.length : 0
    );
    expect(modelCount).toBeGreaterThan(0);
  });

  test('should handle AR measurements', async ({ page }) => {
    await page.goto('http://localhost:3002/job/123/ar-measure');

    await page.click('[data-testid="measurement-tool"]');

    // Simulate placing measurement points
    await page.click('[data-testid="ar-scene"]', { position: { x: 100, y: 100 } });
    await page.click('[data-testid="ar-scene"]', { position: { x: 200, y: 100 } });

    await expect(page.locator('[data-testid="measurement-result"]')).toBeVisible();

    const measurement = await page.locator('[data-testid="measurement-value"]').textContent();
    expect(measurement).toMatch(/\d+(\.\d+)?\s*(cm|in|ft|m)/);
  });
});
```

#### **Performance Testing for 3D Rendering**
```typescript
test('AR/VR rendering performance', async ({ page }) => {
  await page.goto('http://localhost:3002/job/123/ar-view');

  // Measure initial load time
  const startTime = performance.now();
  await page.waitForSelector('[data-testid="ar-scene-ready"]');
  const loadTime = performance.now() - startTime;

  expect(loadTime).toBeLessThan(5000); // Under 5 seconds

  // Check frame rate
  const fps = await page.evaluate(() => {
    let frameCount = 0;
    const startTime = performance.now();

    function countFrames() {
      frameCount++;
      if (performance.now() - startTime < 1000) {
        requestAnimationFrame(countFrames);
      }
    }

    requestAnimationFrame(countFrames);

    return new Promise(resolve => {
      setTimeout(() => resolve(frameCount), 1100);
    });
  });

  expect(fps).toBeGreaterThan(30); // At least 30 FPS
});
```

---

### 4. Blockchain Review System Testing

#### **Service File:** `src/services/BlockchainReviewService.ts`

#### **Blockchain Integration Testing**
```typescript
// src/__tests__/services/BlockchainReviewService.test.ts

describe('BlockchainReviewService', () => {
  test('should submit review to blockchain', async () => {
    const service = new BlockchainReviewService();
    const reviewId = await service.submitReview(
      'job-123',
      'reviewer-456',
      'reviewee-789',
      5,
      'Excellent work!',
      { quality: 5, timeliness: 5, communication: 5, professionalism: 5, value: 5 }
    );
    expect(reviewId).toBeDefined();
  });

  test('should calculate reputation score', async () => {
    const service = new BlockchainReviewService();
    const reputation = await service.getUserReputation('user-123');
    expect(reputation.overallScore).toBeGreaterThanOrEqual(0);
    expect(reputation.overallScore).toBeLessThanOrEqual(5);
    expect(reputation.totalReviews).toBeGreaterThanOrEqual(0);
  });

  test('should issue NFT badges', async () => {
    const service = new BlockchainReviewService();
    const badgeId = await service.issueBadge(
      'contractor-123',
      'excellence_award',
      'Completed 100 jobs with 5-star rating'
    );
    expect(badgeId).toBeDefined();
  });
});
```

#### **Web3 Browser Testing**
```typescript
// e2e/blockchain-features.spec.ts

test.describe('Blockchain Reviews', () => {
  test('should connect to Web3 wallet', async ({ page, context }) => {
    // Mock MetaMask
    await page.addInitScript(() => {
      window.ethereum = {
        request: async ({ method }) => {
          if (method === 'eth_requestAccounts') {
            return ['0x1234567890123456789012345678901234567890'];
          }
          if (method === 'eth_chainId') {
            return '0x89'; // Polygon
          }
          return null;
        },
        on: () => {},
        removeListener: () => {}
      };
    });

    await page.goto('http://localhost:3002/reviews/blockchain');
    await page.click('[data-testid="connect-wallet"]');

    await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible();
  });

  test('should submit blockchain review', async ({ page }) => {
    await page.goto('http://localhost:3002/job/123/review');

    // Fill review form
    await page.selectOption('[data-testid="rating-select"]', '5');
    await page.fill('[data-testid="review-content"]', 'Amazing work, highly recommended!');

    // Enable blockchain submission
    await page.check('[data-testid="blockchain-enabled"]');

    await page.click('[data-testid="submit-review"]');

    // Check blockchain transaction status
    await expect(page.locator('[data-testid="blockchain-pending"]')).toBeVisible();

    // Mock transaction confirmation
    await page.evaluate(() => {
      window.mockBlockchainConfirmation();
    });

    await expect(page.locator('[data-testid="blockchain-confirmed"]')).toBeVisible();
  });

  test('should display NFT badges', async ({ page }) => {
    await page.goto('http://localhost:3002/contractor/123/profile');

    await expect(page.locator('[data-testid="nft-badges-section"]')).toBeVisible();

    const badgeCount = await page.locator('[data-testid="nft-badge"]').count();
    expect(badgeCount).toBeGreaterThanOrEqual(0);

    // Click on badge to show details
    if (badgeCount > 0) {
      await page.click('[data-testid="nft-badge"]').first();
      await expect(page.locator('[data-testid="badge-details-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="blockchain-verification"]')).toBeVisible();
    }
  });
});
```

#### **IPFS Testing**
```typescript
test('should store review content on IPFS', async ({ page }) => {
  await page.goto('http://localhost:3002/reviews/submit');

  // Submit review with media
  await page.setInputFiles('[data-testid="media-upload"]', 'test-image.jpg');
  await page.fill('[data-testid="review-text"]', 'Great work with photos!');

  await page.click('[data-testid="submit-to-ipfs"]');

  // Check IPFS hash is generated
  await expect(page.locator('[data-testid="ipfs-hash"]')).toBeVisible();

  const ipfsHash = await page.locator('[data-testid="ipfs-hash"]').textContent();
  expect(ipfsHash).toMatch(/^Qm[1-9A-HJ-NP-Za-km-z]{44,}$/); // Valid IPFS hash format
});
```

---

### 5. Infrastructure Scaling Testing

#### **Service File:** `src/services/InfrastructureScalingService.ts`

#### **Auto-Scaling Testing**
```typescript
// src/__tests__/services/InfrastructureScalingService.test.ts

describe('InfrastructureScalingService', () => {
  test('should trigger auto-scaling on high load', async () => {
    const service = new InfrastructureScalingService();

    // Simulate high CPU usage
    const metrics = {
      cpuUtilization: 85,
      memoryUtilization: 70,
      requestsPerSecond: 500,
      responseTime: 2500,
      errorRate: 2,
      activeConnections: 1000,
      networkThroughput: 100,
      queueLength: 50,
      timestamp: Date.now()
    };

    await service.collectMetrics = jest.fn().mockResolvedValue(metrics);
    await service.evaluateScalingPolicies();

    // Verify scaling action was triggered
    const status = await service.getInfrastructureStatus();
    expect(status.instances.length).toBeGreaterThan(2);
  });

  test('should predict future scaling needs', async () => {
    const service = new InfrastructureScalingService();
    await service.updatePredictiveModels();

    const status = await service.getInfrastructureStatus();
    expect(status.predictions).toBeDefined();
    expect(status.predictions.length).toBeGreaterThan(0);

    const prediction = status.predictions[0];
    expect(prediction.confidence).toBeGreaterThan(0.5);
    expect(prediction.recommendedCapacity).toBeGreaterThan(0);
  });

  test('should handle failover scenarios', async () => {
    const service = new InfrastructureScalingService();

    // Simulate service failure
    await service.performFailover({
      sourceRegion: 'us-east-1',
      targetRegion: 'us-west-2'
    });

    const status = await service.getInfrastructureStatus();
    expect(status.healthStatus).toBe('healthy');
  });
});
```

#### **Load Testing with Playwright**
```typescript
// e2e/infrastructure-scaling.spec.ts

test.describe('Infrastructure Scaling', () => {
  test('should handle concurrent users', async ({ browser }) => {
    const promises = [];

    // Simulate 10 concurrent users
    for (let i = 0; i < 10; i++) {
      promises.push(
        (async () => {
          const context = await browser.newContext();
          const page = await context.newPage();

          await page.goto('http://localhost:3002');
          await page.click('[data-testid="find-contractors"]');
          await page.waitForSelector('[data-testid="contractor-list"]');

          await context.close();
        })()
      );
    }

    const startTime = Date.now();
    await Promise.all(promises);
    const endTime = Date.now();

    const totalTime = endTime - startTime;
    expect(totalTime).toBeLessThan(10000); // Under 10 seconds for all users
  });

  test('should show performance metrics dashboard', async ({ page }) => {
    await page.goto('http://localhost:3002/admin/infrastructure');

    await expect(page.locator('[data-testid="metrics-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="cpu-utilization"]')).toBeVisible();
    await expect(page.locator('[data-testid="response-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-instances"]')).toBeVisible();

    // Check real-time updates
    const initialCpuValue = await page.locator('[data-testid="cpu-value"]').textContent();

    await page.waitForTimeout(30000); // Wait 30 seconds for metric update

    const updatedCpuValue = await page.locator('[data-testid="cpu-value"]').textContent();

    // Metrics should update (values may be the same, but timestamp should change)
    const timestamp1 = await page.locator('[data-testid="last-updated"]').textContent();
    await page.waitForTimeout(5000);
    const timestamp2 = await page.locator('[data-testid="last-updated"]').textContent();

    expect(timestamp1).not.toBe(timestamp2);
  });

  test('should trigger scaling alerts', async ({ page }) => {
    await page.goto('http://localhost:3002/admin/infrastructure');

    // Simulate high load condition
    await page.click('[data-testid="simulate-high-load"]');

    // Check alert notification
    await expect(page.locator('[data-testid="scaling-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="alert-message"]')).toContainText('Auto-scaling triggered');

    // Verify scaling action in logs
    await page.click('[data-testid="view-scaling-logs"]');
    await expect(page.locator('[data-testid="scaling-log-entry"]')).toBeVisible();
  });
});
```

---

## 🔧 Integration Testing Strategy

### Cross-Service Integration Tests

```typescript
// src/__tests__/integration/AdvancedFeaturesIntegration.test.ts

describe('Advanced Features Integration', () => {
  test('ML + Video Call integration', async () => {
    // ML recommends best contractors
    const recommendations = await MLFramework.getContractorRecommendations('job-123');

    // Schedule video call with top contractor
    const topContractor = recommendations[0];
    const callId = await VideoCallService.scheduleCall({
      jobId: 'job-123',
      participants: ['homeowner-456', topContractor.id]
    });

    expect(callId).toBeDefined();

    // ML should track call outcome for future recommendations
    await VideoCallService.endCall(callId, { satisfaction: 5, followUp: true });

    // Verify ML model learns from call outcome
    const updatedRecommendations = await MLFramework.getContractorRecommendations('job-123');
    expect(updatedRecommendations[0].confidence).toBeGreaterThan(recommendations[0].confidence);
  });

  test('AR + Blockchain integration', async () => {
    // Create AR visualization
    const vizId = await ARVRService.createARJobVisualization('job-123', 'Kitchen Reno', 'room_design');

    // Generate cost estimate from AR models
    const estimate = ARVRService.generateCostEstimate(vizId);

    // Complete job and submit blockchain review
    const reviewId = await BlockchainService.submitReview(
      'job-123',
      'homeowner-456',
      'contractor-789',
      5,
      'Perfect match to AR visualization!',
      { quality: 5, accuracy: 5 }
    );

    expect(reviewId).toBeDefined();

    // Verify review references AR visualization
    const review = await BlockchainService.getReview(reviewId);
    expect(review.metadata.arVisualizationId).toBe(vizId);
  });

  test('Infrastructure + ML integration', async () => {
    // ML framework should auto-scale based on prediction load
    const predictions = await MLFramework.batchPredict([
      { jobId: 'job-1', features: [] },
      { jobId: 'job-2', features: [] },
      // ... 100 more predictions
    ]);

    // Infrastructure should scale up to handle ML workload
    const infraStatus = await InfrastructureService.getInfrastructureStatus();
    expect(infraStatus.instances.some(i => i.type === 'ml_worker')).toBe(true);

    // After predictions complete, should scale down
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute

    const updatedStatus = await InfrastructureService.getInfrastructureStatus();
    const mlWorkers = updatedStatus.instances.filter(i => i.type === 'ml_worker');
    expect(mlWorkers.length).toBeLessThan(infraStatus.instances.filter(i => i.type === 'ml_worker').length);
  });
});
```

---

## 📊 Performance Benchmarks

### Acceptable Performance Thresholds

| Feature | Metric | Threshold | Measurement Method |
|---------|---------|-----------|-------------------|
| ML Framework | Prediction Latency | < 500ms | `performance.now()` |
| ML Framework | Model Deployment | < 30s | Deployment pipeline |
| Video Calling | Connection Setup | < 5s | WebRTC connection time |
| Video Calling | Video Quality | 720p @ 30fps | MediaStream analysis |
| AR/VR Service | 3D Model Load | < 3s | Three.js loading time |
| AR/VR Service | Frame Rate | > 30 FPS | `requestAnimationFrame` |
| Blockchain | Transaction Confirm | < 60s | Blockchain confirmation |
| Blockchain | IPFS Upload | < 10s | IPFS response time |
| Infrastructure | Auto-scaling Response | < 2 min | Metric threshold to action |
| Infrastructure | Health Check | < 1s | Service endpoint response |

### Performance Test Implementation

```typescript
// e2e/performance-benchmarks.spec.ts

test.describe('Performance Benchmarks', () => {
  test('all features meet performance thresholds', async ({ page }) => {
    await page.goto('http://localhost:3002/performance-test');

    // ML Framework Performance
    const mlStart = Date.now();
    await page.click('[data-testid="ml-predict"]');
    await page.waitForSelector('[data-testid="ml-result"]');
    const mlTime = Date.now() - mlStart;
    expect(mlTime).toBeLessThan(500);

    // Video Call Setup Performance
    const videoStart = Date.now();
    await page.click('[data-testid="start-video-call"]');
    await page.waitForSelector('[data-testid="video-connected"]');
    const videoTime = Date.now() - videoStart;
    expect(videoTime).toBeLessThan(5000);

    // AR/VR Loading Performance
    const arStart = Date.now();
    await page.click('[data-testid="load-ar-scene"]');
    await page.waitForSelector('[data-testid="ar-scene-ready"]');
    const arTime = Date.now() - arStart;
    expect(arTime).toBeLessThan(3000);

    // Blockchain Transaction Performance
    const blockchainStart = Date.now();
    await page.click('[data-testid="submit-blockchain-review"]');
    await page.waitForSelector('[data-testid="blockchain-confirmed"]');
    const blockchainTime = Date.now() - blockchainStart;
    expect(blockchainTime).toBeLessThan(60000);

    // Infrastructure Response Performance
    const infraStart = Date.now();
    await page.click('[data-testid="trigger-scaling"]');
    await page.waitForSelector('[data-testid="scaling-complete"]');
    const infraTime = Date.now() - infraStart;
    expect(infraTime).toBeLessThan(120000);
  });
});
```

---

## 🛡️ Security Testing

### Security Test Checklist

#### **ML Framework Security**
- [ ] Model poisoning protection
- [ ] Input validation for ML features
- [ ] A/B test data isolation
- [ ] Model deployment authentication
- [ ] Prediction result sanitization

#### **Video Call Security**
- [ ] WebRTC encryption verification
- [ ] Secure signaling server
- [ ] Recording permission checks
- [ ] Screen sharing restrictions
- [ ] Call participant verification

#### **AR/VR Security**
- [ ] 3D model content validation
- [ ] AR data sanitization
- [ ] VR session isolation
- [ ] Measurement data protection
- [ ] Model sharing permissions

#### **Blockchain Security**
- [ ] Smart contract audit
- [ ] Private key protection
- [ ] Transaction validation
- [ ] IPFS content verification
- [ ] NFT metadata protection

#### **Infrastructure Security**
- [ ] Auto-scaling abuse prevention
- [ ] Metric tampering protection
- [ ] Health check authentication
- [ ] Failover authorization
- [ ] Resource access controls

### Security Test Implementation

```typescript
// e2e/security-tests.spec.ts

test.describe('Security Tests', () => {
  test('should prevent unauthorized ML model access', async ({ page }) => {
    await page.goto('http://localhost:3002/admin/ml-models');

    // Try to access without authentication
    await expect(page.locator('[data-testid="login-required"]')).toBeVisible();

    // Try to access with invalid token
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'invalid_token');
    });
    await page.reload();

    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
  });

  test('should validate video call permissions', async ({ page, context }) => {
    await page.goto('http://localhost:3002/video-call/unauthorized');

    // Should not allow access to call without permission
    await expect(page.locator('[data-testid="call-access-denied"]')).toBeVisible();

    // Should not grant camera/microphone without user consent
    await context.clearPermissions();
    await page.goto('http://localhost:3002/video-call/authorized');

    await page.click('[data-testid="start-call"]');
    await expect(page.locator('[data-testid="permission-required"]')).toBeVisible();
  });

  test('should protect blockchain transactions', async ({ page }) => {
    await page.goto('http://localhost:3002/reviews/blockchain');

    // Should validate wallet connection
    await page.click('[data-testid="submit-review"]');
    await expect(page.locator('[data-testid="wallet-required"]')).toBeVisible();

    // Should validate transaction signatures
    await page.addInitScript(() => {
      window.ethereum = {
        request: () => Promise.reject(new Error('User denied signature'))
      };
    });

    await page.click('[data-testid="submit-review"]');
    await expect(page.locator('[data-testid="signature-required"]')).toBeVisible();
  });
});
```

---

## 📈 Monitoring & Analytics

### Feature Usage Analytics

```typescript
// Integration with existing analytics
const trackFeatureUsage = {
  mlPredictions: (modelId: string, accuracy: number) => {
    analytics.track('ML_Prediction_Used', {
      modelId,
      accuracy,
      timestamp: Date.now()
    });
  },

  videoCalls: (duration: number, quality: string) => {
    analytics.track('Video_Call_Completed', {
      duration,
      quality,
      timestamp: Date.now()
    });
  },

  arVisualization: (modelCount: number, estimateAccuracy: number) => {
    analytics.track('AR_Visualization_Created', {
      modelCount,
      estimateAccuracy,
      timestamp: Date.now()
    });
  },

  blockchainReview: (gasUsed: number, confirmationTime: number) => {
    analytics.track('Blockchain_Review_Submitted', {
      gasUsed,
      confirmationTime,
      timestamp: Date.now()
    });
  },

  infrastructureScaling: (triggerType: string, instanceChange: number) => {
    analytics.track('Infrastructure_Scaled', {
      triggerType,
      instanceChange,
      timestamp: Date.now()
    });
  }
};
```

---

## 🚀 Deployment Testing

### Pre-Production Checklist

#### **Staging Environment Tests**
- [ ] All 5 advanced features functional
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness confirmed
- [ ] Performance benchmarks met
- [ ] Security tests passed
- [ ] Integration tests completed
- [ ] Load testing successful
- [ ] Error handling validated

#### **Production Deployment Steps**
1. **Feature Flags**: Enable advanced features gradually
2. **A/B Testing**: Test ML improvements with user segments
3. **Monitoring**: Set up alerts for all new services
4. **Rollback Plan**: Prepare rollback procedures for each feature
5. **Documentation**: Update user guides and admin documentation

### Deployment Verification Tests

```typescript
// e2e/deployment-verification.spec.ts

test.describe('Production Deployment Verification', () => {
  test('should verify all advanced features are accessible', async ({ page }) => {
    const features = [
      '/ml-recommendations',
      '/video-call/test',
      '/ar-visualization/demo',
      '/blockchain-reviews',
      '/infrastructure/dashboard'
    ];

    for (const feature of features) {
      await page.goto(`http://localhost:3002${feature}`);
      await expect(page.locator('[data-testid="feature-loaded"]')).toBeVisible();
    }
  });

  test('should handle feature flag toggles', async ({ page }) => {
    await page.goto('http://localhost:3002/admin/feature-flags');

    // Disable ML recommendations
    await page.uncheck('[data-testid="ml-recommendations-enabled"]');
    await page.goto('http://localhost:3002/find-contractors');

    // Should show fallback UI
    await expect(page.locator('[data-testid="basic-search"]')).toBeVisible();
    await expect(page.locator('[data-testid="ml-recommendations"]')).not.toBeVisible();

    // Re-enable feature
    await page.goto('http://localhost:3002/admin/feature-flags');
    await page.check('[data-testid="ml-recommendations-enabled"]');
    await page.goto('http://localhost:3002/find-contractors');

    // Should show advanced UI
    await expect(page.locator('[data-testid="ml-recommendations"]')).toBeVisible();
  });
});
```

---

## 📋 Manual Testing Procedures

### **Manual Test Scenarios**

#### **Scenario 1: End-to-End Job Workflow with Advanced Features**
1. **Setup**: Login as homeowner, create job posting
2. **ML Recommendations**: Use ML to find best contractors
3. **AR Visualization**: Create AR visualization of desired work
4. **Video Consultation**: Schedule and conduct video call with contractor
5. **Blockchain Review**: Submit verified review on blockchain
6. **Infrastructure**: Monitor auto-scaling during peak usage

#### **Scenario 2: Contractor Business Enhancement**
1. **Setup**: Login as contractor, view available jobs
2. **ML Insights**: Use ML insights to optimize bidding
3. **AR Proposals**: Create AR visualizations for proposals
4. **Video Meetings**: Conduct video consultations with clients
5. **Reputation Building**: Earn NFT badges and blockchain verification
6. **Performance**: Monitor service performance during high activity

#### **Scenario 3: Cross-Platform Compatibility**
1. **Mobile Testing**: Test all features on mobile devices
2. **Tablet Testing**: Verify tablet-optimized interfaces
3. **Desktop Testing**: Ensure full desktop functionality
4. **Browser Testing**: Test Chrome, Firefox, Safari compatibility
5. **Performance**: Verify consistent performance across platforms

---

## 🎯 Success Metrics

### **Key Performance Indicators (KPIs)**

| Feature | Success Metric | Target Value |
|---------|---------------|--------------|
| ML Framework | Prediction Accuracy | > 85% |
| ML Framework | A/B Test Conversion | > 15% improvement |
| Video Calling | Call Completion Rate | > 90% |
| Video Calling | User Satisfaction | > 4.5/5 |
| AR/VR Service | Usage Adoption | > 60% of jobs |
| AR/VR Service | Cost Estimate Accuracy | > 80% |
| Blockchain Reviews | Verification Rate | > 95% |
| Blockchain Reviews | Trust Score Improvement | > 20% |
| Infrastructure | Uptime | > 99.9% |
| Infrastructure | Auto-scaling Response | < 2 minutes |

### **Testing Coverage Targets**

- **Unit Tests**: > 90% code coverage
- **Integration Tests**: > 80% critical path coverage
- **E2E Tests**: > 95% user workflow coverage
- **Performance Tests**: 100% benchmark validation
- **Security Tests**: 100% vulnerability coverage
- **Cross-Platform**: 100% feature parity

---

## 🔄 Continuous Testing Strategy

### **Automated Testing Pipeline**

```yaml
# .github/workflows/advanced-features-testing.yml

name: Advanced Features Testing

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run ML Framework Tests
        run: npm test -- --testPathPattern=AdvancedMLFramework
      - name: Run Video Call Tests
        run: npm test -- --testPathPattern=VideoCallService
      - name: Run AR/VR Tests
        run: npm test -- --testPathPattern=ARVRVisualizationService
      - name: Run Blockchain Tests
        run: npm test -- --testPathPattern=BlockchainReviewService
      - name: Run Infrastructure Tests
        run: npm test -- --testPathPattern=InfrastructureScalingService

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Start Test Environment
        run: |
          npm install
          npm run build
          npm start &
          sleep 30
      - name: Run Integration Tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Playwright
        run: |
          npm install
          npx playwright install
      - name: Start Web Server
        run: |
          npm run build:web
          npm run serve:web &
          sleep 30
      - name: Run E2E Tests
        run: npx playwright test

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Performance Benchmarks
        run: npm run test:performance

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Security Tests
        run: npm run test:security
```

---

This comprehensive testing guide ensures that all advanced features are thoroughly tested across multiple dimensions: functionality, performance, security, and user experience. The combination of automated and manual testing provides confidence in the production readiness of the implemented features.