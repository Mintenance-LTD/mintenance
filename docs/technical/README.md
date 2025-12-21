# Technical Documentation

Comprehensive technical documentation for the Mintenance platform covering architecture, APIs, security, deployment, and more.

## 📂 Contents

### [ai/](ai/) - AI & Machine Learning
MintAI proprietary system, YOLO training, SAM3 integration, hybrid inference.

**Key Documents:**
- [AI Algorithm Technical Overview](ai/AI_ALGORITHM_TECHNICAL_OVERVIEW.md) - 40-page deep-dive into MintAI
- [AI Flows and Use Cases](ai/AI_FLOWS_AND_USE_CASES.md) - User flows and ML pipelines
- [Continuous Learning Guide](ai/CONTINUOUS_LEARNING_GUIDE.md) - Model retraining and improvement
- [SAM3 Presence Detection](ai/SAM3_PRESENCE_DETECTION_GUIDE.md) - Object detection integration

### [api/](api/) - API Documentation
REST API endpoints, schemas, request/response formats.

**Key Documents:**
- [API Documentation](api/API_DOCUMENTATION.md) - Complete API reference
- [API Endpoints](api/API_ENDPOINTS.md) - Endpoint inventory
- [Backend Embeddings API](api/BACKEND_EMBEDDINGS_API.md) - Vector search
- [Payment API Documentation](api/PAYMENT_API_DOCUMENTATION.md) - Stripe integration

### [architecture/](architecture/) - System Architecture
System design, component structure, routing, dependencies.

**Key Documents:**
- [Technical Architecture](architecture/TECHNICAL_ARCHITECTURE.md) - Overall system design
- [Auth Architecture](architecture/AUTH_ARCHITECTURE_EXPLAINED.md) - JWT + Supabase auth
- [Routing Structure](architecture/ROUTING_STRUCTURE.md) - Next.js App Router
- [Dependency Management](architecture/DEPENDENCY_MANAGEMENT.md) - Package dependencies

### [database/](database/) - Database
PostgreSQL schema, Supabase migrations, RLS policies.

**Key Documents:**
- [Migration Guide](database/MIGRATION_GUIDE.md) - Database migration strategy
- [Manual Migration Instructions](database/MANUAL_MIGRATION_INSTRUCTIONS.md) - Step-by-step guide

### [deployment/](deployment/) - Deployment & DevOps
Deployment guides, CI/CD pipelines, infrastructure.

**Key Documents:**
- [Deployment Guide](deployment/DEPLOYMENT_GUIDE.md) - Production deployment
- [Pre-Deployment Checklist](deployment/PRE_DEPLOYMENT_CHECKLIST.md) - **CRITICAL** checklist
- [GitHub CI/CD Guide](deployment/GITHUB_CI_CD_GUIDE.md) - Automated pipelines
- [Redis Setup Guide](deployment/REDIS_SETUP_GUIDE.md) - Redis configuration

### [security/](security/) - Security
Security implementations, fixes, and remediation plans.

**Key Documents:**
- [Security Remediation Plan](../../SECURITY_REMEDIATION_PLAN.md) - **CRITICAL** 15-action plan
- [Critical Security Fixes](security/CRITICAL_SECURITY_FIXES.md) - High-priority fixes
- [Security Implementation Summary](security/SECURITY_IMPLEMENTATION_SUMMARY.md)

### [testing/](testing/) - Testing & QA
Test strategies, examples, CI/CD integration.

**Key Documents:**
- [Testing Guide](testing/TESTING_GUIDE.md) - Comprehensive testing strategy
- [Testing Quick Start](testing/TESTING_QUICK_START.md) - Get started with tests
- [Manual Testing Checklist](testing/MANUAL_TESTING_CHECKLIST.md) - Pre-release testing

### [integrations/](integrations/) - Third-Party Integrations
Stripe, Supabase, Google Maps, Twilio, etc.

**Key Documents:**
- [Stripe Connect Setup](integrations/STRIPE_CONNECT_SETUP_GUIDE.md) - Marketplace payments
- [Stripe Webhook Setup](integrations/STRIPE_WEBHOOK_SETUP.md) - Event handling
- [Google Maps Setup](integrations/GOOGLE_MAPS_SETUP.md) - Location services
- [Supabase SMS Setup](integrations/SUPABASE_SMS_SETUP.md) - SMS notifications

## 🛠️ Technology Stack

**Frontend:**
- Next.js 16.0.4 (App Router)
- React 19
- TypeScript 5.3
- Tailwind CSS 3.4

**Mobile:**
- React Native 0.76.1
- Expo 52
- React Navigation 7

**Backend:**
- Supabase (PostgreSQL + Auth + Storage)
- Vercel Edge Functions
- Redis (rate limiting, caching)

**AI/ML:**
- MintAI (YOLO v11 + knowledge distillation)
- SAM3 (segmentation)
- Roboflow (supplementary detection)
- OpenAI GPT-4 Vision (training only)

**Infrastructure:**
- Vercel (web hosting)
- Supabase (database, auth, storage)
- Upstash Redis (serverless Redis)
- AWS S3 (backups)

## 🔐 Security

**Authentication:**
- JWT tokens (web)
- Supabase Auth (mobile)
- MFA support (TOTP)

**Data Protection:**
- Row Level Security (RLS)
- Environment variable encryption
- Secrets rotation

**API Security:**
- Rate limiting (Redis)
- CSRF protection
- Input validation
- SQL injection prevention

## 📊 Performance

**Web App:**
- Lighthouse Score: 90+
- LCP: <2.5s
- FID: <100ms
- CLS: <0.1

**Mobile App:**
- Startup time: <2.5s
- Memory usage: <150MB
- FPS: 60fps (stable)

**AI Inference:**
- Edge: <200ms (70% of requests)
- Hybrid: <500ms (25% of requests)
- Cloud: <800ms (5% of requests)

## 🚀 Quick Links

**Development:**
- [Quick Start](../../QUICK_START_GUIDE.md)
- [Tech Stack](../../MINTENANCE_TECH_STACK.md)

**Deployment:**
- [Deployment Guide](deployment/DEPLOYMENT_GUIDE.md)
- [CI/CD Setup](deployment/GITHUB_CI_CD_GUIDE.md)

**Security:**
- [Security Remediation Plan](../../SECURITY_REMEDIATION_PLAN.md) ⚠️

**Testing:**
- [Testing Guide](testing/TESTING_GUIDE.md)
- [Manual Checklist](testing/MANUAL_TESTING_CHECKLIST.md)

## 📅 Maintenance

**Last Updated**: 20 December 2025
**Next Review**: March 2026 (quarterly)
**Maintained By**: Engineering Team
