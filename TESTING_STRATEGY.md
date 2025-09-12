# 🧪 Testing Strategy & Guidelines

## Testing Philosophy

Our testing strategy follows the **Testing Pyramid** approach:
- **70% Unit Tests** - Fast, isolated, comprehensive
- **20% Integration Tests** - Component interactions
- **10% E2E Tests** - Critical user journeys

## Test Categories

### **1. Unit Tests**
**Location**: `src/__tests__/`
**Purpose**: Test individual functions, components, and services
**Tools**: Jest, React Native Testing Library

```typescript
// Example unit test
describe('AuthService', () => {
  it('should validate email format', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

### **2. Integration Tests**
**Location**: `src/__tests__/integration/`
**Purpose**: Test component interactions and workflows
**Tools**: Jest, React Native Testing Library, MSW

```typescript
// Example integration test
describe('User Authentication Flow', () => {
  it('should complete full login workflow', async () => {
    const { getByTestId } = render(<LoginScreen />);
    
    // Test complete user journey
    fireEvent.changeText(getByTestId('email'), 'user@test.com');
    fireEvent.changeText(getByTestId('password'), 'password123');
    fireEvent.press(getByTestId('login-button'));
    
    await waitFor(() => {
      expect(getByTestId('home-screen')).toBeTruthy();
    });
  });
});
```

### **3. E2E Tests**
**Location**: `e2e/`
**Purpose**: Test critical user paths in real environment
**Tools**: Detox, Appium

```typescript
// Example E2E test
describe('Job Posting Flow', () => {
  it('should allow homeowner to post a job', async () => {
    await element(by.id('create-job-button')).tap();
    await element(by.id('job-title')).typeText('Kitchen Repair');
    await element(by.id('submit-button')).tap();
    
    await expect(element(by.text('Job posted successfully'))).toBeVisible();
  });
});
```

## Test Standards

### **Coverage Requirements**
- **Overall**: Minimum 80%, Target 90%
- **Critical Paths**: 100% coverage required
- **Services**: 95% coverage required
- **Components**: 85% coverage required
- **Utils**: 90% coverage required

### **Test Quality Guidelines**

#### ✅ **Good Test Practices**
```typescript
// ✅ Descriptive test names
it('should display error message when login fails with invalid credentials', () => {});

// ✅ Arrange, Act, Assert pattern
it('should calculate total price correctly', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];
  
  // Act
  const total = calculateTotal(items);
  
  // Assert
  expect(total).toBe(30);
});

// ✅ Test one thing at a time
it('should validate email format', () => {
  expect(isValidEmail('test@example.com')).toBe(true);
});

it('should reject invalid email format', () => {
  expect(isValidEmail('invalid')).toBe(false);
});
```

#### ❌ **Anti-Patterns to Avoid**
```typescript
// ❌ Vague test names
it('should work correctly', () => {});

// ❌ Testing implementation details
expect(component.state.isLoading).toBe(false);

// ❌ Overly complex tests
it('should handle complex multi-step workflow with various edge cases', () => {
  // 100 lines of test code...
});
```

## Mock Strategy

### **Service Mocking**
```typescript
// Mock external services
jest.mock('../services/AuthService', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  getCurrentUser: jest.fn()
}));
```

### **API Mocking**
```typescript
// Use MSW for API mocking
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(ctx.json({ success: true, user: mockUser }));
  })
);
```

### **Component Mocking**
```typescript
// Mock complex components in isolation
jest.mock('react-native-maps', () => 'MapView');
jest.mock('@stripe/stripe-react-native', () => ({
  CardField: 'CardField',
  useStripe: () => ({ confirmPayment: jest.fn() })
}));
```

## Performance Testing

### **Bundle Size Monitoring**
```bash
# Monitor bundle size
npm run bundle:analyze

# Set size budgets
"bundlewatch": {
  "files": [
    {
      "path": "./dist/bundle.js",
      "maxSize": "2MB"
    }
  ]
}
```

### **Rendering Performance**
```typescript
// Test rendering performance
describe('JobList Performance', () => {
  it('should render 1000 jobs within performance budget', () => {
    const startTime = performance.now();
    
    render(<JobList jobs={generateMockJobs(1000)} />);
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(100); // 100ms budget
  });
});
```

## Continuous Testing

### **Pre-commit Hooks**
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test:ci"
    }
  }
}
```

### **CI/CD Integration**
```yaml
# In .github/workflows/ci.yml
- name: Run tests with coverage
  run: npm run test:coverage
  
- name: Upload coverage
  uses: codecov/codecov-action@v3
  
- name: Run E2E tests
  run: npm run test:e2e
```

## Test Data Management

### **Test Fixtures**
```typescript
// src/__tests__/fixtures/mockData.ts
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  role: 'homeowner'
};

export const mockJob = {
  id: 'job-123',
  title: 'Test Job',
  status: 'active'
};
```

### **Database Seeding**
```typescript
// Reset database state for each test
beforeEach(async () => {
  await resetTestDatabase();
  await seedTestData();
});
```

## Debugging Tests

### **Debugging Strategies**
```typescript
// Add debug logs
console.log('Component state:', component.debug());

// Take screenshots on failure
afterEach(async () => {
  if (jasmine.currentSpec.result.status === 'failed') {
    await device.takeScreenshot('failed-test');
  }
});

// Use test-specific IDs
<View testID="user-profile-container">
```

### **Common Issues & Solutions**

| Issue | Solution |
|-------|----------|
| Async operations not waiting | Use `waitFor()` or `findBy` queries |
| Mock not working | Check mock setup and import order |
| Test timeout | Increase timeout or fix async handling |
| Flaky tests | Remove shared state, improve isolation |

## Test Maintenance

### **Regular Tasks**
- [ ] Review test coverage monthly
- [ ] Update mock data quarterly
- [ ] Refactor slow tests
- [ ] Remove obsolete tests
- [ ] Update testing dependencies

### **Code Review Checklist**
- [ ] Tests added for new features
- [ ] Edge cases covered
- [ ] Mock setup is correct
- [ ] Test names are descriptive
- [ ] No test code duplication
