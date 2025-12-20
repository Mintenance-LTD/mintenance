# A/B Testing Staged Rollout Plan

## Overview

This document outlines the staged rollout plan for the Safe AI Automation A/B testing framework. The rollout is designed to minimize risk while collecting rigorous empirical validation data.

## Phase 1: Shadow Mode (Week 1-2)
- **Rollout**: 0% (shadow only)
- **Mode**: `AB_TEST_SHADOW_MODE=true`
- **Goal**: Verify logging and decision logic without affecting users
- **Success Criteria**: 
  - All decisions logged correctly
  - No errors in production logs
  - Decision distribution matches expectations
  - Database queries performant

## Phase 2: Canary (Week 3)
- **Rollout**: 1%
- **Mode**: `AB_TEST_SHADOW_MODE=false`
- **Goal**: Test live automation on small subset
- **Success Criteria**: 
  - SFN rate ≤ 0.5% (non-inferiority maintained)
  - No critical safety incidents
  - Automation rate > 0%
  - User satisfaction maintained

## Phase 3: Gradual Ramp (Week 4-6)
- **Rollout**: 5% → 10% → 25%
- **Mode**: Live
- **Goal**: Scale automation while monitoring safety
- **Success Criteria**: 
  - SFN rate stable across all percentages
  - Automation rate increasing proportionally
  - No degradation in decision quality
  - Coverage monitoring shows stable performance

## Phase 4: Full Rollout (Week 7+)
- **Rollout**: 50% → 100%
- **Mode**: Live
- **Goal**: Complete A/B test with statistical power
- **Success Criteria**: 
  - Non-inferiority on SFN (p < 0.05)
  - Automation ≥ 50% in treatment arm
  - Regret gap < 15% vs control
  - All safety constraints satisfied

## Rollback Criteria

Immediately rollback if:
- SFN rate > 1.0% in any stratum
- Critical safety incident occurs
- Coverage drops below 85% in any stratum
- System errors > 5% of requests
- User complaints increase significantly

## Monitoring Dashboard

Key metrics to track:
- SFN rate by arm and stratum
- Automation rate by arm
- Decision time (seconds)
- Coverage by stratum (Wilson CIs)
- User satisfaction (CSAT)
- System errors and timeouts

## Environment Variables

```bash
# Phase 1: Shadow Mode
AB_TEST_ENABLED=true
AB_TEST_SHADOW_MODE=true
AB_TEST_ROLLOUT_PERCENT=0
AB_TEST_EXPERIMENT_ID=<experiment-uuid>

# Phase 2: Canary
AB_TEST_ENABLED=true
AB_TEST_SHADOW_MODE=false
AB_TEST_ROLLOUT_PERCENT=1
AB_TEST_EXPERIMENT_ID=<experiment-uuid>

# Phase 3: Gradual Ramp
AB_TEST_ENABLED=true
AB_TEST_SHADOW_MODE=false
AB_TEST_ROLLOUT_PERCENT=25  # Increase gradually
AB_TEST_EXPERIMENT_ID=<experiment-uuid>

# Phase 4: Full Rollout
AB_TEST_ENABLED=true
AB_TEST_SHADOW_MODE=false
AB_TEST_ROLLOUT_PERCENT=100
AB_TEST_EXPERIMENT_ID=<experiment-uuid>
```

