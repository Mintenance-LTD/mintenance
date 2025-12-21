# 🔐 MINTENANCE INTELLECTUAL PROPERTY STRATEGY 2025

**Company:** Mintenance Ltd
**Date:** 20 December 2025
**Location:** Greater Manchester, UK
**Planning Horizon:** Seed Stage → Series A

---

## 📋 EXECUTIVE SUMMARY

This document outlines Mintenance's intellectual property (IP) protection strategy, covering trade secrets, trademarks, patents, copyrights, and open-source licensing. The strategy balances cost-effectiveness at seed stage with robust protection of core competitive advantages.

### IP Portfolio Summary

| IP Type | Current Status | Investment (18mo) | Future Investment |
|---------|---------------|-------------------|-------------------|
| **Trade Secrets** | ✅ Implemented | £5,000 | £2,000/year |
| **Trademarks** | ✅ Filed | £3,015 | £600/year |
| **Copyright** | ✅ Automatic | £1,500 | £500/year |
| **Domains** | ✅ Secured | £2,480 | £300/year |
| **Patents** | ⏳ Deferred | £0 | £22,160 (Series A) |
| **Total** | - | **£12,000** | **£25,560** |

### Strategic Recommendation

**Seed Stage (Current):**
- ✅ Protect via trade secrets (most cost-effective)
- ✅ Secure trademarks (brand protection)
- ✅ Document copyright (automatic but enforceable)
- ❌ Defer patents (expensive, better post-Series A)

**Series A+ (Future):**
- ✅ File strategic patents (AI algorithms, hybrid inference)
- ✅ International trademark expansion
- ✅ PCT application for global patent protection

---

## 🔒 TRADE SECRETS (PRIMARY PROTECTION)

### What Are Trade Secrets?

Trade secrets protect confidential business information that provides competitive advantage and is not publicly known. Unlike patents (which disclose the invention), trade secrets remain confidential indefinitely if properly protected.

**Advantages:**
- ✅ No filing fees or registration required
- ✅ Protection lasts indefinitely (vs 20 years for patents)
- ✅ No public disclosure of technology
- ✅ Immediate protection (no waiting period)
- ✅ Low cost to maintain

**Disadvantages:**
- ❌ No protection if independently discovered
- ❌ Vulnerable to reverse engineering
- ❌ Can be lost if information becomes public
- ❌ Requires continuous effort to maintain secrecy

### Mintenance Trade Secrets

#### 1. MintAI Model Architecture & Algorithms

**Protected Information:**
- MintAI YOLO v11 model weights (2,847 UK-specific training samples)
- Knowledge distillation pipeline (cloud AI teacher → YOLO student)
- Multi-model Bayesian fusion algorithm (proprietary YOLO + Roboflow + SAM3)
- Hybrid inference routing logic (confidence-based edge/cloud selection)
- Confidence scoring methodology with Mondrian conformal prediction
- Safe-LUCB critic for automation decisions
- Scene graph construction algorithms

**Why Trade Secret:**
- Model weights represent months of training and refinement
- Routing thresholds (0.75, 0.55, 0.35) learned from production data
- Knowledge distillation pipeline is novel in property tech
- Difficult to reverse engineer from API responses
- Frequently updated/improved (patent would be obsolete)
- Competitive advantage: 91% cost reduction vs competitors

**Protection Measures:**
- ONNX model files encrypted in Supabase Storage
- Code obfuscation for client-side inference
- Server-side execution only for core algorithms
- Access controls (need-to-know basis)
- Model versioning with audit trail

#### 2. Continuum Memory System

**Protected Information:**
- 3-level memory hierarchy (high/mid/low frequency)
- Nested learning algorithm (M: K → V)
- Pattern extraction from historical data
- MLP backpropagation training
- Memory compression techniques

**Why Trade Secret:**
- Novel approach (no academic papers describing exact method)
- Proprietary training data amplifies value
- Continuous improvement from production data

**Protection Measures:**
- Internal documentation only (no public GitHub)
- Encrypted database storage
- API doesn't expose internal memory structure

#### 3. Agent Orchestration Logic

**Protected Information:**
- Decision routing between 13 specialized agents
- Confidence-based escalation thresholds
- Conflict resolution algorithms
- Self-modification capabilities
- Learning feedback loops

**Why Trade Secret:**
- Business logic specific to Mintenance workflows
- Competitive advantage from tuning over time
- Would be difficult to patent (software patents are hard in UK)

**Protection Measures:**
- Agent code in private repositories
- Microservice architecture (each agent isolated)
- Logging and monitoring with access controls

#### 4. Proprietary Training Data

**Protected Information:**
- 2,847+ labelled images of UK-specific property damage
- Cloud AI teacher labels as ground truth (knowledge distillation)
- SAM3 segmentation masks for pixel-level accuracy
- Contractor feedback annotations
- Job outcome data (estimated vs actual cost)
- Damage type classifications (17 UK-specific damage classes)
- Regional damage patterns (Greater Manchester, etc.)

**Why Trade Secret:**
- Data is more valuable than algorithms (models can be retrained)
- Competitors would need years to accumulate similar UK-specific dataset
- Quality of labels (cloud AI + SAM3 + expert verification) is unique
- Data flywheel: More jobs → Better MintAI → More users → More data

**Protection Measures:**
- Supabase Storage with encryption at rest
- Access controls (only ML engineer + founders)
- Data retention policies (30 days unless opt-in for training)
- GDPR-compliant data handling
- No data sharing with third parties
- Watermarking (TBD - add invisible markers to images)

#### 5. Pricing Algorithms

**Protected Information:**
- Location-based pricing adjustments (by postcode)
- Seasonal factors (region-specific)
- Complexity multipliers (damage type → price)
- Win probability calculation
- Competitive analysis methodology

**Why Trade Secret:**
- Directly impacts contractor success rates
- Trained on real job data (proprietary)
- Difficult to infer from external observations

**Protection Measures:**
- API returns only final price (not breakdown)
- No explanation of factors (black box to users)
- Database queries logged and monitored

### Trade Secret Legal Framework

#### Employment Agreements

**All Employees/Contractors Must Sign:**
1. **Confidentiality Agreement (NDA)**
   - Covers all proprietary information
   - Survives termination (5-year duration)
   - Liquidated damages for breach

2. **IP Assignment Clause**
   - All work product owned by company
   - Includes code, algorithms, designs, documentation
   - Retrospective assignment for pre-employment work

3. **Non-Compete Clause (if enforceable)**
   - 6-12 month restriction (UK courts are strict)
   - Limited to direct competitors in property tech + AI
   - Geographic scope: UK

**Cost:** £1,500 (legal review + templates)

#### Trade Secret Policy Document

**Contents:**
- Definition of confidential information
- Employee responsibilities
- Access controls (who can access what)
- Handling procedures (encryption, storage, transmission)
- Incident response (breach protocol)
- Audit procedures

**Cost:** £2,000 (legal drafting + consultation)

#### Regular Audits

**Quarterly Reviews:**
- Who has access to trade secrets?
- Are NDAs up to date?
- Have there been any breaches?
- Is information still confidential?

**Cost:** £500/year (internal process + legal review)

### Total Trade Secret Cost (18 Months)

- Initial setup (agreements + policy): £3,500
- Ongoing monitoring: £750
- **Total: £4,250**

**Ongoing (per year):** £1,000

---

## ™️ TRADEMARK PROTECTION

### Why Trademarks Matter

Trademarks protect brand identity (name, logo, tagline) and prevent competitors from confusing customers. Strong trademarks build brand equity and are valuable assets for acquisition.

### Mintenance Trademark Portfolio

#### 1. "MINTENANCE" Wordmark

**Classes:**
- **Class 9:** Mobile applications, software
- **Class 42:** Software as a service (SaaS), cloud computing

**Status:** Filed with UK IPO (20 December 2025)
**Cost:** £205 × 2 classes = £410
**Processing Time:** 3-4 months to registration
**Duration:** 10 years (renewable indefinitely)

**Why These Classes:**
- Class 9 covers downloadable software (mobile apps)
- Class 42 covers online services (web platform, AI services)

#### 2. Mintenance Logo (Graphical Mark)

**Design Elements:**
- Wordmark + icon (wrench + AI circuit)
- Color scheme (Navy #1E293B + Mint #14B8A6)

**Classes:** Class 9, Class 42 (same as wordmark)
**Cost:** £205 × 2 classes = £410
**Status:** Filed with UK IPO

**Why Logo Matters:**
- Visual brand recognition
- Prevents competitors from using similar designs
- Valuable for mobile app icons, marketing

#### 3. "MintAI" Wordmark (NEW)

**Classes:**
- **Class 9:** Computer software for artificial intelligence, machine learning software, mobile applications featuring AI
- **Class 42:** Software as a service (SaaS) featuring artificial intelligence for building damage assessment

**Status:** To be filed January 2026
**Cost:** £205 × 2 classes = £410
**Priority:** HIGH - Brand differentiation for proprietary AI system

**Why MintAI Trademark Matters:**
- Distinguishes proprietary AI from cloud API wrappers
- Investor communication ("powered by MintAI" vs "powered by GPT-4")
- Licensing potential (could license MintAI to other property tech companies)
- Brand equity separate from parent brand

#### 4. Tagline (Future)

**Options:**
- "Powered by MintAI"
- "Smart Home Repairs with AI"
- "Find Contractors Instantly"

**Status:** Not yet filed (defer to Series A)
**Cost:** £205 per class (£410 total)

**Recommendation:** Wait until tagline is finalised and used in marketing

### Trademark Registration Process

**Timeline:**
1. **Day 0:** File application with UK IPO (online)
2. **Day 7-14:** IPO acknowledges receipt
3. **Day 30-60:** Examination report (objections if any)
4. **Day 90:** Published for opposition (2-month window)
5. **Day 120:** Registration certificate (if no opposition)

**UK IPO Fee Increase (Feb 2026):**
- Current: £205 per class
- After 1 Feb 2026: £255 per class
- **Save £100 by filing before Feb 2026** ✅ Filed 20 Dec 2025

### International Trademark Strategy

#### Phase 1: UK Only (Seed Stage)
- Protect home market first
- Defer international until Series A

#### Phase 2: EU + US (Series A)
- **European Union Intellectual Property Office (EUIPO)**
  - One application covers all 27 EU countries
  - Cost: €850 for 1 class, €50 per additional class
  - Total: €950 (£815) for Classes 9 + 42

- **US Patent & Trademark Office (USPTO)**
  - Cost: $350 (£275) per class
  - Attorney fees: £1,500
  - Total: £2,050

**Total International (Phase 2):** £2,865

#### Phase 3: Global (Series B+)
- Madrid Protocol (international application)
- Covers 130+ countries
- Cost: £2,000-5,000 depending on countries

### Trademark Monitoring & Enforcement

**Monitoring Service:**
- Watch for similar trademark applications
- Alert if competitors file confusingly similar marks
- Cost: £400/year (WatchPro service)

**Enforcement:**
- Send cease & desist letters (£500-1,000)
- Opposition proceedings if needed (£2,000-5,000)
- Litigation (£20,000-100,000+ - avoid if possible)

### Total Trademark Cost (18 Months)

- UK trademark filing:
  - "Mintenance" (2 classes): £410
  - Mintenance logo (2 classes): £410
  - "MintAI" (2 classes): £410
  - **Subtotal**: £1,230
- Attorney fees (review + filing): £1,500
- Monitoring service (18 months): £600
- Domain portfolio (see below): £2,480
- **Total: £5,810**

**Ongoing (per year):** £1,400 (renewal + monitoring for 3 marks)

---

## 📝 COPYRIGHT PROTECTION

### What Copyright Covers

Copyright automatically protects "original works of authorship" including:
- Software source code
- UI/UX designs
- Website content (text, images)
- Documentation
- Marketing materials
- Videos, podcasts

**No registration required in UK** - copyright exists automatically upon creation.

### Mintenance Copyrighted Works

#### 1. Source Code

**Protected:**
- 100,000+ lines of TypeScript/JavaScript
- Mobile app code (React Native)
- AI/ML model code (Python)
- Database schemas and migrations
- Configuration files

**Ownership:**
- Company owns all code (via employment agreements)
- Open-source dependencies (see below)

**Duration:** Life of author + 70 years (or 70 years from creation for company-owned)

#### 2. UI/UX Designs

**Protected:**
- Figma design files
- Component library
- Design system documentation
- User flows
- Wireframes, mockups

**Ownership:** Company (via contracts with designers)

#### 3. Content & Marketing

**Protected:**
- Website copy
- Blog posts
- Email templates
- Social media posts
- Video scripts
- Podcast episodes (future)

**Ownership:** Company (or licensed from contractors)

### Copyright Registration (Optional)

**UK Copyright Registration:**
- Not legally required (automatic protection)
- Optional registration with Copyright Hub
- Cost: £50-200 per work
- Benefit: Timestamp proof of creation (for disputes)

**US Copyright Registration:**
- Required to sue in US courts
- Cost: $65 (£50) per work + attorney fees
- Benefit: Statutory damages + attorney fees in infringement cases

**Recommendation:** Register key works (core algorithms, unique UI designs)
- Cost: £500 for 5 most important works

### Open Source Compliance

**We Use Open Source Libraries:**
- Next.js, React, React Native (MIT License)
- Supabase client libraries (MIT License)
- TailwindCSS (MIT License)
- OpenAI SDK (Apache 2.0)

**Compliance Requirements:**
1. **MIT License:** Include license text in distribution, preserve copyright notices
2. **Apache 2.0:** Include license, preserve notices, state changes
3. **GPL (none used):** Would require open-sourcing our code (avoided)

**License Audit:**
- Use tools (FOSSA, WhiteSource) to detect all dependencies
- Cost: £1,000 one-time audit

**Mintenance License Strategy:**
- **Closed Source:** Core platform code (proprietary)
- **Open Source:** Developer tools, SDKs (when we build API ecosystem)
- **Dual License:** Possible future (free for non-commercial, paid for commercial)

### Total Copyright Cost (18 Months)

- Registration (5 key works): £500
- Open source audit: £1,000
- Legal review: £500
- **Total: £2,000**

**Ongoing (per year):** £200 (new works registration)

---

## 🌐 DOMAIN PORTFOLIO

### Primary Domains

**Secured:**
- ✅ mintenance.co.uk (primary UK domain)
- ✅ mintenance.com (international expansion)
- ✅ mintenance.ai (AI branding)
- ✅ mintenance.app (mobile app store links)

**Cost:**
- .co.uk: £10/year
- .com: £15/year
- .ai: £80/year
- .app: £20/year
- **Total:** £125/year

### Defensive Registrations

**To Prevent Cybersquatting:**
- mintenance.io (£15/year)
- mintenance.tech (£25/year)
- mintenance.uk (£10/year)

**Common Misspellings:**
- maintanance.co.uk (£10/year)
- maintenence.co.uk (£10/year)

**Social Media Variations:**
- getmintenance.com (£15/year)

**Total Defensive:** £100/year

### Premium Domain Acquisition

**Options:**
- Buy premium .com domain (e.g., homefixes.com, contractormatch.com)
- Cost: £5,000-50,000 depending on domain
- **Recommendation:** Defer to Series A (not critical for seed stage)

### Domain Monitoring

**Service:** DomainTools or MarkMonitor
**Purpose:** Alert if someone registers similar domains
**Cost:** £300/year

### Total Domain Cost (18 Months)

- Domain purchases (10 domains × 18 months): £2,100
- Premium domain budget: £0 (deferred)
- Monitoring service: £450
- **Total: £2,550**

**Ongoing (per year):** £300 (renewals + monitoring)

---

## ⚖️ PATENT STRATEGY (DEFERRED TO SERIES A)

### Why Defer Patents to Series A?

**Cost Considerations:**
- UK patent: £4,000-10,000 per patent
- International (PCT): £14,000+ per patent
- Total for 3 patents: £60,000-90,000

**Strategic Reasons:**
1. **Trade secrets are sufficient** for seed stage protection
2. **Patents take 2-3 years** to grant (by which time tech may evolve)
3. **Public disclosure** reveals our methods to competitors
4. **Better to patent after validation** (don't patent unproven ideas)

**When to File:**
- After Series A (£3M+ raised)
- When technology is proven and stable
- When international expansion is imminent

### Patent-Worthy Inventions

#### 1. AI-Powered Building Damage Assessment System

**Novel Aspects:**
- Multi-model fusion with Bayesian confidence scoring
- Hybrid inference routing (cloud vs edge decision logic)
- Conformal prediction for uncertainty quantification
- Real-time feedback loop for model improvement

**Prior Art Search:** £800
**Patent Attorney (Drafting):** £5,000
**UK IPO Fees:** £360
**First-Year Prosecution:** £2,000
**Total UK Patent:** £8,160

**International (PCT Application):**
- PCT filing: £3,500
- Translation fees (3 countries): £4,500
- Foreign filing: £6,000
- **Total International:** £14,000

**Total for Patent #1:** £22,160

#### 2. Continuum Memory Network for Multi-Agent Systems

**Novel Aspects:**
- 3-level memory hierarchy (high/mid/low frequency)
- Nested learning with compression (M: K → V)
- MLP backpropagation for pattern extraction
- Multi-frequency retrieval algorithm

**Cost:** Similar to Patent #1 (£22,160)

#### 3. Location-Aware Dynamic Pricing for Service Marketplaces

**Novel Aspects:**
- Postcode-level pricing adjustments
- Weather-aware pricing (seasonal + weather API integration)
- Competitor analysis integration
- Win probability calculation

**Cost:** Similar to Patent #1 (£22,160)

### Total Patent Cost (If Filed Now)

- 3 UK patents: £24,480
- 3 PCT applications: £42,000
- **Total: £66,480**

**Recommendation:** Defer to Series A, save £66,480 in seed stage

---

## 🛡️ IP PROTECTION MEASURES

### Technical Measures

#### 1. Code Obfuscation
- Minify JavaScript/TypeScript in production
- Obfuscate critical algorithms
- **Tool:** webpack-obfuscator
- **Cost:** £0 (open source)

#### 2. API Security
- Rate limiting (prevent scraping)
- Authentication (API keys, JWT)
- HTTPS only (prevent man-in-the-middle)
- **Cost:** Included in infrastructure

#### 3. Model Protection
- Server-side inference only (no model downloads)
- Encrypted model files (ONNX encrypted)
- Watermarking outputs (TBD)
- **Cost:** £500 (watermarking implementation)

#### 4. Database Encryption
- Encryption at rest (Supabase native)
- Encryption in transit (TLS)
- Row-level security (RLS policies)
- **Cost:** Included in Supabase

#### 5. Access Controls
- Need-to-know basis (not all engineers see all code)
- Multi-factor authentication (2FA)
- Audit logs (who accessed what, when)
- **Cost:** £100/month (tools like Teleport)

### Legal Measures

#### 1. Employment Agreements
- IP assignment clause (all work product owned by company)
- Confidentiality agreement (5-year post-termination)
- Non-compete (6-12 months, limited scope)
- **Cost:** £1,500 (legal review + templates)

#### 2. Contractor Agreements
- Work-for-hire clause (company owns IP)
- NDA (confidentiality)
- Limited access (only to necessary information)
- **Cost:** £500 (templates)

#### 3. Partner Agreements
- Data sharing restrictions
- No reverse engineering clause
- Confidentiality terms
- **Cost:** £1,000 per partnership (legal review)

#### 4. Terms of Service & Privacy Policy
- IP ownership clause (user content vs platform IP)
- Reverse engineering prohibition
- Scraping/crawling prohibition
- **Cost:** £3,000 (GDPR-compliant legal drafting)

### Organizational Measures

#### 1. IP Committee
- Founders + Lead Engineer + Legal Advisor
- Quarterly review of IP assets
- Identify new inventions (invention disclosures)
- Decide what to protect (trade secret vs patent)
- **Cost:** £0 (internal time)

#### 2. Invention Disclosure Process
- Engineer submits disclosure form
- Committee reviews within 30 days
- Decision: Trade secret, patent, or publish
- **Cost:** £0 (internal process)

#### 3. Document Everything
- Design documents (why we made this choice)
- Meeting notes (who invented what, when)
- Code commits (git history is evidence)
- Dated records (for patent priority dates)
- **Cost:** £0 (good practice)

#### 4. Training
- All employees trained on IP policies
- Annual refresher (confidentiality, IP assignment)
- Exit interviews (return of materials, reminder of NDA)
- **Cost:** £500/year (training materials)

### Total Protection Measures Cost (18 Months)

- Code obfuscation: £0
- Model protection: £500
- Access controls: £1,800
- Employment agreements: £2,000
- Terms of service: £3,000
- Training: £750
- **Total: £8,050**

**Ongoing (per year):** £3,000

---

## 📊 IP ASSET VALUATION

### Current IP Value (Conservative)

| Asset | Valuation | Notes |
|-------|-----------|-------|
| **Trade Secrets** | £550,000 | MintAI model weights, knowledge distillation pipeline, 2,847 UK training samples, routing algorithms |
| **Trademarks** | £65,000 | Mintenance + MintAI brand recognition (early stage, 2 brands) |
| **Copyright** | £100,000 | 100K+ lines of code, designs |
| **Domains** | £5,000 | mintenance.co.uk, .com, .ai + mintai.* portfolio |
| **Total** | **£720,000** | ~14% of £5M pre-money valuation |

### Future IP Value (Post-Series A)

| Asset | Valuation | Notes |
|-------|-----------|-------|
| **Trade Secrets** | £2,200,000 | MintAI proven at 92% accuracy, 10K+ UK training samples, 91% cost reduction demonstrated |
| **Patents** | £1,200,000 | 4 granted patents (MintAI knowledge distillation, hybrid routing, Bayesian fusion, Continuum memory) |
| **Trademarks** | £600,000 | Established Mintenance + MintAI brands (UK + EU + US) |
| **Copyright** | £350,000 | Platform code + content + AI model documentation |
| **Domains** | £15,000 | Portfolio + premium domains (mintai.com, mintai.ai) |
| **Total** | **£4,365,000** | ~12-15% of £30M+ Series A valuation |

### IP as Exit Value Driver

**Acquisition Scenarios:**
- **Technology Acquisition:** IP is 60-80% of purchase price
- **Acqui-Hire:** IP is 30-50% of purchase price
- **Strategic Acquisition:** IP is 40-60% of purchase price

**Example:** £60M exit
- Platform/users: £25M (40%)
- Team: £10M (17%)
- **IP assets: £25M (42%)**

**Conclusion:** IP protection directly impacts exit value by £10M-25M

---

## ✅ IP STRATEGY SUMMARY

### Seed Stage (Current - 18 Months)

| Category | Actions | Cost |
|----------|---------|------|
| **Trade Secrets** | NDAs, IP policy, access controls | £5,000 |
| **Trademarks** | UK filing (2 marks × 2 classes) | £3,015 |
| **Copyright** | Registration (5 works), audit | £2,000 |
| **Domains** | 10 domains, monitoring | £2,480 |
| **Patents** | ❌ Deferred to Series A | £0 |
| **TOTAL** | - | **£12,495** |

### Series A (Future - 18+ Months)

| Category | Actions | Cost |
|----------|---------|------|
| **Trade Secrets** | Ongoing monitoring | £2,000/year |
| **Trademarks** | EU + US filing, monitoring | £3,500 |
| **Copyright** | Ongoing registrations | £500/year |
| **Domains** | Premium acquisition | £5,000-20,000 |
| **Patents** | 3 patents (UK + PCT) | £66,480 |
| **TOTAL** | - | **£77,480** |

### Recommendations

**Immediate (Week 1):**
1. ✅ File UK trademarks (done 20 Dec 2025)
2. ✅ Implement trade secret policy
3. ✅ Update employment agreements (IP assignment)

**Month 1-3:**
4. ✅ Copyright registration (5 key works)
5. ✅ Open source license audit
6. ✅ Domain portfolio secured

**Month 3-6:**
7. ✅ Quarterly IP committee meetings
8. ✅ Invention disclosure process
9. ✅ Employee IP training

**Series A Prep (Month 12-18):**
10. ⏳ Identify patent-worthy inventions
11. ⏳ Prior art searches (£800 × 3 = £2,400)
12. ⏳ Prepare patent applications (draft claims)

**Post-Series A:**
13. ⏳ File 3 UK patents
14. ⏳ PCT applications (international protection)
15. ⏳ EU + US trademark expansion

---

## 📞 NEXT STEPS

1. **Legal Review** - Engage IP solicitor for agreement templates
2. **Trademark Filing** - Complete UK IPO applications (done)
3. **Policy Documentation** - Draft trade secret policy
4. **Employee Training** - IP orientation for all team members
5. **Quarterly Reviews** - IP committee meetings (founders + legal)

---

**Document Prepared By:** Mintenance IP Strategy Team
**Date:** 20 December 2025
**Location:** Greater Manchester, UK
**Status:** Board-Approved Strategy

**Legal Disclaimer:** This document is for internal planning only and does not constitute legal advice. Consult with qualified IP solicitors before making final decisions.
