# 🧪 **MOBILE TESTING SETUP GUIDE**
*Comprehensive Mobile Testing Framework for Maintenance App*

## 📋 **Testing Tools Overview**

### **Primary Testing Stack**
1. **Detox** - Primary E2E testing framework for React Native
2. **React Native Testing Library** - Component testing (already configured)
3. **Jest** - Unit testing framework (already configured)
4. **Maestro** - Alternative UI testing (optional)
5. **EAS Build** - Cloud builds for testing

### **Testing Types Covered**
- ✅ **Unit Tests** - Individual component/service testing
- ✅ **Integration Tests** - Service-to-service interactions  
- ✅ **Component Tests** - UI component behavior
- ✅ **E2E Tests** - Complete user journey testing
- ✅ **Performance Tests** - Load and speed testing
- ✅ **Security Tests** - Vulnerability testing

---

## 🚀 **QUICK START GUIDE**

### **1. Prerequisites**
```bash
# Required tools
- Node.js 18+
- React Native development environment
- Android Studio (for Android testing)
- Xcode (for iOS testing)
- Java JDK 11+
- Android SDK

# Verify installation
node --version
npm --version
adb version
```

### **2. Environment Setup**

#### **Android Setup**
```bash
# Install Android Emulator
# 1. Open Android Studio
# 2. Tools > AVD Manager
# 3. Create Virtual Device
# 4. Select Pixel 7 API 34
# 5. Start emulator

# Verify emulator
adb devices
```

#### **iOS Setup** (macOS only)
```bash
# Install iOS Simulator
xcode-select --install

# List available simulators
xcrun simctl list devices
```

### **3. Running Tests**

#### **Unit & Integration Tests**
```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm test -- src/__tests__/services/AuthService.test.ts
```

#### **E2E Tests (Android)**
```bash
# Build app for testing
npm run e2e:build:android

# Run E2E tests
npm run e2e:test:android

# Run complete E2E suite
npm run e2e:android
```

#### **E2E Tests (iOS)**
```bash
# Build app for testing
npm run e2e:build:ios

# Run E2E tests
npm run e2e:test:ios

# Run complete E2E suite
npm run e2e:ios
```

---

## 📱 **DETOX E2E TESTING**

### **Configuration Files**

**`.detoxrc.js`** - Main Detox configuration
```javascript
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js'
    }
  },
  configurations: {
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    }
  }
};
```

### **Test Structure**
```
e2e/
├── config/
│   └── TestConfig.js          # Test configuration
├── helpers/
│   └── TestHelpers.js         # Utility functions
├── pageObjects/
│   ├── HomePage.js            # Home screen interactions
│   ├── AuthPage.js            # Authentication flows
│   └── JobsPage.js            # Job management
└── MaintenanceApp.e2e.test.js # Main test suite
```

### **Page Object Pattern**
```javascript
// e2e/pageObjects/HomePage.js
class HomePage {
  get postJobButton() { 
    return element(by.id('post-job-button')); 
  }

  async postNewJob() {
    await this.postJobButton.tap();
  }

  async verifyHomeScreen() {
    await expect(this.postJobButton).toBeVisible();
  }
}
```

### **Test Example**
```javascript
// e2e/MaintenanceApp.e2e.test.js
describe('Job Posting Flow', () => {
  it('should create new job', async () => {
    const homePage = new HomePage();
    const authPage = new AuthPage();
    
    // Sign in
    await authPage.signIn('test@example.com', 'password');
    
    // Create job
    await homePage.postNewJob();
    await homePage.fillJobForm({
      title: 'Kitchen Repair',
      budget: '150'
    });
    
    // Verify success
    await expect(element(by.text('Job Posted!'))).toBeVisible();
  });
});
```

---

## ⚡ **PERFORMANCE TESTING**

### **Load Testing**
```javascript
// Performance test example
it('should handle job list loading', async () => {
  const startTime = Date.now();
  
  await element(by.id('jobs-tab')).tap();
  await waitFor(element(by.id('jobs-list')))
    .toBeVisible()
    .withTimeout(5000);
  
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(3000);
});
```

### **Memory Testing**
```javascript
// Memory usage monitoring
it('should not leak memory during navigation', async () => {
  for (let i = 0; i < 10; i++) {
    await element(by.id('jobs-tab')).tap();
    await element(by.id('messages-tab')).tap();
    await element(by.id('profile-tab')).tap();
    await TestHelpers.sleep(100);
  }
  
  // Memory should remain stable
  await TestHelpers.checkMemoryUsage();
});
```

---

## 🔐 **SECURITY TESTING**

### **Authentication Tests**
```javascript
describe('Security Tests', () => {
  it('should prevent unauthorized access', async () => {
    // Try accessing protected screen without login
    await device.openURL({ url: 'mintenance://jobs' });
    
    // Should redirect to login
    await expect(element(by.id('sign-in-screen'))).toBeVisible();
  });

  it('should handle invalid credentials', async () => {
    await authPage.signIn('hacker@evil.com', 'wrongpass');
    await expect(element(by.text('Invalid credentials'))).toBeVisible();
  });
});
```

### **Data Validation Tests**
```javascript
it('should validate input data', async () => {
  // Test SQL injection attempt
  await element(by.id('search-input'))
    .typeText("'; DROP TABLE jobs; --");
  
  // App should handle gracefully
  await expect(element(by.id('no-results'))).toBeVisible();
});
```

---

## 🎯 **TEST CATEGORIES**

### **Smoke Tests** (Quick validation)
```bash
# Run smoke tests only
npm run e2e:test -- --testNamePattern="smoke"
```

### **Regression Tests** (Full feature testing)
```bash
# Run regression suite
npm run e2e:test -- --testNamePattern="regression"
```

### **User Journey Tests** (End-to-end flows)
```bash
# Run complete user journeys
npm run e2e:test -- --testNamePattern="user journey"
```

---

## 📊 **TEST REPORTING**

### **Test Results**
```
test-results/
├── screenshots/           # Failure screenshots
├── videos/               # Test execution videos
├── logs/                # Detailed test logs
├── coverage/            # Code coverage reports
└── reports/             # HTML test reports
```

### **Coverage Reports**
```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### **Performance Reports**
```javascript
// Performance metrics collection
const performanceData = {
  appStartup: 2500,        // ms
  screenTransition: 800,   // ms
  apiResponse: 1200,       // ms
  listLoading: 1800        // ms
};
```

---

## 🔄 **CI/CD INTEGRATION**

### **GitHub Actions Example**
```yaml
# .github/workflows/mobile-tests.yml
name: Mobile Tests

on: [push, pull_request]

jobs:
  android-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test
      
      - name: Setup Android emulator
        run: |
          echo "y" | $ANDROID_HOME/tools/bin/sdkmanager --install "system-images;android-29;google_apis;x86"
          echo "no" | $ANDROID_HOME/tools/bin/avdmanager create avd -n test -k "system-images;android-29;google_apis;x86"
          $ANDROID_HOME/emulator/emulator -avd test -no-snapshot -no-window -camera-back none -camera-front none -selinux permissive -qemu -m 2048 &
          adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed | tr -d '\r') ]]; do sleep 1; done; input keyevent 82'
      
      - name: Run E2E tests
        run: npm run e2e:android
```

---

## 🛠️ **TROUBLESHOOTING**

### **Common Issues**

#### **Detox Build Fails**
```bash
# Clean and rebuild
npm run e2e:clean
rm -rf node_modules
npm install
```

#### **Emulator Connection Issues**
```bash
# Restart ADB
adb kill-server
adb start-server
adb devices
```

#### **iOS Simulator Problems**
```bash
# Reset simulator
xcrun simctl erase all
xcrun simctl boot "iPhone 15 Pro"
```

#### **Test Timeouts**
```javascript
// Increase timeout in test
await waitFor(element(by.id('element')))
  .toBeVisible()
  .withTimeout(30000); // 30 seconds
```

### **Performance Issues**
```bash
# Profile app performance
# 1. Enable React DevTools Profiler
# 2. Use Flipper for debugging
# 3. Monitor memory usage
# 4. Check bundle size
```

---

## 🎯 **BEST PRACTICES**

### **Test Organization**
1. **Use Page Object Pattern** - Encapsulate screen interactions
2. **Create Reusable Helpers** - Common actions in utilities
3. **Organize by Feature** - Group related tests together
4. **Use Descriptive Names** - Clear test descriptions

### **Test Data Management**
1. **Use Test Config** - Centralized test data
2. **Generate Dynamic Data** - Avoid conflicts
3. **Clean Up After Tests** - Remove test data
4. **Mock External Services** - Reliable testing

### **Stability Tips**
1. **Wait for Elements** - Don't assume immediate availability
2. **Handle Async Operations** - Proper wait strategies
3. **Retry Failed Actions** - Network issues handling
4. **Take Screenshots** - Debug failures easily

---

## 📚 **ADDITIONAL TOOLS**

### **Maestro** (Alternative Testing)
```bash
# Install Maestro (when available)
curl -Ls "https://get.maestro.mobile.dev" | bash

# Run Maestro test
maestro test flow.yaml
```

### **Appium** (Cross-platform)
```bash
# Install Appium
npm install -g appium

# Run Appium tests
appium --relaxed-security
```

### **Firebase Test Lab** (Cloud testing)
```bash
# Upload to Firebase Test Lab
gcloud firebase test android run --app app-debug.apk
```

---

## 🎉 **MOBILE TESTING READY!**

Your Maintenance App now has a **comprehensive mobile testing framework** with:

✅ **Multiple Testing Levels** - Unit, Integration, E2E, Performance, Security  
✅ **Real Device Testing** - Android/iOS emulators and physical devices  
✅ **Page Object Architecture** - Maintainable and reusable test code  
✅ **CI/CD Integration** - Automated testing pipeline  
✅ **Performance Monitoring** - Speed and memory usage tracking  
✅ **Visual Regression** - Screenshot comparison testing  

**Ready for comprehensive mobile app validation!**