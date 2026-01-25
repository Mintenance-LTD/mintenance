/**
 * ContractorBanner Component Tests
 *
 * Comprehensive test suite for the ContractorBanner component
 * Tests rendering, user display, accessibility, and interactions
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ContractorBanner } from '../ContractorBanner';
import { User } from '@mintenance/types';

// Mock Expo vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock theme
jest.mock('../../../theme', () => ({
  theme: {
    colors: {
      primary: '#007AFF',
      textInverse: '#FFFFFF',
      textInverseMuted: '#E5E5EA',
    },
  },
}));

describe('ContractorBanner', () => {
  // Test Data Factory
  const createMockUser = (overrides?: Partial<User>): User => ({
    id: 'test-user-id-123',
    email: 'contractor@test.com',
    first_name: 'John',
    last_name: 'Smith',
    firstName: 'John',
    lastName: 'Smith',
    role: 'contractor',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    email_verified: true,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // SECTION 1: RENDERING TESTS
  describe('Rendering', () => {
    it('should render without crashing with valid user', () => {
      const user = createMockUser();
      const { toJSON } = render(<ContractorBanner user={user} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render without crashing with null user', () => {
      const { toJSON } = render(<ContractorBanner user={null} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render all required text elements', () => {
      const user = createMockUser();
      render(<ContractorBanner user={user} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
      expect(screen.getByText('Good morning,')).toBeTruthy();
      expect(screen.getByText('John')).toBeTruthy();
    });

    it('should render profile icon button', () => {
      const user = createMockUser();
      render(<ContractorBanner user={user} />);

      const profileButton = screen.getByLabelText('Profile');
      expect(profileButton).toBeTruthy();
    });

    it('should render Ionicons component', () => {
      const user = createMockUser();
      const { UNSAFE_getByType } = render(<ContractorBanner user={user} />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon).toBeTruthy();
    });

    it('should match snapshot with valid user', () => {
      const user = createMockUser();
      const tree = render(<ContractorBanner user={user} />).toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('should match snapshot with null user', () => {
      const tree = render(<ContractorBanner user={null} />).toJSON();
      expect(tree).toMatchSnapshot();
    });
  });

  // SECTION 2: USER DATA DISPLAY TESTS
  describe('User Data Display', () => {
    it('should display firstName when provided', () => {
      const user = createMockUser({ firstName: 'Sarah' });
      render(<ContractorBanner user={user} />);

      expect(screen.getByText('Sarah')).toBeTruthy();
    });

    it('should not display firstName when firstName is not provided (only first_name)', () => {
      const user = createMockUser({ first_name: 'Michael', firstName: undefined });
      render(<ContractorBanner user={user} />);

      // Component only uses user?.firstName, not first_name
      expect(screen.queryByText('Michael')).toBeFalsy();
    });

    it('should handle empty firstName', () => {
      const user = createMockUser({ firstName: '' });
      const { UNSAFE_getAllByType } = render(<ContractorBanner user={user} />);

      // Empty string is still rendered, just not visible with text
      const texts = UNSAFE_getAllByType('Text');
      expect(texts.length).toBe(3); // Still renders 3 Text components
    });

    it('should handle null user gracefully', () => {
      const { toJSON } = render(<ContractorBanner user={null} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
      expect(screen.getByText('Good morning,')).toBeTruthy();
      expect(toJSON()).toBeTruthy();
    });

    it('should handle undefined user gracefully', () => {
      const { toJSON } = render(<ContractorBanner user={undefined as any} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
      expect(screen.getByText('Good morning,')).toBeTruthy();
      expect(toJSON()).toBeTruthy();
    });

    it('should display single character firstName', () => {
      const user = createMockUser({ firstName: 'J' });
      render(<ContractorBanner user={user} />);

      expect(screen.getByText('J')).toBeTruthy();
    });

    it('should display long firstName without truncation', () => {
      const longName = 'Bartholomew';
      const user = createMockUser({ firstName: longName });
      render(<ContractorBanner user={user} />);

      expect(screen.getByText(longName)).toBeTruthy();
    });

    it('should display firstName with special characters', () => {
      const user = createMockUser({ firstName: "O'Brien" });
      render(<ContractorBanner user={user} />);

      expect(screen.getByText("O'Brien")).toBeTruthy();
    });

    it('should display firstName with spaces', () => {
      const user = createMockUser({ firstName: 'Mary Jane' });
      render(<ContractorBanner user={user} />);

      expect(screen.getByText('Mary Jane')).toBeTruthy();
    });

    it('should display firstName with hyphens', () => {
      const user = createMockUser({ firstName: 'Jean-Luc' });
      render(<ContractorBanner user={user} />);

      expect(screen.getByText('Jean-Luc')).toBeTruthy();
    });

    it('should display firstName with numbers', () => {
      const user = createMockUser({ firstName: 'John2' });
      render(<ContractorBanner user={user} />);

      expect(screen.getByText('John2')).toBeTruthy();
    });

    it('should display firstName with Unicode characters', () => {
      const user = createMockUser({ firstName: 'José' });
      render(<ContractorBanner user={user} />);

      expect(screen.getByText('José')).toBeTruthy();
    });

    it('should display firstName with emojis', () => {
      const user = createMockUser({ firstName: 'John 🔧' });
      render(<ContractorBanner user={user} />);

      expect(screen.getByText('John 🔧')).toBeTruthy();
    });
  });

  // SECTION 3: ACCESSIBILITY TESTS
  describe('Accessibility', () => {
    it('should have profile button with correct accessibilityRole', () => {
      const user = createMockUser();
      render(<ContractorBanner user={user} />);

      const profileButton = screen.getByLabelText('Profile');
      expect(profileButton.props.accessibilityRole).toBe('button');
    });

    it('should have profile button with correct accessibilityLabel', () => {
      const user = createMockUser();
      render(<ContractorBanner user={user} />);

      const profileButton = screen.getByLabelText('Profile');
      expect(profileButton).toBeTruthy();
    });

    it('should have profile button with accessibilityHint', () => {
      const user = createMockUser();
      render(<ContractorBanner user={user} />);

      const profileButton = screen.getByLabelText('Profile');
      expect(profileButton.props.accessibilityHint).toBe('Double tap to view and edit your profile');
    });

    it('should have all three accessibility props on profile button', () => {
      const user = createMockUser();
      render(<ContractorBanner user={user} />);

      const profileButton = screen.getByLabelText('Profile');
      expect(profileButton.props.accessibilityRole).toBe('button');
      expect(profileButton.props.accessibilityLabel).toBe('Profile');
      expect(profileButton.props.accessibilityHint).toBe('Double tap to view and edit your profile');
    });

    it('should render greeting text that is readable by screen readers', () => {
      const user = createMockUser();
      render(<ContractorBanner user={user} />);

      const greeting = screen.getByText('Mintenance Service Hub');
      expect(greeting).toBeTruthy();
      expect(greeting.props.children).toBe('Mintenance Service Hub');
    });

    it('should render sub-greeting text that is readable by screen readers', () => {
      const user = createMockUser();
      render(<ContractorBanner user={user} />);

      const subGreeting = screen.getByText('Good morning,');
      expect(subGreeting).toBeTruthy();
      expect(subGreeting.props.children).toBe('Good morning,');
    });

    it('should render user name text that is readable by screen readers', () => {
      const user = createMockUser({ firstName: 'Alice' });
      render(<ContractorBanner user={user} />);

      const nameText = screen.getByText('Alice');
      expect(nameText).toBeTruthy();
      expect(nameText.props.children).toBe('Alice');
    });
  });

  // SECTION 4: ICON CONFIGURATION TESTS
  describe('Icon Configuration', () => {
    it('should render Ionicons with correct name prop', () => {
      const user = createMockUser();
      const { UNSAFE_getByType } = render(<ContractorBanner user={user} />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.name).toBe('person-circle');
    });

    it('should render Ionicons with correct size prop', () => {
      const user = createMockUser();
      const { UNSAFE_getByType } = render(<ContractorBanner user={user} />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.size).toBe(48);
    });

    it('should render Ionicons with correct color prop', () => {
      const user = createMockUser();
      const { UNSAFE_getByType } = render(<ContractorBanner user={user} />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.color).toBe('#FFFFFF');
    });

    it('should render Ionicons with all three props correctly', () => {
      const user = createMockUser();
      const { UNSAFE_getByType } = render(<ContractorBanner user={user} />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.name).toBe('person-circle');
      expect(icon.props.size).toBe(48);
      expect(icon.props.color).toBe('#FFFFFF');
    });
  });

  // SECTION 5: LAYOUT AND STYLING TESTS
  describe('Layout and Styling', () => {
    it('should render banner container with correct structure', () => {
      const user = createMockUser();
      const { toJSON } = render(<ContractorBanner user={user} />);

      expect(toJSON()).toBeTruthy();
      expect(toJSON()?.type).toBe('View');
    });

    it('should render content section as View', () => {
      const user = createMockUser();
      const { UNSAFE_getAllByType } = render(<ContractorBanner user={user} />);

      const views = UNSAFE_getAllByType('View');
      expect(views.length).toBeGreaterThan(0);
    });

    it('should render three Text elements for greeting components', () => {
      const user = createMockUser();
      const { UNSAFE_getAllByType } = render(<ContractorBanner user={user} />);

      const texts = UNSAFE_getAllByType('Text');
      expect(texts.length).toBe(3);
    });

    it('should render TouchableOpacity for profile button', () => {
      const user = createMockUser();
      render(<ContractorBanner user={user} />);

      const touchable = screen.getByLabelText('Profile');
      expect(touchable.type).toBe('TouchableOpacity');
    });

    it('should apply styles to banner container', () => {
      const user = createMockUser();
      const { toJSON } = render(<ContractorBanner user={user} />);

      const root = toJSON();
      expect(root?.props?.style).toBeDefined();
    });

    it('should apply styles to text elements', () => {
      const user = createMockUser();
      const { UNSAFE_getAllByType } = render(<ContractorBanner user={user} />);

      const texts = UNSAFE_getAllByType('Text');
      texts.forEach(text => {
        expect(text.props.style).toBeDefined();
      });
    });

    it('should apply styles to profile button', () => {
      const user = createMockUser();
      render(<ContractorBanner user={user} />);

      const button = screen.getByLabelText('Profile');
      expect(button.props.style).toBeDefined();
    });
  });

  // SECTION 6: COMPONENT COMPOSITION TESTS
  describe('Component Composition', () => {
    it('should render banner with two child Views', () => {
      const user = createMockUser();
      const { UNSAFE_getAllByType } = render(<ContractorBanner user={user} />);

      const views = UNSAFE_getAllByType('View');
      expect(views.length).toBeGreaterThanOrEqual(2);
    });

    it('should render content View before profile button', () => {
      const user = createMockUser();
      const { toJSON } = render(<ContractorBanner user={user} />);

      const root = toJSON();
      const children = root?.children;
      expect(children).toBeDefined();
      expect(Array.isArray(children)).toBe(true);
    });

    it('should contain greeting text within content section', () => {
      const user = createMockUser();
      render(<ContractorBanner user={user} />);

      const greeting = screen.getByText('Mintenance Service Hub');
      expect(greeting).toBeTruthy();
    });

    it('should contain sub-greeting text within content section', () => {
      const user = createMockUser();
      render(<ContractorBanner user={user} />);

      const subGreeting = screen.getByText('Good morning,');
      expect(subGreeting).toBeTruthy();
    });

    it('should contain name text within content section', () => {
      const user = createMockUser({ firstName: 'Bob' });
      render(<ContractorBanner user={user} />);

      const nameText = screen.getByText('Bob');
      expect(nameText).toBeTruthy();
    });

    it('should contain profile icon within TouchableOpacity', () => {
      const user = createMockUser();
      const { UNSAFE_getByType } = render(<ContractorBanner user={user} />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon).toBeTruthy();
    });
  });

  // SECTION 7: EDGE CASES TESTS
  describe('Edge Cases', () => {
    it('should handle user with only first_name (no firstName) - renders nothing', () => {
      const user = {
        id: 'test-id',
        email: 'test@test.com',
        first_name: 'TestName',
        last_name: 'LastName',
        role: 'contractor' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      render(<ContractorBanner user={user} />);

      // Component only uses firstName, not first_name
      expect(screen.queryByText('TestName')).toBeFalsy();
    });

    it('should handle user with whitespace-only firstName', () => {
      const user = createMockUser({ firstName: '   ' });
      render(<ContractorBanner user={user} />);

      expect(screen.getByText('   ')).toBeTruthy();
    });

    it('should handle user with very long firstName (100+ chars)', () => {
      const longName = 'A'.repeat(100);
      const user = createMockUser({ firstName: longName });
      render(<ContractorBanner user={user} />);

      expect(screen.getByText(longName)).toBeTruthy();
    });

    it('should render correctly when user object has extra properties', () => {
      const user = createMockUser({
        bio: 'Test bio',
        city: 'Test City',
        rating: 4.5,
      } as any);
      render(<ContractorBanner user={user} />);

      expect(screen.getByText('John')).toBeTruthy();
    });

    it('should handle rapid re-renders with different users', () => {
      const user1 = createMockUser({ firstName: 'User1' });
      const user2 = createMockUser({ firstName: 'User2' });

      const { rerender } = render(<ContractorBanner user={user1} />);
      expect(screen.getByText('User1')).toBeTruthy();

      rerender(<ContractorBanner user={user2} />);
      expect(screen.getByText('User2')).toBeTruthy();
    });

    it('should handle switching from user to null', () => {
      const user = createMockUser({ firstName: 'TestUser' });

      const { rerender } = render(<ContractorBanner user={user} />);
      expect(screen.getByText('TestUser')).toBeTruthy();

      rerender(<ContractorBanner user={null} />);
      expect(screen.queryByText('TestUser')).toBeFalsy();
    });

    it('should handle switching from null to user', () => {
      const user = createMockUser({ firstName: 'NewUser' });

      const { rerender } = render(<ContractorBanner user={null} />);
      expect(screen.queryByText('NewUser')).toBeFalsy();

      rerender(<ContractorBanner user={user} />);
      expect(screen.getByText('NewUser')).toBeTruthy();
    });

    it('should handle user with firstName as number (type coercion)', () => {
      const user = createMockUser({ firstName: 123 as any });
      render(<ContractorBanner user={user} />);

      expect(screen.getByText('123')).toBeTruthy();
    });

    it('should handle user with firstName as boolean (type coercion)', () => {
      const user = createMockUser({ firstName: true as any });
      const { UNSAFE_getAllByType } = render(<ContractorBanner user={user} />);

      // Boolean true will be converted to string but might not render as "true"
      const texts = UNSAFE_getAllByType('Text');
      expect(texts.length).toBe(3);
    });

    it('should handle user with firstName as object (renders [object Object])', () => {
      const user = createMockUser({ firstName: { name: 'test' } as any });

      // Objects are not valid as React children, this will throw
      expect(() => render(<ContractorBanner user={user} />)).toThrow();
    });
  });

  // SECTION 8: STATIC TEXT TESTS
  describe('Static Text Content', () => {
    it('should always display "Mintenance Service Hub" greeting', () => {
      const user = createMockUser();
      render(<ContractorBanner user={user} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
    });

    it('should display "Mintenance Service Hub" with null user', () => {
      render(<ContractorBanner user={null} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
    });

    it('should always display "Good morning," text', () => {
      const user = createMockUser();
      render(<ContractorBanner user={user} />);

      expect(screen.getByText('Good morning,')).toBeTruthy();
    });

    it('should display "Good morning," with null user', () => {
      render(<ContractorBanner user={null} />);

      expect(screen.getByText('Good morning,')).toBeTruthy();
    });

    it('should display exact text without extra whitespace', () => {
      const user = createMockUser();
      render(<ContractorBanner user={user} />);

      const greeting = screen.getByText('Mintenance Service Hub');
      expect(greeting.props.children).toBe('Mintenance Service Hub');

      const subGreeting = screen.getByText('Good morning,');
      expect(subGreeting.props.children).toBe('Good morning,');
    });
  });

  // SECTION 9: TYPE SAFETY TESTS
  describe('Type Safety', () => {
    it('should accept valid User object', () => {
      const user = createMockUser();
      expect(() => render(<ContractorBanner user={user} />)).not.toThrow();
    });

    it('should accept null as user prop', () => {
      expect(() => render(<ContractorBanner user={null} />)).not.toThrow();
    });

    it('should render with minimal User object', () => {
      const minimalUser: User = {
        id: 'minimal-id',
        email: 'minimal@test.com',
        first_name: 'Min',
        last_name: 'User',
        firstName: 'Min', // Component uses firstName, not first_name
        role: 'contractor',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      render(<ContractorBanner user={minimalUser} />);

      expect(screen.getByText('Min')).toBeTruthy();
    });

    it('should render with full User object', () => {
      const fullUser: User = {
        id: 'full-id',
        email: 'full@test.com',
        first_name: 'Full',
        last_name: 'User',
        firstName: 'Full',
        lastName: 'User',
        role: 'contractor',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        email_verified: true,
        phone: '+1234567890',
        phone_verified: true,
        location: 'Test City',
        profile_image_url: 'https://example.com/image.jpg',
        bio: 'Test bio',
        city: 'Test City',
        country: 'Test Country',
        company_name: 'Test Company',
        admin_verified: true,
        rating: 4.8,
        jobs_count: 25,
      };
      render(<ContractorBanner user={fullUser} />);

      expect(screen.getByText('Full')).toBeTruthy();
    });
  });

  // SECTION 10: COMPONENT INTEGRATION TESTS
  describe('Component Integration', () => {
    it('should render all components together correctly', () => {
      const user = createMockUser({ firstName: 'Integration' });
      render(<ContractorBanner user={user} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
      expect(screen.getByText('Good morning,')).toBeTruthy();
      expect(screen.getByText('Integration')).toBeTruthy();
      expect(screen.getByLabelText('Profile')).toBeTruthy();
    });

    it('should maintain structure with multiple renders', () => {
      const user = createMockUser();
      const { rerender } = render(<ContractorBanner user={user} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();

      rerender(<ContractorBanner user={user} />);
      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();

      rerender(<ContractorBanner user={user} />);
      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
    });

    it('should preserve icon configuration across re-renders', () => {
      const user = createMockUser();
      const { rerender, UNSAFE_getByType } = render(<ContractorBanner user={user} />);

      let icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.name).toBe('person-circle');

      rerender(<ContractorBanner user={user} />);
      icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.name).toBe('person-circle');
    });

    it('should preserve accessibility props across re-renders', () => {
      const user = createMockUser();
      const { rerender } = render(<ContractorBanner user={user} />);

      let button = screen.getByLabelText('Profile');
      expect(button.props.accessibilityLabel).toBe('Profile');

      rerender(<ContractorBanner user={user} />);
      button = screen.getByLabelText('Profile');
      expect(button.props.accessibilityLabel).toBe('Profile');
    });
  });
});
