# 🏠 Mintenance -  Maintenance Booking App

A clean, focused React Native app that connects homeowners with contractors for maintenance jobs. Built with modern best practices and **ready for production deployment**.

## 📊 **CURRENT STATUS: READY FOR DEPLOYMENT**
- ✅ **Test Coverage**: 21.56% overall, core services thoroughly tested
- ✅ **Build Infrastructure**: Complete EAS configuration for all platforms
- ✅ **Credential Setup**: Comprehensive guides and validation tools
- ✅ **Asset Generation**: Automated asset creation for builds
- ✅ **Production Documentation**: Complete deployment and troubleshooting guides

## ⚡ **QUICK START**

### **Build Immediately**
```bash
# Generate required assets
npm run generate-assets

# Start development
npm start

# Build for testing
eas build --platform all --profile development
```

### **Deploy to Production**
1. Follow `DEPLOYMENT_READY_GUIDE.md` for complete setup
2. Validate: `npm run validate-credentials`  
3. Build: `eas build --platform all --profile production-store`
4. Submit: `eas submit --platform all --profile production`

## 🚀 Features

### Core Functionality
- **User Authentication** - Secure login/registration with role-based access (Homeowner/Contractor)
- **Job Management** - Post, browse, and manage maintenance jobs
- **Bidding System** - Contractors submit bids, homeowners accept offers
- **Real-time Updates** - Live notifications for job updates and new bids
- **Escrow Payments** - Secure payment processing with Stripe integration
- **Responsive Design** - Optimized for both phones and tablets

### Technical Features
- **Production-ready architecture** - Clean, maintainable codebase
- **Error handling** - Comprehensive error boundaries and user feedback
- **TypeScript** - Full type safety throughout the application
- **Real-time subscriptions** - Supabase Realtime for live updates
- **Secure data storage** - Row Level Security (RLS) policies
- **Mobile-optimized** - Fast startup, small bundle size

## 🏗️ Architecture

**Screens (8 total):**
- Authentication: `LoginScreen`, `RegisterScreen`
- Core: `HomeScreen`, `JobsScreen`, `ProfileScreen`
- Workflows: `JobPostingScreen`, `JobDetailsScreen`, `BidSubmissionScreen`

**Services (4 focused services):**
- `AuthService` - Authentication with Supabase
- `JobService` - Job and bid management
- `RealtimeService` - Live updates and subscriptions
- `PaymentService` - Stripe escrow payments

**Database Schema:**
- Users, Jobs, Bids, EscrowTransactions tables
- Row Level Security policies
- Real-time subscriptions enabled

## 📱 Performance Targets

- **App size:** <15MB (vs 50-100MB over-engineered apps)
- **Startup time:** <3 seconds
- **Memory usage:** <50MB base
- **Build time:** <5 minutes

## 🛠️ Quick Start

### Automated Setup
**Windows:**
```cmd
scripts\setup.bat
```

**macOS/Linux:**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Manual Setup
1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment:**
   ```bash
   cp .env.example .env
   # Update .env with your Supabase credentials
   ```

3. **Setup database:**
   - Run `supabase-setup.sql` in your Supabase SQL editor

4. **Start development:**
   ```bash
   npm start
   ```

## 🚀 Deployment

### Mobile Builds
```bash
# Development build
eas build --profile development --platform android

# Production build  
eas build --profile production --platform android

# App store build
eas build --profile production-store --platform ios
```

### Using Build Scripts
```bash
# Windows
scripts\build.bat production android

# macOS/Linux
./scripts/build.sh production ios
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide.

## 🗄️ Database Setup

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL script in `supabase-setup.sql`
3. Enable Realtime for `jobs`, `bids`, `escrow_transactions` tables
4. Configure authentication settings

## 📦 Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React context providers
├── hooks/              # Custom React hooks
├── navigation/         # Navigation configuration
├── screens/            # App screens
├── services/           # API and business logic
├── types/              # TypeScript type definitions
└── utils/              # Utility functions

scripts/                # Deployment and setup scripts
supabase-setup.sql     # Database schema
```

## 🔧 Environment Variables

```bash
# Supabase (Required)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Stripe (Optional - for payments)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_SECRET_KEY=sk_test_your-secret-key
```

## 🧪 Testing

```bash
# Run development server
npm start

# Run on Android
npm run android

# Run on iOS  
npm run ios

# Run on web
npm run web
```

## 🤝 Contributing

This app demonstrates clean architecture principles:

1. **Focused services** - Each service has a single responsibility
2. **Clean separation** - UI, business logic, and data layers are separate
3. **Type safety** - TypeScript throughout for better development experience
4. **Production ready** - Error handling, security, and performance optimized

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Documentation:** [DEPLOYMENT.md](DEPLOYMENT.md)
- **Issues:** GitHub Issues
- **Architecture:** Clean, focused codebase prioritizing user value over complexity

---

**Built with:** React Native, Expo, Supabase, TypeScript, Stripe
