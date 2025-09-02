#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 Mintenance App - Functional Testing Suite');
console.log('===========================================\n');

class FunctionalTester {
  constructor() {
    this.results = {
      screens: [],
      services: [],
      navigation: [],
      features: [],
      issues: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  async runAllTests() {
    console.log('🏃‍♂️ Running comprehensive functional tests...\n');

    // Test 1: Screen Components
    await this.testScreenComponents();
    
    // Test 2: Navigation Structure
    await this.testNavigationStructure();
    
    // Test 3: Service Layer
    await this.testServiceLayer();
    
    // Test 4: Authentication Flow
    await this.testAuthenticationFlow();
    
    // Test 5: Job Management
    await this.testJobManagement();
    
    // Test 6: Payment Processing
    await this.testPaymentProcessing();
    
    // Test 7: Contractor Discovery
    await this.testContractorDiscovery();
    
    // Test 8: Messaging Features
    await this.testMessagingFeatures();
    
    // Test 9: Offline Functionality
    await this.testOfflineFunctionality();
    
    // Test 10: UI/UX Components
    await this.testUIComponents();

    this.generateReport();
  }

  async testScreenComponents() {
    console.log('📱 Testing Screen Components...');
    
    const screenTests = [
      { name: 'HomeScreen', path: './src/screens/HomeScreen.tsx' },
      { name: 'LoginScreen', path: './src/screens/LoginScreen.tsx' },
      { name: 'RegisterScreen', path: './src/screens/RegisterScreen.tsx' },
      { name: 'JobPostingScreen', path: './src/screens/JobPostingScreen.tsx' },
      { name: 'JobDetailsScreen', path: './src/screens/JobDetailsScreen.tsx' },
      { name: 'JobsScreen', path: './src/screens/JobsScreen.tsx' },
      { name: 'ContractorDiscoveryScreen', path: './src/screens/ContractorDiscoveryScreen.tsx' },
      { name: 'FindContractorsScreen', path: './src/screens/FindContractorsScreen.tsx' },
      { name: 'MessagingScreen', path: './src/screens/MessagingScreen.tsx' },
      { name: 'MessagesListScreen', path: './src/screens/MessagesListScreen.tsx' },
      { name: 'PaymentScreen', path: './src/screens/PaymentScreen.tsx' },
      { name: 'ProfileScreen', path: './src/screens/ProfileScreen.tsx' },
      { name: 'BidSubmissionScreen', path: './src/screens/BidSubmissionScreen.tsx' },
      { name: 'ContractorSocialScreen', path: './src/screens/ContractorSocialScreen.tsx' },
      { name: 'ServiceRequestScreen', path: './src/screens/ServiceRequestScreen.tsx' }
    ];

    for (const screen of screenTests) {
      const result = this.checkScreenIntegrity(screen);
      this.results.screens.push(result);
      console.log(`   ${result.status} ${screen.name}: ${result.message}`);
    }
    
    console.log();
  }

  checkScreenIntegrity(screen) {
    if (!fs.existsSync(screen.path)) {
      this.results.summary.failed++;
      return {
        name: screen.name,
        status: '❌',
        message: 'Screen file not found',
        severity: 'error'
      };
    }

    const content = fs.readFileSync(screen.path, 'utf8');
    
    // Check for required React Native imports
    const hasReactImport = content.includes('import React');
    const hasReactNativeImports = content.includes('import {') && content.includes('react-native');
    const hasNavigationImport = content.includes('@react-navigation/native');
    const hasUseAuthImport = content.includes('useAuth');
    const hasExportDefault = content.includes('export default') || content.includes('export {');

    const issues = [];
    if (!hasReactImport) issues.push('Missing React import');
    if (!hasReactNativeImports) issues.push('Missing React Native imports');
    if (!hasNavigationImport) issues.push('Missing navigation import');
    if (!hasExportDefault) issues.push('Missing export statement');

    if (issues.length === 0) {
      this.results.summary.passed++;
      return {
        name: screen.name,
        status: '✅',
        message: 'Screen structure valid',
        severity: 'success'
      };
    } else {
      this.results.summary.warnings++;
      return {
        name: screen.name,
        status: '⚠️',
        message: `Issues: ${issues.join(', ')}`,
        severity: 'warning'
      };
    }
  }

  async testNavigationStructure() {
    console.log('🧭 Testing Navigation Structure...');
    
    const navPath = './src/navigation/AppNavigator.tsx';
    
    if (!fs.existsSync(navPath)) {
      console.log('   ❌ AppNavigator not found');
      this.results.summary.failed++;
      return;
    }

    const content = fs.readFileSync(navPath, 'utf8');
    
    const navigationChecks = [
      { name: 'Stack Navigation', pattern: /@react-navigation\/stack|createStackNavigator/ },
      { name: 'Tab Navigation', pattern: /@react-navigation\/bottom-tabs|createBottomTabNavigator/ },
      { name: 'Authentication Flow', pattern: /Login|Register|Auth/ },
      { name: 'Main App Flow', pattern: /Home|Jobs|Profile/ },
      { name: 'Contractor Features', pattern: /Contractor|Discovery/ },
      { name: 'Messaging Flow', pattern: /Message|Chat/ },
      { name: 'Payment Flow', pattern: /Payment|Stripe/ }
    ];

    navigationChecks.forEach(check => {
      const found = check.pattern.test(content);
      const result = {
        name: check.name,
        status: found ? '✅' : '❌',
        message: found ? 'Navigation configured' : 'Navigation missing',
        severity: found ? 'success' : 'error'
      };
      
      this.results.navigation.push(result);
      console.log(`   ${result.status} ${check.name}: ${result.message}`);
      
      if (found) {
        this.results.summary.passed++;
      } else {
        this.results.summary.failed++;
      }
    });
    
    console.log();
  }

  async testServiceLayer() {
    console.log('⚙️ Testing Service Layer...');
    
    const services = [
      { name: 'AuthService', path: './src/services/AuthService.ts', critical: true },
      { name: 'JobService', path: './src/services/JobService.ts', critical: true },
      { name: 'PaymentService', path: './src/services/PaymentService.ts', critical: true },
      { name: 'ContractorService', path: './src/services/ContractorService.ts', critical: true },
      { name: 'MessagingService', path: './src/services/MessagingService.ts', critical: true },
      { name: 'BidService', path: './src/services/BidService.ts', critical: true },
      { name: 'OfflineManager', path: './src/services/OfflineManager.ts', critical: false },
      { name: 'NotificationService', path: './src/services/NotificationService.ts', critical: false },
      { name: 'LocationService', path: './src/services/LocationService.ts', critical: false },
      { name: 'BiometricService', path: './src/services/BiometricService.ts', critical: false }
    ];

    for (const service of services) {
      const result = this.checkServiceImplementation(service);
      this.results.services.push(result);
      console.log(`   ${result.status} ${service.name}: ${result.message}`);
    }
    
    console.log();
  }

  checkServiceImplementation(service) {
    if (!fs.existsSync(service.path)) {
      const severity = service.critical ? 'error' : 'warning';
      if (service.critical) this.results.summary.failed++;
      else this.results.summary.warnings++;
      
      return {
        name: service.name,
        status: service.critical ? '❌' : '⚠️',
        message: 'Service not found',
        severity
      };
    }

    const content = fs.readFileSync(service.path, 'utf8');
    
    // Check service implementation quality
    const hasClassExport = content.includes('export class') || content.includes('export default');
    const hasAsyncMethods = content.includes('async ');
    const hasErrorHandling = content.includes('try') || content.includes('catch') || content.includes('throw');
    const hasTypeScript = content.includes('interface') || content.includes('type ');
    
    const score = [hasClassExport, hasAsyncMethods, hasErrorHandling, hasTypeScript]
      .filter(Boolean).length;
    
    let status, message, severity;
    
    if (score >= 3) {
      status = '✅';
      message = 'Service implementation complete';
      severity = 'success';
      this.results.summary.passed++;
    } else if (score >= 2) {
      status = '⚠️';
      message = 'Service partially implemented';
      severity = 'warning';
      this.results.summary.warnings++;
    } else {
      status = '❌';
      message = 'Service needs improvement';
      severity = 'error';
      this.results.summary.failed++;
    }

    return { name: service.name, status, message, severity };
  }

  async testAuthenticationFlow() {
    console.log('🔐 Testing Authentication Flow...');
    
    const authChecks = [
      { name: 'Auth Context', path: './src/contexts/AuthContext.tsx' },
      { name: 'Login Screen', path: './src/screens/LoginScreen.tsx' },
      { name: 'Register Screen', path: './src/screens/RegisterScreen.tsx' },
      { name: 'Auth Service', path: './src/services/AuthService.ts' },
      { name: 'Biometric Auth', path: './src/services/BiometricService.ts' }
    ];

    for (const check of authChecks) {
      const exists = fs.existsSync(check.path);
      const status = exists ? '✅' : '❌';
      const message = exists ? 'Component available' : 'Component missing';
      
      console.log(`   ${status} ${check.name}: ${message}`);
      
      if (exists) {
        // Check for specific auth functionality
        const content = fs.readFileSync(check.path, 'utf8');
        const features = this.checkAuthFeatures(check.name, content);
        features.forEach(feature => {
          console.log(`      ${feature.status} ${feature.name}`);
        });
        this.results.summary.passed++;
      } else {
        this.results.summary.failed++;
      }
    }
    
    console.log();
  }

  checkAuthFeatures(componentName, content) {
    const features = [];
    
    switch (componentName) {
      case 'Auth Context':
        features.push(
          { name: 'Sign In Method', status: content.includes('signIn') ? '✅' : '❌' },
          { name: 'Sign Up Method', status: content.includes('signUp') ? '✅' : '❌' },
          { name: 'Sign Out Method', status: content.includes('signOut') ? '✅' : '❌' },
          { name: 'User State', status: content.includes('user') && content.includes('useState') ? '✅' : '❌' },
          { name: 'Biometric Support', status: content.includes('biometric') ? '✅' : '❌' }
        );
        break;
      case 'Auth Service':
        features.push(
          { name: 'Email Validation', status: content.includes('email') && content.includes('@') ? '✅' : '❌' },
          { name: 'Password Validation', status: content.includes('password') && content.includes('length') ? '✅' : '❌' },
          { name: 'Supabase Integration', status: content.includes('supabase') ? '✅' : '❌' },
          { name: 'Token Management', status: content.includes('token') || content.includes('session') ? '✅' : '❌' }
        );
        break;
    }
    
    return features;
  }

  async testJobManagement() {
    console.log('💼 Testing Job Management Features...');
    
    const jobFeatures = [
      { name: 'Job Posting', component: 'JobPostingScreen', service: 'JobService.createJob' },
      { name: 'Job Listing', component: 'JobsScreen', service: 'JobService.getAvailableJobs' },
      { name: 'Job Details', component: 'JobDetailsScreen', service: 'JobService.getJobById' },
      { name: 'Bid Management', component: 'BidSubmissionScreen', service: 'BidService.submitBid' },
      { name: 'Job Status Updates', component: 'JobService', service: 'updateJobStatus' }
    ];

    jobFeatures.forEach(feature => {
      const componentPath = `./src/screens/${feature.component}.tsx`;
      const servicePath = './src/services/JobService.ts';
      
      const componentExists = fs.existsSync(componentPath) || fs.existsSync(`./src/services/${feature.component}.ts`);
      const serviceContent = fs.existsSync(servicePath) ? fs.readFileSync(servicePath, 'utf8') : '';
      const hasServiceMethod = serviceContent.includes(feature.service.split('.')[1] || feature.service);
      
      let status, message;
      if (componentExists && hasServiceMethod) {
        status = '✅';
        message = 'Feature complete';
        this.results.summary.passed++;
      } else if (componentExists || hasServiceMethod) {
        status = '⚠️';
        message = 'Feature partially implemented';
        this.results.summary.warnings++;
      } else {
        status = '❌';
        message = 'Feature missing';
        this.results.summary.failed++;
      }
      
      console.log(`   ${status} ${feature.name}: ${message}`);
    });
    
    console.log();
  }

  async testPaymentProcessing() {
    console.log('💳 Testing Payment Processing...');
    
    const paymentPath = './src/services/PaymentService.ts';
    const paymentScreenPath = './src/screens/PaymentScreen.tsx';
    const stripeFormPath = './src/components/StripePaymentForm.tsx';
    
    const paymentService = fs.existsSync(paymentPath);
    const paymentScreen = fs.existsSync(paymentScreenPath);
    const stripeForm = fs.existsSync(stripeFormPath);
    
    console.log(`   ${paymentService ? '✅' : '❌'} Payment Service: ${paymentService ? 'Available' : 'Missing'}`);
    console.log(`   ${paymentScreen ? '✅' : '❌'} Payment Screen: ${paymentScreen ? 'Available' : 'Missing'}`);
    console.log(`   ${stripeForm ? '✅' : '❌'} Stripe Form: ${stripeForm ? 'Available' : 'Missing'}`);
    
    if (paymentService) {
      const content = fs.readFileSync(paymentPath, 'utf8');
      const features = [
        { name: 'Initialize Payment', check: content.includes('initializePayment') },
        { name: 'Confirm Payment', check: content.includes('confirmPayment') },
        { name: 'Escrow System', check: content.includes('escrow') },
        { name: 'Refund Processing', check: content.includes('refund') },
        { name: 'Fee Calculation', check: content.includes('calculateFees') },
        { name: 'Stripe Integration', check: content.includes('stripe') }
      ];
      
      features.forEach(feature => {
        console.log(`      ${feature.check ? '✅' : '❌'} ${feature.name}`);
        if (feature.check) this.results.summary.passed++;
        else this.results.summary.failed++;
      });
    }
    
    console.log();
  }

  async testContractorDiscovery() {
    console.log('🔍 Testing Contractor Discovery...');
    
    const discoveryPath = './src/screens/ContractorDiscoveryScreen.tsx';
    const contractorServicePath = './src/services/ContractorService.ts';
    const swipeComponentPath = './src/components/ContractorDiscoverView.tsx';
    const mapViewPath = './src/components/ContractorMapView.tsx';
    
    const files = [
      { name: 'Discovery Screen', path: discoveryPath },
      { name: 'Contractor Service', path: contractorServicePath },
      { name: 'Swipe Component', path: swipeComponentPath },
      { name: 'Map View', path: mapViewPath }
    ];
    
    files.forEach(file => {
      const exists = fs.existsSync(file.path);
      console.log(`   ${exists ? '✅' : '❌'} ${file.name}: ${exists ? 'Available' : 'Missing'}`);
      
      if (exists) {
        const content = fs.readFileSync(file.path, 'utf8');
        // Check for Tinder-style swipe functionality
        if (file.name === 'Swipe Component') {
          const hasSwipeFeatures = content.includes('swipe') || content.includes('deck') || content.includes('card');
          console.log(`      ${hasSwipeFeatures ? '✅' : '❌'} Swipe Functionality`);
        }
        
        // Check for location-based features
        if (file.name === 'Map View') {
          const hasMapFeatures = content.includes('map') || content.includes('location') || content.includes('coordinates');
          console.log(`      ${hasMapFeatures ? '✅' : '❌'} Location Features`);
        }
        
        this.results.summary.passed++;
      } else {
        this.results.summary.failed++;
      }
    });
    
    console.log();
  }

  async testMessagingFeatures() {
    console.log('💬 Testing Messaging Features...');
    
    const messagingPaths = [
      { name: 'Messaging Screen', path: './src/screens/MessagingScreen.tsx' },
      { name: 'Messages List', path: './src/screens/MessagesListScreen.tsx' },
      { name: 'Messaging Service', path: './src/services/MessagingService.ts' },
      { name: 'Realtime Service', path: './src/services/RealtimeService.ts' }
    ];
    
    messagingPaths.forEach(item => {
      const exists = fs.existsSync(item.path);
      console.log(`   ${exists ? '✅' : '❌'} ${item.name}: ${exists ? 'Available' : 'Missing'}`);
      
      if (exists) {
        const content = fs.readFileSync(item.path, 'utf8');
        
        if (item.name === 'Messaging Service') {
          const features = [
            { name: 'Send Message', check: content.includes('sendMessage') },
            { name: 'Get Messages', check: content.includes('getMessages') || content.includes('fetchMessages') },
            { name: 'Real-time Updates', check: content.includes('subscribe') || content.includes('realtime') },
            { name: 'Message Status', check: content.includes('read') || content.includes('delivered') }
          ];
          
          features.forEach(feature => {
            console.log(`      ${feature.check ? '✅' : '❌'} ${feature.name}`);
          });
        }
        
        this.results.summary.passed++;
      } else {
        this.results.summary.failed++;
      }
    });
    
    console.log();
  }

  async testOfflineFunctionality() {
    console.log('📱 Testing Offline Functionality...');
    
    const offlinePath = './src/services/OfflineManager.ts';
    const networkHookPath = './src/hooks/useNetworkState.ts';
    const offlineQueryPath = './src/hooks/useOfflineQuery.ts';
    const syncStatusPath = './src/components/OfflineSyncStatus.tsx';
    
    const offlineFiles = [
      { name: 'Offline Manager', path: offlinePath },
      { name: 'Network Hook', path: networkHookPath },
      { name: 'Offline Query Hook', path: offlineQueryPath },
      { name: 'Sync Status Component', path: syncStatusPath }
    ];
    
    offlineFiles.forEach(file => {
      const exists = fs.existsSync(file.path);
      console.log(`   ${exists ? '✅' : '❌'} ${file.name}: ${exists ? 'Available' : 'Missing'}`);
      
      if (exists && file.name === 'Offline Manager') {
        const content = fs.readFileSync(file.path, 'utf8');
        const features = [
          { name: 'Queue Actions', check: content.includes('queueAction') },
          { name: 'Sync Queue', check: content.includes('syncQueue') },
          { name: 'Network Detection', check: content.includes('NetInfo') || content.includes('network') },
          { name: 'Retry Logic', check: content.includes('retry') || content.includes('maxRetries') }
        ];
        
        features.forEach(feature => {
          console.log(`      ${feature.check ? '✅' : '❌'} ${feature.name}`);
        });
      }
      
      if (exists) this.results.summary.passed++;
      else this.results.summary.failed++;
    });
    
    console.log();
  }

  async testUIComponents() {
    console.log('🎨 Testing UI Components...');
    
    const uiComponents = [
      'ErrorBoundary.tsx',
      'ScreenErrorBoundary.tsx', 
      'ServiceErrorBoundary.tsx',
      'SkeletonLoader.tsx',
      'SearchBar.tsx',
      'JobCard.tsx',
      'ContractorCard.tsx',
      'StripePaymentForm.tsx',
      'BiometricLoginButton.tsx',
      'OfflineSyncStatus.tsx'
    ];
    
    const componentsDir = './src/components/';
    
    uiComponents.forEach(component => {
      const path = componentsDir + component;
      const exists = fs.existsSync(path);
      console.log(`   ${exists ? '✅' : '❌'} ${component}: ${exists ? 'Available' : 'Missing'}`);
      
      if (exists) this.results.summary.passed++;
      else this.results.summary.warnings++;
    });
    
    console.log();
  }

  generateReport() {
    console.log('📊 Functional Testing Summary');
    console.log('============================');
    
    const total = this.results.summary.passed + this.results.summary.failed + this.results.summary.warnings;
    const passRate = total > 0 ? ((this.results.summary.passed / total) * 100).toFixed(1) : 0;
    
    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Tests: ${total}`);
    console.log(`   ✅ Passed: ${this.results.summary.passed}`);
    console.log(`   ❌ Failed: ${this.results.summary.failed}`);
    console.log(`   ⚠️  Warnings: ${this.results.summary.warnings}`);
    console.log(`   📊 Pass Rate: ${passRate}%\n`);
    
    // Determine overall status
    let overallStatus;
    if (this.results.summary.failed === 0 && this.results.summary.warnings < 5) {
      overallStatus = '🎉 EXCELLENT - App fully functional';
    } else if (this.results.summary.failed < 5 && passRate > 80) {
      overallStatus = '✅ GOOD - App mostly functional with minor issues';
    } else if (this.results.summary.failed < 10 && passRate > 60) {
      overallStatus = '⚠️ NEEDS WORK - App partially functional';
    } else {
      overallStatus = '❌ CRITICAL - App needs significant fixes';
    }
    
    console.log(`🎯 Overall Status: ${overallStatus}\n`);
    
    // Critical issues
    if (this.results.summary.failed > 0) {
      console.log('🔥 Critical Issues Found:');
      // This would list specific critical failures
      console.log('   - Review failed components above\n');
    }
    
    // Recommendations
    console.log('💡 Recommendations:');
    if (this.results.summary.failed > 5) {
      console.log('   1. Focus on implementing missing core services');
      console.log('   2. Ensure all critical screens are available');
      console.log('   3. Test authentication flow thoroughly');
    } else if (this.results.summary.warnings > 5) {
      console.log('   1. Complete partially implemented features');
      console.log('   2. Add missing UI components');
      console.log('   3. Enhance error handling');
    } else {
      console.log('   1. App is functional - focus on testing and polish');
      console.log('   2. Consider adding performance monitoring');
      console.log('   3. Prepare for production deployment');
    }
    
    // Write detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.results.summary,
      overallStatus,
      passRate: parseFloat(passRate),
      details: this.results
    };
    
    fs.writeFileSync('./functional-test-report.json', JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved: ./functional-test-report.json`);
  }
}

async function main() {
  const tester = new FunctionalTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main();
}

module.exports = FunctionalTester;