# SAM3 Presence Detection - Deployment Runbook

## Overview
This runbook provides step-by-step instructions for deploying the SAM3 presence detection system with gradual rollout and monitoring.

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Phases](#deployment-phases)
3. [Monitoring & Alerts](#monitoring--alerts)
4. [Rollback Procedures](#rollback-procedures)
5. [Performance Metrics](#performance-metrics)
6. [Troubleshooting](#troubleshooting)
7. [Post-Deployment Validation](#post-deployment-validation)

## Pre-Deployment Checklist

### Infrastructure Requirements
- [ ] Docker registry accessible (GitHub Container Registry)
- [ ] AWS ECS cluster running with sufficient capacity
- [ ] Load balancer configured for blue-green deployment
- [ ] DataDog agent installed and configured
- [ ] LaunchDarkly project configured
- [ ] Supabase database migrations applied

### Code Verification
```bash
# Run all tests
cd apps/sam3-service
pytest test_presence_detection.py -v

# Check model files
ls -la model_cache/
# Should see: sam_vit_h_4b8939.pth (2.4GB)

# Verify Docker build
docker build -t sam3-service:test .
docker run --rm sam3-service:test python -c "import torch; print(torch.cuda.is_available())"
```

### Environment Variables
```bash
# Production environment variables
export LAUNCHDARKLY_API_KEY="sdk-xxx"
export DD_API_KEY="xxx"
export DD_APP_KEY="xxx"
export AWS_ACCESS_KEY_ID="xxx"
export AWS_SECRET_ACCESS_KEY="xxx"
export SLACK_WEBHOOK="https://hooks.slack.com/xxx"
export SENTRY_AUTH_TOKEN="xxx"
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_KEY="xxx"
```

## Deployment Phases

### Phase 1: Staging Deployment (Day 1)
```bash
# 1. Deploy to staging
git checkout staging
git merge feature/sam3-presence-detection
git push origin staging

# 2. Monitor GitHub Actions
# https://github.com/mintenance/mintenance/actions

# 3. Verify staging deployment
curl https://staging-sam3.mintenance.com/health

# 4. Run integration tests
npm run test:integration -- --env=staging

# 5. Enable 100% traffic in staging
./scripts/feature-flag.sh staging sam3-presence-detection 100
```

### Phase 2: Production Canary (Day 2)
```bash
# 1. Deploy with 5% traffic
gh workflow run deploy-sam3-service.yml \
  -f environment=production \
  -f rollout_percentage=5

# 2. Monitor for 2 hours
# Check dashboard: https://app.datadoghq.eu/dashboard/sam3-presence-detection

# 3. Verify metrics
./scripts/check-metrics.sh production 5

# Success criteria:
# - False negative rate < 3%
# - Inference time < 1000ms (p95)
# - Error rate < 0.1%
```

### Phase 3: Gradual Rollout (Days 3-5)
```bash
# Day 3: Increase to 20%
./scripts/update-rollout.sh production 20

# Monitor for 24 hours
# - Check false positive reduction: should be 60-80%
# - Check YOLO skip rate: target 30-40%

# Day 4: Increase to 50%
./scripts/update-rollout.sh production 50

# Monitor for 24 hours
# - Validate A/B test results
# - Compare control vs treatment groups

# Day 5: Full rollout
./scripts/update-rollout.sh production 100

# Switch traffic to new deployment
aws elbv2 modify-listener \
  --listener-arn $SAM3_LISTENER_ARN \
  --default-actions Type=forward,TargetGroupArn=$NEW_TARGET_GROUP
```

## Monitoring & Alerts

### Key Metrics to Monitor

#### Real-time Dashboard
```
https://app.datadoghq.eu/dashboard/sam3-presence-detection-rollout
```

#### Critical Metrics
1. **False Negative Rate**
   - Threshold: < 5%
   - Alert: Immediate rollback if > 5%
   - Query: `avg:sam3.presence_detection.false_negative_rate{env:production}`

2. **YOLO Skip Rate**
   - Target: 30-60%
   - Indicates cost savings
   - Query: `avg:sam3.presence_detection.yolo_skip_rate{env:production}`

3. **Inference Time**
   - p50: < 500ms
   - p95: < 1000ms
   - p99: < 3000ms
   - Query: `avg:sam3.presence_detection.inference_time{env:production}`

4. **Error Rate**
   - Threshold: < 1%
   - Query: `sum:sam3.presence_detection.errors{env:production}.as_rate()`

### Alert Configuration
```yaml
# DataDog monitor configuration
monitors:
  - name: SAM3 False Negative Rate
    type: metric
    query: avg(last_5m):avg:sam3.presence_detection.false_negative_rate{env:production} > 5
    message: |
      @slack-mintenance-alerts
      SAM3 false negative rate is {{value}}%
      Rollback may be required!
    priority: 1

  - name: SAM3 Service Health
    type: service check
    query: "sam3.health_check".over("env:production").last(2).count_by_status()
    message: |
      @pagerduty
      SAM3 service is unhealthy
    priority: 1
```

## Rollback Procedures

### Automatic Rollback
Triggers automatically when:
- False negative rate > 5%
- Error rate > 10%
- Service health checks fail

### Manual Rollback

#### Quick Rollback (Feature Flag Only)
```bash
# Disable SAM3 immediately
./scripts/sam3-rollback.sh production "Manual intervention required" feature_flag

# Verify
curl -X GET https://api.launchdarkly.com/api/v2/flags/default/sam3-presence-detection \
  -H "Authorization: $LAUNCHDARKLY_API_KEY" | jq '.environments.production.on'
```

#### Full Rollback (Feature Flag + Deployment)
```bash
# Rollback both feature flag and deployment
./scripts/sam3-rollback.sh production "Performance degradation detected" both

# Verify service is running previous version
aws ecs describe-services \
  --cluster mintenance-prod \
  --services sam3-service \
  --query 'services[0].taskDefinition'
```

#### Blue-Green Switch Back
```bash
# Switch traffic back to previous environment
aws elbv2 modify-listener \
  --listener-arn $SAM3_LISTENER_ARN \
  --default-actions Type=forward,TargetGroupArn=$OLD_TARGET_GROUP

# Verify traffic switch
aws elbv2 describe-target-health \
  --target-group-arn $OLD_TARGET_GROUP
```

## Performance Metrics

### Expected Improvements
- **False Positive Reduction**: 60-80%
- **YOLO Skip Rate**: 30-60% of assessments
- **Cost Savings**: ~40% reduction in GPU compute
- **Inference Time**: +200-500ms for presence check, -2000ms when YOLO skipped

### A/B Test Analysis
```sql
-- Query Supabase for A/B test results
SELECT
    presence_detection->>'abTestGroup' as test_group,
    COUNT(*) as total_assessments,
    AVG(CASE WHEN yolo_skipped THEN 1 ELSE 0 END) * 100 as yolo_skip_rate,
    AVG(inference_time_ms) as avg_inference_time,
    AVG(CASE WHEN presence_detection->>'damageDetected' = 'false'
        AND final_assessment->>'damageType' != 'None'
        THEN 1 ELSE 0 END) * 100 as false_negative_rate
FROM hybrid_routing_decisions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY test_group;
```

## Troubleshooting

### Common Issues

#### 1. High False Negative Rate
```bash
# Check SAM3 confidence thresholds
curl https://sam3.mintenance.com/config | jq '.thresholds'

# Adjust if needed
curl -X PATCH https://sam3.mintenance.com/config \
  -H "Content-Type: application/json" \
  -d '{"skipYoloThreshold": 0.98}'
```

#### 2. Slow Inference Time
```bash
# Check GPU utilization
aws ecs describe-tasks \
  --cluster mintenance-prod \
  --tasks $(aws ecs list-tasks --cluster mintenance-prod --service-name sam3-service --query 'taskArns[0]' --output text) \
  --query 'tasks[0].containers[0].gpuIds'

# Scale up if needed
aws ecs update-service \
  --cluster mintenance-prod \
  --service sam3-service \
  --desired-count 3
```

#### 3. Memory Issues
```bash
# Check memory usage
docker stats sam3-service

# If OOM, update task definition
aws ecs register-task-definition \
  --family sam3-service-prod \
  --memory 8192 \
  --cpu 2048
```

### Debug Commands
```bash
# Check service logs
aws logs tail /ecs/sam3-service --follow

# Test presence detection
curl -X POST https://sam3.mintenance.com/detect-presence \
  -H "Content-Type: application/json" \
  -d '{
    "image_base64": "...",
    "damage_types": ["water damage", "crack", "mold"]
  }'

# Check feature flag status
curl https://api.mintenance.com/api/feature-flags/status \
  -H "Authorization: Bearer $API_TOKEN"
```

## Post-Deployment Validation

### Functional Tests
```bash
# 1. Health check
curl https://sam3.mintenance.com/health

# 2. Presence detection test
npm run test:sam3:production

# 3. End-to-end assessment with SAM3
curl -X POST https://api.mintenance.com/api/assess \
  -H "Content-Type: application/json" \
  -H "X-Feature-Flag: sam3-presence-detection=true" \
  -d '{"images": ["https://example.com/damage.jpg"]}'
```

### Performance Validation
```python
# performance_test.py
import requests
import time
import statistics

def test_sam3_performance():
    times = []
    skip_count = 0

    for i in range(100):
        start = time.time()
        response = requests.post(
            "https://api.mintenance.com/api/assess",
            json={"images": [f"https://test-images.com/image_{i}.jpg"]},
            headers={"X-Feature-Flag": "sam3-presence-detection=true"}
        )
        times.append((time.time() - start) * 1000)

        if response.json().get("yoloSkipped"):
            skip_count += 1

    print(f"Mean inference time: {statistics.mean(times):.2f}ms")
    print(f"P95 inference time: {statistics.quantile(times, 0.95):.2f}ms")
    print(f"YOLO skip rate: {skip_count}%")

    assert statistics.mean(times) < 1000, "Mean time exceeds threshold"
    assert skip_count >= 30, "YOLO skip rate below target"

if __name__ == "__main__":
    test_sam3_performance()
```

### Rollout Completion Checklist
- [ ] All traffic migrated to new deployment
- [ ] Old deployment kept for quick rollback (24 hours)
- [ ] Metrics dashboard showing expected improvements
- [ ] No critical alerts in past 6 hours
- [ ] A/B test results documented
- [ ] Cost savings report generated
- [ ] Team notified of successful deployment
- [ ] Documentation updated with new endpoints
- [ ] Customer communication sent (if applicable)

## Support & Escalation

### On-Call Contacts
- **Primary**: DevOps Team - #devops-oncall
- **Secondary**: AI Team - #ai-team
- **Escalation**: Engineering Manager

### Resources
- [SAM3 Architecture Document](./SAM3_INTEGRATION_GUIDE.md)
- [API Documentation](https://api.mintenance.com/docs#sam3)
- [DataDog Dashboard](https://app.datadoghq.eu/dashboard/sam3-presence-detection)
- [LaunchDarkly Console](https://app.launchdarkly.com/default/production/features/sam3-presence-detection)
- [Incident Response Playbook](./INCIDENT_RESPONSE.md)

## Revision History
- v1.0.0 (2024-12-20): Initial deployment runbook for SAM3 presence detection
- v1.0.1 (TBD): Updates based on production deployment learnings