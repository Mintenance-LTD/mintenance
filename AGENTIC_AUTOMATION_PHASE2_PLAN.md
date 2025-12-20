# Phase 2: Additional Agentic Automation Features
## Implementation Plan & Prioritization

### Priority Matrix

#### 🔥 High Priority - Immediate Impact
1. **Smart Notification Agent** - Reduces user fatigue, improves engagement
2. **Smart Escrow Release Agent** - Automates critical payment flow
3. **Intelligent Pricing Agent** - Improves marketplace efficiency

#### ⚡ Medium Priority - High Value
4. **Automated Review & Rating Agent** - Improves review quality and volume
5. **Verification & Trust Agent** - Enhances platform safety
6. **Quality Assurance Agent** - Maintains service standards

#### 📋 Lower Priority - Future Enhancements
7. **Contract Generation Agent** - Nice-to-have automation
8. **Marketplace Health Agent** - Important but less urgent

---

## 1. Smart Notification Agent 🔥

### Goals
- Reduce notification fatigue
- Improve engagement rates
- Respect user preferences and quiet hours
- Surface urgent notifications effectively

### Features to Implement
- **Adaptive Notification Preferences**
  - Learn from user engagement patterns (open rates, click rates)
  - Adjust notification frequency based on engagement
  - Respect user-defined quiet hours
  - Detect sleep patterns automatically (for mobile)

- **Priority Routing**
  - Urgent notifications (disputes, payments) always surface
  - Routine notifications batched and sent at optimal times
  - Low-priority notifications can be delayed/grouped

- **Engagement Learning**
  - Track which notification types users engage with
  - Track best times for engagement
  - Adjust timing and frequency automatically

### Database Changes
```sql
-- Add to automation_preferences table
ALTER TABLE automation_preferences ADD COLUMN IF NOT EXISTS notification_learning_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE automation_preferences ADD COLUMN IF NOT EXISTS quiet_hours_start TIME;
ALTER TABLE automation_preferences ADD COLUMN IF NOT EXISTS quiet_hours_end TIME;

-- New table for notification engagement tracking
CREATE TABLE notification_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  notification_id UUID NOT NULL REFERENCES notifications(id),
  notification_type VARCHAR(50),
  opened BOOLEAN DEFAULT FALSE,
  clicked BOOLEAN DEFAULT FALSE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notification_engagement_user_type ON notification_engagement(user_id, notification_type);
CREATE INDEX idx_notification_engagement_opened ON notification_engagement(opened, created_at);
```

### Implementation Files
- `apps/web/lib/services/agents/NotificationAgent.ts`
- Update `apps/web/app/api/notifications/route.ts` to use agent
- Update `apps/web/lib/services/agents/AutomationPreferencesService.ts`

---

## 2. Smart Escrow Release Agent 🔥

### Goals
- Automate escrow release when criteria are met
- Photo verification for completion
- Risk-based hold periods
- Timeline-based auto-release

### Features to Implement
- **Photo Verification**
  - Compare completion photos to job description
  - Use AI image analysis to verify work completion
  - Flag photos that don't match job requirements

- **Timeline-Based Auto-Release**
  - Release based on job timeline + contractor tier
  - Higher-tier contractors get faster releases
  - Default release after X days if no disputes

- **Risk-Based Holds**
  - Extend hold period for high-risk jobs
  - Consider contractor history, job value, category
  - Automatically adjust based on predictive risk scores

- **Dispute Prediction**
  - Use predictive agent to flag potential disputes
  - Extend hold if dispute risk detected
  - Auto-release if risk clears

### Database Changes
```sql
-- Add to escrow_payments table
ALTER TABLE escrow_payments ADD COLUMN IF NOT EXISTS auto_release_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE escrow_payments ADD COLUMN IF NOT EXISTS auto_release_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE escrow_payments ADD COLUMN IF NOT EXISTS photo_verification_status VARCHAR(50);
ALTER TABLE escrow_payments ADD COLUMN IF NOT EXISTS photo_verification_score DECIMAL(3,2);

-- New table for photo verification
CREATE TABLE escrow_photo_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES escrow_payments(id),
  job_id UUID NOT NULL REFERENCES jobs(id),
  photo_url TEXT NOT NULL,
  verification_score DECIMAL(3,2),
  verification_status VARCHAR(50),
  ai_analysis JSONB,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Implementation Files
- `apps/web/lib/services/agents/EscrowReleaseAgent.ts`
- Integrate with `apps/web/lib/services/payment/EscrowService.ts`
- Update `apps/web/app/api/payments/release-escrow/route.ts`

---

## 3. Intelligent Pricing Agent 🔥

### Goals
- Learn from market data (accepted vs rejected bids)
- Suggest competitive pricing
- Help contractors price accurately
- Improve bid acceptance rates

### Features to Implement
- **Market-Based Pricing**
  - Analyze accepted vs rejected bids
  - Learn price ranges for job categories
  - Track regional pricing differences

- **Dynamic Quote Suggestions**
  - Auto-suggest pricing based on similar jobs
  - Consider job complexity, location, contractor tier
  - Provide pricing confidence scores

- **Price Competitiveness Scoring**
  - Indicate if bids are too high/low for market
  - Suggest optimal price range
  - Warn contractors about pricing risks

- **Contractor Pricing Patterns**
  - Learn individual contractor pricing habits
  - Identify contractors who consistently over/under-price
  - Suggest adjustments based on acceptance rates

### Database Changes
```sql
-- New table for pricing analytics
CREATE TABLE pricing_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  category VARCHAR(100),
  location TEXT,
  budget DECIMAL(10,2),
  accepted_bid_amount DECIMAL(10,2),
  rejected_bid_min DECIMAL(10,2),
  rejected_bid_max DECIMAL(10,2),
  avg_accepted_price DECIMAL(10,2),
  median_accepted_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pricing_analytics_category_location ON pricing_analytics(category, location);
CREATE INDEX idx_pricing_analytics_created_at ON pricing_analytics(created_at DESC);

-- Add to bids table for pricing suggestions
ALTER TABLE bids ADD COLUMN IF NOT EXISTS suggested_price_range JSONB;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS competitiveness_score INTEGER;
```

### Implementation Files
- `apps/web/lib/services/agents/PricingAgent.ts`
- Integrate with `apps/web/app/api/contractor/submit-bid/route.ts`
- Create pricing analytics cron job

---

## 4. Automated Review & Rating Agent ⚡

### Goals
- Increase review volume
- Improve review quality
- Detect fake reviews
- Help contractors respond to reviews

### Features to Implement
- **Proactive Review Requests**
  - Automatically request reviews after completion
  - Timing based on user engagement patterns
  - Follow-up if initial request ignored

- **Review Quality Monitoring**
  - Detect fake/low-quality reviews using ML
  - Flag suspicious patterns (same IP, similar text)
  - Verify review authenticity

- **Sentiment Analysis**
  - Analyze review text for early issue detection
  - Flag negative sentiment for follow-up
  - Track sentiment trends over time

- **Auto-Response Suggestions**
  - Suggest contractor responses to reviews
  - Generate personalized response templates
  - Help maintain professional communication

### Database Changes
```sql
-- Add to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT FALSE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

-- New table for review requests
CREATE TABLE review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  homeowner_id UUID NOT NULL REFERENCES users(id),
  contractor_id UUID NOT NULL REFERENCES users(id),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  response_type VARCHAR(50), -- 'reviewed', 'declined', 'ignored'
  follow_up_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_review_requests_job_id ON review_requests(job_id);
CREATE INDEX idx_review_requests_responded ON review_requests(responded_at) WHERE responded_at IS NULL;
```

### Implementation Files
- `apps/web/lib/services/agents/ReviewAgent.ts`
- Integrate with job completion workflow
- Create review quality analysis service

---

## 5. Verification & Trust Agent ⚡

### Goals
- Automate verification triggers
- Verify skills through job history
- Calculate comprehensive trust scores
- Verify portfolio authenticity

### Features to Implement
- **Automated Background Check Triggers**
  - Initiate checks based on job value/type
  - Trigger re-checks based on time/risk
  - Automatically verify contractor eligibility

- **Skills Auto-Verification**
  - Verify skills through job completion history
  - Calculate skill proficiency scores
  - Auto-verify skills after X successful jobs

- **Portfolio Verification**
  - Verify portfolio images aren't duplicates
  - Check image authenticity (reverse image search)
  - Validate portfolio relevance to skills

- **Trust Score Calculation**
  - Composite score from multiple factors:
    - Background check status
    - Review ratings
    - Job completion rate
    - On-time performance
    - Dispute history
    - Verification status

### Database Changes
```sql
-- Add to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score_updated_at TIMESTAMP WITH TIME ZONE;

-- New table for trust score history
CREATE TABLE trust_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  trust_score INTEGER NOT NULL,
  factors JSONB,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_trust_score_history_user_id ON trust_score_history(user_id, created_at DESC);

-- Add to contractor_skills for auto-verification
ALTER TABLE contractor_skills ADD COLUMN IF NOT EXISTS auto_verified_jobs_count INTEGER DEFAULT 0;
ALTER TABLE contractor_skills ADD COLUMN IF NOT EXISTS proficiency_score DECIMAL(3,2);
```

### Implementation Files
- `apps/web/lib/services/agents/VerificationAgent.ts`
- Integrate with `apps/web/lib/services/verification/BackgroundCheckService.ts`
- Create trust score calculation service

---

## 6. Quality Assurance Agent ⚡

### Goals
- Monitor job completion quality
- Track contractor performance
- Detect declining performance early
- Automated quality scoring

### Features to Implement
- **Job Completion Verification**
  - Verify work quality through photos/reviews
  - Compare completed work to job requirements
  - Flag quality issues early

- **Contractor Performance Monitoring**
  - Track performance metrics over time:
    - On-time completion rate
    - Quality scores
    - Customer satisfaction
    - Dispute rate
  - Generate performance reports

- **Early Warning System**
  - Detect declining contractor performance
  - Flag contractors at risk
  - Suggest intervention strategies

- **Automated Quality Scoring**
  - Score jobs based on multiple factors
  - Use ML to predict quality issues
  - Generate quality reports

### Database Changes
```sql
-- New table for quality scores
CREATE TABLE quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  contractor_id UUID NOT NULL REFERENCES users(id),
  overall_score DECIMAL(3,2),
  photo_score DECIMAL(3,2),
  review_score DECIMAL(3,2),
  completion_score DECIMAL(3,2),
  factors JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quality_scores_contractor_id ON quality_scores(contractor_id, created_at DESC);

-- New table for contractor performance
CREATE TABLE contractor_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES users(id),
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  jobs_completed INTEGER DEFAULT 0,
  on_time_rate DECIMAL(5,2),
  avg_quality_score DECIMAL(3,2),
  avg_customer_satisfaction DECIMAL(3,2),
  dispute_rate DECIMAL(5,2),
  performance_trend VARCHAR(20), -- 'improving', 'stable', 'declining'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contractor_performance_contractor_id ON contractor_performance(contractor_id, period_end DESC);
```

### Implementation Files
- `apps/web/lib/services/agents/QualityAssuranceAgent.ts`
- Create quality scoring service
- Integrate with job completion workflow

---

## 7. Contract Generation Agent 📋

### Goals
- Auto-generate contracts from job details
- Optimize contract terms
- Detect repeat customers
- Ensure legal compliance

### Features to Implement
- **Auto-Generate Contracts**
  - Create contracts from job details + quotes
  - Use templates based on job type
  - Include standard terms and conditions

- **Terms Optimization**
  - Suggest contract terms based on job type
  - Include risk mitigation clauses
  - Optimize payment terms

- **Renewal Detection**
  - Identify repeat customers
  - Use previous contract templates
  - Suggest contract renewals

- **Legal Compliance Checking**
  - Verify contract terms meet platform requirements
  - Check local legal requirements
  - Flag non-compliant terms

### Implementation Notes
- Lower priority - can use template system initially
- May require legal review before full automation
- Start with basic templates, add AI generation later

---

## 8. Marketplace Health Agent 📋

### Goals
- Detect fraud and spam
- Monitor marketplace balance
- Track user satisfaction
- Improve platform health

### Features to Implement
- **Fraud Detection**
  - Identify suspicious patterns in jobs/bids
  - Detect fake accounts
  - Flag suspicious activity

- **Spam Detection**
  - Detect and flag spam jobs/bids
  - Use ML to identify spam patterns
  - Automatically remove spam content

- **Marketplace Balance**
  - Ensure good contractor-to-job ratio
  - Monitor supply and demand
  - Suggest actions to balance marketplace

- **User Satisfaction Monitoring**
  - Track and improve platform health
  - Monitor key metrics
  - Generate health reports

### Implementation Notes
- Important but less urgent
- Can leverage existing fraud detection systems
- Requires comprehensive analytics dashboard

---

## Implementation Order

### Phase 2A (Immediate - Next 2 weeks)
1. Smart Notification Agent
2. Smart Escrow Release Agent (Photo verification later)
3. Intelligent Pricing Agent (Basic market analysis)

### Phase 2B (Short-term - Next month)
4. Automated Review & Rating Agent
5. Verification & Trust Agent (Basic trust score)
6. Quality Assurance Agent (Basic scoring)

### Phase 2C (Medium-term - Next quarter)
7. Contract Generation Agent
8. Marketplace Health Agent
9. Advanced features for all agents (ML enhancements, etc.)

---

## Next Steps

1. Review and approve plan
2. Start with Phase 2A implementations
3. Create database migrations
4. Implement core agent services
5. Integrate with existing workflows
6. Test and iterate
7. Monitor and optimize

---

## Dependencies

- Existing agent infrastructure (✅ Complete)
- Automation preferences system (✅ Complete)
- Agent logging system (✅ Complete)
- Database schema updates (📋 Needed)
- ML/AI services for advanced features (📋 Partial - OpenAI integration exists)

---

## Notes

- All agents should follow the same pattern as Phase 1 agents
- Use AutomationPreferencesService for user preferences
- Log all decisions using AgentLogger
- Integrate with existing cron jobs
- Maintain backward compatibility
- Test thoroughly before production deployment

