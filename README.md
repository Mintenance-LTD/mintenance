# 🏠 Mintenance - Contractor Discovery Marketplace

A comprehensive contractor discovery platform connecting homeowners with verified service providers for home maintenance jobs.

## 🚀 Project Status

**Current Version**: 1.2.3  
**Status**: Production Ready  
**Deployment**: Ready for mintenance.co.uk

### ✅ Completed Features
- **Monorepo Architecture**: Clean separation of web and mobile apps
- **Authentication**: JWT-based web auth + Supabase mobile auth
- **Security**: Comprehensive security headers, rate limiting, input validation
- **Performance**: Optimized builds, caching, image optimization
- **Testing**: E2E tests with Playwright, comprehensive test coverage
- **Deployment**: Vercel configuration with CI/CD pipeline

## 📱 Platform Support

### Web App (Next.js)
- **URL**: https://mintenance.co.uk
- **Features**: JWT authentication, contractor discovery, job management
- **Tech Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS

### Mobile App (React Native)
- **Platforms**: iOS & Android
- **Features**: Supabase auth, real-time messaging, offline support
- **Tech Stack**: React Native, Expo SDK 53, Supabase

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (for mobile development)

### Quick Start
```bash
# Install dependencies
npm install

# Start web app (default)
npm run dev

# Start mobile app
npm run dev:mobile

# Build everything
npm run build
```

### Environment Variables
Create `.env.local` for web app:
```env
# Required
JWT_SECRET=your-strong-jwt-secret-minimum-32-characters
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional
NEXT_PUBLIC_APP_URL=https://mintenance.co.uk
STRIPE_SECRET_KEY=sk_live_your-stripe-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-key
```

## 🚀 Deployment

### Web Deployment (Vercel)
```bash
# Deploy to Vercel
vercel --prod

# Verify deployment
npm run deploy:verify
```

### Mobile Deployment (EAS)
```bash
# Build for production
eas build --platform all --profile production

# Submit to app stores
eas submit --platform all
```

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm run test

# E2E tests
npm run e2e

# E2E with UI
npm run e2e:ui
```

### Test Coverage
- **Unit Tests**: 80%+ coverage
- **E2E Tests**: Cross-browser testing (Chrome, Firefox, Safari)
- **Mobile Tests**: iOS and Android compatibility

## 🔒 Security Features

- **Authentication**: Secure JWT tokens with HTTP-only cookies
- **Rate Limiting**: 5 attempts per 15 minutes with lockout
- **Input Validation**: Comprehensive sanitization and validation
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc.
- **Environment Security**: Server-side secrets, no client exposure

## 📊 Performance

- **Web App**: <3s startup time, optimized images, caching
- **Mobile App**: <2s startup, offline support, efficient memory usage
- **Bundle Size**: <20MB optimized builds
- **Core Web Vitals**: 90+ Lighthouse score

## 🏗️ Architecture

```
mintenance/
├── apps/
│   ├── web/          # Next.js Web App
│   └── mobile/       # React Native App
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── auth/         # Authentication utilities
│   └── shared/       # Common utilities
└── e2e/              # End-to-end tests
```

## 📚 Documentation

- **Deployment Guide**: `DEPLOYMENT_INSTRUCTIONS.md`
- **Post-Deployment**: `POST_DEPLOYMENT_CHECKLIST.md`
- **Changelog**: `CHANGELOG.md`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test && npm run e2e`
5. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For technical issues or questions:
- Check the deployment checklist
- Review the changelog for recent changes
- Run the verification script: `npm run deploy:verify`
