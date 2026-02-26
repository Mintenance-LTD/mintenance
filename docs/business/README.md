# Business Documentation

Business plan notes, key metrics, and strategy for Mintenance.

> **Accuracy notice (2026-02-18)**: All metrics below are cross-referenced against
> the production codebase. Where a figure comes from code it is marked **(code)**.
> Where it is a projection or external estimate it is marked **(estimate)**.

## 🎯 Key Metrics

**Market Opportunity** (estimate):
- £15.6B UK home maintenance market
- 8.2% annual growth
- 28M households

**Business Model** (code — `FeeCalculationService.ts`):
- Platform fee: **5% of job value** (applied once per payment, all tiers)
- Stripe processing: 1.5% + £0.20 per transaction
- Total cost to homeowner on a £100 job: **£6.70** (contractor receives £93.30)
- Min platform fee: £0.50, max: £50.00
- AI assessment: included in platform (no separate charge)

**Subscription Tiers** (code — `feature-access-config.ts`):

| Contractor Tier | Price | Bids/month | Key extras |
|-----------------|-------|------------|------------|
| Free | £0 | 10 | Basic analytics, email support |
| Basic | £29/mo | 10 | Verified badge, invoicing |
| Professional | £79/mo | 50 | Featured listing, CRM, social feed, advanced analytics |
| Enterprise | £199/mo | Unlimited | API access, phone support, dedicated account manager |

| Homeowner Tier | Price | Properties | Key extras |
|----------------|-------|------------|------------|
| Free | £0 | 1 | Post jobs, messaging, escrow, AI assessment |
| Landlord | £24.99/mo | 25 | Compliance dashboard, tenant reporting, portfolio analytics |
| Agency | £49.99/mo | Unlimited | Team access, bulk operations, YoY comparison |

**MintAI** (code — `building-surveyor/`, `roboflow.config.ts`, `sam3-service/`):
- 3-model fusion: YOLOv11 (Roboflow) + SAM3 (segmentation) + GPT-4o (vision)
- Cost: £0.059/assessment (estimate — vs £0.25 typical cloud API cost)
- Accuracy: target 92% (not yet independently validated — feedback loop active)
- Conformal prediction confidence bands implemented
- Public demo at `/try-mint-ai` (rate-limited, 3 req/min)

**User Roles** (code — `profiles` table):
- `homeowner` — creates jobs, pays via escrow
- `contractor` — bids, performs work, receives payment
- `admin` — platform administration

**Geography**:
- National UK scope (no geographic restriction in code)
- Contractors define their own service areas
- Photo geolocation verification: 100 m Haversine threshold

**Financial Projections** (estimate):
- Year 1 Revenue: £450K
- Year 3 Revenue: £12.8M
- Exit Valuation: £60M (4.7x revenue multiple)

## 📊 Funding Use

**Seed Round (£1.1M-£1.3M)** (estimate):
1. Team (55%): CTO, AI/ML Engineer, 2x Full-Stack, Sales Lead
2. Operations (20%): Office, insurance, legal, marketing
3. Technology (15%): Infrastructure, AI training, APIs
4. Reserve (10%): Buffer for contingencies

## 🔐 Confidentiality

These documents contain proprietary information including:
- Financial projections
- IP strategy
- Competitive analysis
- Trade secrets

**Distribution**: Investors, board members, senior management only.

## 📅 Last Updated

**Date**: 18 February 2026
**Version**: 2.0 — corrected to match production codebase
**Previous version**: 1.0 (20 December 2025) contained inaccurate fee structure

## 📧 Contact

For investor inquiries or questions about these documents:
- Email: founders@mintenance.co.uk
- Pitch deck: Available upon request
