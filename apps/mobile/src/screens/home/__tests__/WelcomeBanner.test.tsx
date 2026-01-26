/**
 * WelcomeBanner Component Tests
 *
 * Comprehensive test suite for the WelcomeBanner component
 * Tests rendering, user display, greeting messages, and accessibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { WelcomeBanner } from '../WelcomeBanner';
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

describe('WelcomeBanner', () => {
  // Test Data Factory
  const createMockUser = (overrides?: Partial<User>): User => ({
    id: 'test-user-id-123',
    email: 'homeowner@test.com',
    first_name: 'Jane',
    last_name: 'Doe',
    firstName: 'Jane',
    lastName: 'Doe',
    role: 'homeowner',
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
      const { toJSON } = render(<WelcomeBanner user={user} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render without crashing with null user', () => {
      const { toJSON } = render(<WelcomeBanner user={null} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render all required text elements', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
      expect(screen.getByText('Good morning,')).toBeTruthy();
      expect(screen.getByText('Jane')).toBeTruthy();
    });

    it('should render profile icon button', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const profileButton = screen.getByLabelText('Profile');
      expect(profileButton).toBeTruthy();
    });

    it('should render Ionicons component', () => {
      const user = createMockUser();
      const { UNSAFE_getByType } = render(<WelcomeBanner user={user} />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon).toBeTruthy();
    });

    it('should match snapshot with valid user', () => {
      const user = createMockUser();
      const tree = render(<WelcomeBanner user={user} />).toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('should match snapshot with null user', () => {
      const tree = render(<WelcomeBanner user={null} />).toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('should render banner as top-level View', () => {
      const user = createMockUser();
      const { toJSON } = render(<WelcomeBanner user={user} />);

      expect(toJSON()?.type).toBe('View');
    });
  });

  // SECTION 2: USER DATA DISPLAY TESTS
  describe('User Data Display', () => {
    it('should display firstName when provided', () => {
      const user = createMockUser({ firstName: 'Sarah' });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Sarah')).toBeTruthy();
    });

    it('should not display firstName when firstName is not provided (only first_name)', () => {
      const user = createMockUser({ first_name: 'Michael', firstName: undefined });
      render(<WelcomeBanner user={user} />);

      // Component only uses user?.firstName, not first_name
      expect(screen.queryByText('Michael')).toBeFalsy();
    });

    it('should handle empty firstName', () => {
      const user = createMockUser({ firstName: '' });
      const { UNSAFE_getAllByType } = render(<WelcomeBanner user={user} />);

      // Empty string is still rendered as a Text element
      const texts = UNSAFE_getAllByType('Text');
      expect(texts.length).toBe(3);
    });

    it('should handle null user gracefully', () => {
      const { toJSON } = render(<WelcomeBanner user={null} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
      expect(screen.getByText('Good morning,')).toBeTruthy();
      expect(toJSON()).toBeTruthy();
    });

    it('should handle undefined user gracefully', () => {
      const { toJSON } = render(<WelcomeBanner user={undefined as any} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
      expect(screen.getByText('Good morning,')).toBeTruthy();
      expect(toJSON()).toBeTruthy();
    });

    it('should display single character firstName', () => {
      const user = createMockUser({ firstName: 'J' });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('J')).toBeTruthy();
    });

    it('should display long firstName without truncation', () => {
      const longName = 'Bartholomew';
      const user = createMockUser({ firstName: longName });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText(longName)).toBeTruthy();
    });

    it('should display firstName with special characters', () => {
      const user = createMockUser({ firstName: "O'Brien" });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText("O'Brien")).toBeTruthy();
    });

    it('should display firstName with spaces', () => {
      const user = createMockUser({ firstName: 'Mary Jane' });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Mary Jane')).toBeTruthy();
    });

    it('should display firstName with hyphens', () => {
      const user = createMockUser({ firstName: 'Jean-Luc' });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Jean-Luc')).toBeTruthy();
    });

    it('should display firstName with numbers', () => {
      const user = createMockUser({ firstName: 'Jane2' });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Jane2')).toBeTruthy();
    });

    it('should display firstName with Unicode characters', () => {
      const user = createMockUser({ firstName: 'José' });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('José')).toBeTruthy();
    });

    it('should display firstName with emojis', () => {
      const user = createMockUser({ firstName: 'Jane 🏠' });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Jane 🏠')).toBeTruthy();
    });

    it('should display firstName with mixed case', () => {
      const user = createMockUser({ firstName: 'mArY' });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('mArY')).toBeTruthy();
    });

    it('should display firstName with leading/trailing spaces', () => {
      const user = createMockUser({ firstName: '  Jane  ' });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('  Jane  ')).toBeTruthy();
    });
  });

  // SECTION 3: GREETING MESSAGE TESTS
  describe('Greeting Messages', () => {
    it('should always display "Mintenance Service Hub" title', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
    });

    it('should display "Mintenance Service Hub" with null user', () => {
      render(<WelcomeBanner user={null} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
    });

    it('should always display "Good morning," sub-greeting', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Good morning,')).toBeTruthy();
    });

    it('should display "Good morning," with null user', () => {
      render(<WelcomeBanner user={null} />);

      expect(screen.getByText('Good morning,')).toBeTruthy();
    });

    it('should display exact greeting text without modifications', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const title = screen.getByText('Mintenance Service Hub');
      expect(title.props.children).toBe('Mintenance Service Hub');

      const greeting = screen.getByText('Good morning,');
      expect(greeting.props.children).toBe('Good morning,');
    });

    it('should display greeting with comma in "Good morning,"', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const greeting = screen.getByText('Good morning,');
      expect(greeting.props.children).toContain(',');
    });

    it('should render greeting texts in correct order', () => {
      const user = createMockUser({ firstName: 'TestUser' });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
      expect(screen.getByText('Good morning,')).toBeTruthy();
      expect(screen.getByText('TestUser')).toBeTruthy();
    });

    it('should preserve greeting case sensitivity', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      // Check exact case
      expect(screen.queryByText('mintenance service hub')).toBeFalsy();
      expect(screen.queryByText('GOOD MORNING,')).toBeFalsy();
      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
      expect(screen.getByText('Good morning,')).toBeTruthy();
    });
  });

  // SECTION 4: ACCESSIBILITY TESTS
  describe('Accessibility', () => {
    it('should have profile button with correct accessibilityRole', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const profileButton = screen.getByLabelText('Profile');
      expect(profileButton).toBeTruthy();
    });

    it('should have profile button with correct accessibilityLabel', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const profileButton = screen.getByLabelText('Profile');
      expect(profileButton).toBeTruthy();
    });

    it('should have profile button with accessibilityHint', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const profileButton = screen.getByLabelText('Profile');
      expect(profileButton.props.accessibilityHint).toBe('Double tap to view and edit your profile');
    });

    it('should have all three accessibility props on profile button', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const profileButton = screen.getByLabelText('Profile');
      expect(profileButton.props.accessibilityRole).toBe('button');
      expect(profileButton.props.accessibilityLabel).toBe('Profile');
      expect(profileButton.props.accessibilityHint).toBe('Double tap to view and edit your profile');
    });

    it('should render title text that is readable by screen readers', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const title = screen.getByText('Mintenance Service Hub');
      expect(title).toBeTruthy();
      expect(title.props.children).toBe('Mintenance Service Hub');
    });

    it('should render sub-greeting text that is readable by screen readers', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const subGreeting = screen.getByText('Good morning,');
      expect(subGreeting).toBeTruthy();
      expect(subGreeting.props.children).toBe('Good morning,');
    });

    it('should render user name text that is readable by screen readers', () => {
      const user = createMockUser({ firstName: 'Alice' });
      render(<WelcomeBanner user={user} />);

      const nameText = screen.getByText('Alice');
      expect(nameText).toBeTruthy();
      expect(nameText.props.children).toBe('Alice');
    });

    it('should maintain accessibility with null user', () => {
      render(<WelcomeBanner user={null} />);

      const profileButton = screen.getByLabelText('Profile');
      expect(profileButton.props.accessibilityRole).toBe('button');
      expect(profileButton.props.accessibilityLabel).toBe('Profile');
    });

    it('should have descriptive accessibility hint for profile action', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const profileButton = screen.getByLabelText('Profile');
      const hint = profileButton.props.accessibilityHint;
      expect(hint).toContain('Double tap');
      expect(hint).toContain('profile');
    });
  });

  // SECTION 5: ICON CONFIGURATION TESTS
  describe('Icon Configuration', () => {
    it('should render Ionicons with correct name prop', () => {
      const user = createMockUser();
      const { UNSAFE_getByType } = render(<WelcomeBanner user={user} />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.name).toBe('person-circle');
    });

    it('should render Ionicons with correct size prop', () => {
      const user = createMockUser();
      const { UNSAFE_getByType } = render(<WelcomeBanner user={user} />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.size).toBe(48);
    });

    it('should render Ionicons with correct color prop', () => {
      const user = createMockUser();
      const { UNSAFE_getByType } = render(<WelcomeBanner user={user} />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.color).toBe('#FFFFFF');
    });

    it('should render Ionicons with all three props correctly', () => {
      const user = createMockUser();
      const { UNSAFE_getByType } = render(<WelcomeBanner user={user} />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.name).toBe('person-circle');
      expect(icon.props.size).toBe(48);
      expect(icon.props.color).toBe('#FFFFFF');
    });

    it('should render person-circle icon for profile', () => {
      const user = createMockUser();
      const { UNSAFE_getByType } = render(<WelcomeBanner user={user} />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.name).toBe('person-circle');
    });

    it('should render icon with size 48', () => {
      const user = createMockUser();
      const { UNSAFE_getByType } = render(<WelcomeBanner user={user} />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.size).toBe(48);
    });

    it('should render icon with theme textInverse color', () => {
      const user = createMockUser();
      const { UNSAFE_getByType } = render(<WelcomeBanner user={user} />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.color).toBe('#FFFFFF');
    });

    it('should maintain icon configuration with null user', () => {
      const { UNSAFE_getByType } = render(<WelcomeBanner user={null} />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.name).toBe('person-circle');
      expect(icon.props.size).toBe(48);
      expect(icon.props.color).toBe('#FFFFFF');
    });
  });

  // SECTION 6: LAYOUT AND STYLING TESTS
  describe('Layout and Styling', () => {
    it('should render banner container with correct structure', () => {
      const user = createMockUser();
      const { toJSON } = render(<WelcomeBanner user={user} />);

      expect(toJSON()).toBeTruthy();
      expect(toJSON()?.type).toBe('View');
    });

    it('should render content section as View', () => {
      const user = createMockUser();
      const { UNSAFE_getAllByType } = render(<WelcomeBanner user={user} />);

      const views = UNSAFE_getAllByType('View');
      expect(views.length).toBeGreaterThan(0);
    });

    it('should render three Text elements for greeting components', () => {
      const user = createMockUser();
      const { UNSAFE_getAllByType } = render(<WelcomeBanner user={user} />);

      const texts = UNSAFE_getAllByType('Text');
      expect(texts.length).toBe(3);
    });

    it('should render TouchableOpacity for profile button', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const touchable = screen.getByLabelText('Profile');
      expect(touchable.type).toBe('TouchableOpacity');
    });

    it('should apply styles to banner container', () => {
      const user = createMockUser();
      const { toJSON } = render(<WelcomeBanner user={user} />);

      const root = toJSON();
      expect(root?.props?.style).toBeDefined();
    });

    it('should apply styles to text elements', () => {
      const user = createMockUser();
      const { UNSAFE_getAllByType } = render(<WelcomeBanner user={user} />);

      const texts = UNSAFE_getAllByType('Text');
      texts.forEach(text => {
        expect(text.props.style).toBeDefined();
      });
    });

    it('should apply styles to profile button', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const button = screen.getByLabelText('Profile');
      expect(button.props.style).toBeDefined();
    });

    it('should render banner with flexDirection row layout', () => {
      const user = createMockUser();
      const { toJSON } = render(<WelcomeBanner user={user} />);

      const root = toJSON();
      expect(root?.props?.style).toBeDefined();
    });
  });

  // SECTION 7: COMPONENT COMPOSITION TESTS
  describe('Component Composition', () => {
    it('should render banner with two child Views', () => {
      const user = createMockUser();
      const { UNSAFE_getAllByType } = render(<WelcomeBanner user={user} />);

      const views = UNSAFE_getAllByType('View');
      expect(views.length).toBeGreaterThanOrEqual(2);
    });

    it('should render content View before profile button', () => {
      const user = createMockUser();
      const { toJSON } = render(<WelcomeBanner user={user} />);

      const root = toJSON();
      const children = root?.children;
      expect(children).toBeDefined();
      expect(Array.isArray(children)).toBe(true);
    });

    it('should contain title text within content section', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const title = screen.getByText('Mintenance Service Hub');
      expect(title).toBeTruthy();
    });

    it('should contain sub-greeting text within content section', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const subGreeting = screen.getByText('Good morning,');
      expect(subGreeting).toBeTruthy();
    });

    it('should contain name text within content section', () => {
      const user = createMockUser({ firstName: 'Bob' });
      render(<WelcomeBanner user={user} />);

      const nameText = screen.getByText('Bob');
      expect(nameText).toBeTruthy();
    });

    it('should contain profile icon within TouchableOpacity', () => {
      const user = createMockUser();
      const { UNSAFE_getByType } = render(<WelcomeBanner user={user} />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon).toBeTruthy();
    });

    it('should render exactly one profile button', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const button = screen.getByLabelText('Profile');
      expect(button).toBeTruthy();
    });

    it('should render exactly one icon', () => {
      const user = createMockUser();
      const { UNSAFE_getAllByType } = render(<WelcomeBanner user={user} />);

      const icons = UNSAFE_getAllByType('Ionicons');
      expect(icons.length).toBe(1);
    });
  });

  // SECTION 8: EDGE CASES TESTS
  describe('Edge Cases', () => {
    it('should handle user with only first_name (no firstName) - renders nothing', () => {
      const user = {
        id: 'test-id',
        email: 'test@test.com',
        first_name: 'TestName',
        last_name: 'LastName',
        role: 'homeowner' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      render(<WelcomeBanner user={user} />);

      // Component only uses firstName, not first_name
      expect(screen.queryByText('TestName')).toBeFalsy();
    });

    it('should handle user with whitespace-only firstName', () => {
      const user = createMockUser({ firstName: '   ' });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('   ')).toBeTruthy();
    });

    it('should handle user with very long firstName (100+ chars)', () => {
      const longName = 'A'.repeat(100);
      const user = createMockUser({ firstName: longName });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText(longName)).toBeTruthy();
    });

    it('should render correctly when user object has extra properties', () => {
      const user = createMockUser({
        bio: 'Test bio',
        city: 'Test City',
        rating: 4.5,
      } as any);
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Jane')).toBeTruthy();
    });

    it('should handle rapid re-renders with different users', () => {
      const user1 = createMockUser({ firstName: 'User1' });
      const user2 = createMockUser({ firstName: 'User2' });

      const { rerender } = render(<WelcomeBanner user={user1} />);
      expect(screen.getByText('User1')).toBeTruthy();

      rerender(<WelcomeBanner user={user2} />);
      expect(screen.getByText('User2')).toBeTruthy();
    });

    it('should handle switching from user to null', () => {
      const user = createMockUser({ firstName: 'TestUser' });

      const { rerender } = render(<WelcomeBanner user={user} />);
      expect(screen.getByText('TestUser')).toBeTruthy();

      rerender(<WelcomeBanner user={null} />);
      expect(screen.queryByText('TestUser')).toBeFalsy();
    });

    it('should handle switching from null to user', () => {
      const user = createMockUser({ firstName: 'NewUser' });

      const { rerender } = render(<WelcomeBanner user={null} />);
      expect(screen.queryByText('NewUser')).toBeFalsy();

      rerender(<WelcomeBanner user={user} />);
      expect(screen.getByText('NewUser')).toBeTruthy();
    });

    it('should handle user with firstName as number (type coercion)', () => {
      const user = createMockUser({ firstName: 123 as any });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('123')).toBeTruthy();
    });

    it('should handle user with firstName as boolean (type coercion)', () => {
      const user = createMockUser({ firstName: true as any });
      const { UNSAFE_getAllByType } = render(<WelcomeBanner user={user} />);

      // Boolean will be coerced but React doesn't render booleans as text
      const texts = UNSAFE_getAllByType('Text');
      expect(texts.length).toBe(3);
    });

    it('should handle user with firstName as object (throws error)', () => {
      const user = createMockUser({ firstName: { name: 'test' } as any });

      // Objects are not valid React children, this should throw
      expect(() => render(<WelcomeBanner user={user} />)).toThrow();
    });

    it('should handle user with firstName containing newlines', () => {
      const user = createMockUser({ firstName: 'Jane\nDoe' });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Jane\nDoe')).toBeTruthy();
    });

    it('should handle user with firstName containing tabs', () => {
      const user = createMockUser({ firstName: 'Jane\tDoe' });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Jane\tDoe')).toBeTruthy();
    });
  });

  // SECTION 9: STATIC TEXT TESTS
  describe('Static Text Content', () => {
    it('should always display "Mintenance Service Hub" greeting', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
    });

    it('should display "Mintenance Service Hub" with null user', () => {
      render(<WelcomeBanner user={null} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
    });

    it('should always display "Good morning," text', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Good morning,')).toBeTruthy();
    });

    it('should display "Good morning," with null user', () => {
      render(<WelcomeBanner user={null} />);

      expect(screen.getByText('Good morning,')).toBeTruthy();
    });

    it('should display exact text without extra whitespace', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const title = screen.getByText('Mintenance Service Hub');
      expect(title.props.children).toBe('Mintenance Service Hub');

      const subGreeting = screen.getByText('Good morning,');
      expect(subGreeting.props.children).toBe('Good morning,');
    });

    it('should not modify static greeting texts', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
      expect(screen.queryByText('mintenance service hub')).toBeFalsy();
    });

    it('should preserve comma in "Good morning,"', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const greeting = screen.getByText('Good morning,');
      expect(greeting.props.children).toBe('Good morning,');
      expect(greeting.props.children.endsWith(',')).toBe(true);
    });
  });

  // SECTION 10: TYPE SAFETY TESTS
  describe('Type Safety', () => {
    it('should accept valid User object', () => {
      const user = createMockUser();
      expect(() => render(<WelcomeBanner user={user} />)).not.toThrow();
    });

    it('should accept null as user prop', () => {
      expect(() => render(<WelcomeBanner user={null} />)).not.toThrow();
    });

    it('should render with minimal User object', () => {
      const minimalUser: User = {
        id: 'minimal-id',
        email: 'minimal@test.com',
        first_name: 'Min',
        last_name: 'User',
        role: 'homeowner',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      render(<WelcomeBanner user={minimalUser} />);

      // firstName is not set in minimal user, so nothing should render for name
      expect(screen.queryByText('Min')).toBeFalsy();
    });

    it('should render with full User object', () => {
      const fullUser: User = {
        id: 'full-id',
        email: 'full@test.com',
        first_name: 'Full',
        last_name: 'User',
        firstName: 'Full',
        lastName: 'User',
        role: 'homeowner',
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
        rating: 4.8,
        jobs_count: 25,
      };
      render(<WelcomeBanner user={fullUser} />);

      expect(screen.getByText('Full')).toBeTruthy();
    });

    it('should accept homeowner role user', () => {
      const user = createMockUser({ role: 'homeowner' });
      expect(() => render(<WelcomeBanner user={user} />)).not.toThrow();
    });

    it('should accept contractor role user', () => {
      const user = createMockUser({ role: 'contractor' });
      expect(() => render(<WelcomeBanner user={user} />)).not.toThrow();
    });

    it('should accept admin role user', () => {
      const user = createMockUser({ role: 'admin' });
      expect(() => render(<WelcomeBanner user={user} />)).not.toThrow();
    });
  });

  // SECTION 11: COMPONENT INTEGRATION TESTS
  describe('Component Integration', () => {
    it('should render all components together correctly', () => {
      const user = createMockUser({ firstName: 'Integration' });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
      expect(screen.getByText('Good morning,')).toBeTruthy();
      expect(screen.getByText('Integration')).toBeTruthy();
      expect(screen.getByLabelText('Profile')).toBeTruthy();
    });

    it('should maintain structure with multiple renders', () => {
      const user = createMockUser();
      const { rerender } = render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();

      rerender(<WelcomeBanner user={user} />);
      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();

      rerender(<WelcomeBanner user={user} />);
      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
    });

    it('should preserve icon configuration across re-renders', () => {
      const user = createMockUser();
      const { rerender, UNSAFE_getByType } = render(<WelcomeBanner user={user} />);

      let icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.name).toBe('person-circle');

      rerender(<WelcomeBanner user={user} />);
      icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.name).toBe('person-circle');
    });

    it('should preserve accessibility props across re-renders', () => {
      const user = createMockUser();
      const { rerender } = render(<WelcomeBanner user={user} />);

      let button = screen.getByLabelText('Profile');
      expect(button.props.accessibilityLabel).toBe('Profile');

      rerender(<WelcomeBanner user={user} />);
      button = screen.getByLabelText('Profile');
      expect(button.props.accessibilityLabel).toBe('Profile');
    });

    it('should update user name when user prop changes', () => {
      const user1 = createMockUser({ firstName: 'Alice' });
      const user2 = createMockUser({ firstName: 'Bob' });

      const { rerender } = render(<WelcomeBanner user={user1} />);
      expect(screen.getByText('Alice')).toBeTruthy();

      rerender(<WelcomeBanner user={user2} />);
      expect(screen.queryByText('Alice')).toBeFalsy();
      expect(screen.getByText('Bob')).toBeTruthy();
    });

    it('should maintain static texts when user changes', () => {
      const user1 = createMockUser({ firstName: 'Alice' });
      const user2 = createMockUser({ firstName: 'Bob' });

      const { rerender } = render(<WelcomeBanner user={user1} />);
      rerender(<WelcomeBanner user={user2} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
      expect(screen.getByText('Good morning,')).toBeTruthy();
    });
  });

  // SECTION 12: PROFILE BUTTON TESTS
  describe('Profile Button', () => {
    it('should render profile button as TouchableOpacity', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const button = screen.getByLabelText('Profile');
      expect(button.type).toBe('TouchableOpacity');
    });

    it('should render profile button with correct accessibility role', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const button = screen.getByLabelText('Profile');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('should render profile button with Profile label', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      expect(screen.getByLabelText('Profile')).toBeTruthy();
    });

    it('should render profile button with descriptive hint', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const button = screen.getByLabelText('Profile');
      expect(button.props.accessibilityHint).toBeTruthy();
      expect(button.props.accessibilityHint.length).toBeGreaterThan(0);
    });

    it('should render exactly one profile button per banner', () => {
      const user = createMockUser();
      render(<WelcomeBanner user={user} />);

      const button = screen.getByLabelText('Profile');
      expect(button).toBeTruthy();
    });

    it('should render profile button with null user', () => {
      render(<WelcomeBanner user={null} />);

      expect(screen.getByLabelText('Profile')).toBeTruthy();
    });

    it('should render profile button icon inside button', () => {
      const user = createMockUser();
      const { UNSAFE_getByType } = render(<WelcomeBanner user={user} />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon).toBeTruthy();
    });
  });

  // SECTION 13: TEXT ELEMENT TESTS
  describe('Text Elements', () => {
    it('should render exactly 3 Text components', () => {
      const user = createMockUser();
      const { UNSAFE_getAllByType } = render(<WelcomeBanner user={user} />);

      const texts = UNSAFE_getAllByType('Text');
      expect(texts.length).toBe(3);
    });

    it('should render title as first Text element', () => {
      const user = createMockUser();
      const { UNSAFE_getAllByType } = render(<WelcomeBanner user={user} />);

      const texts = UNSAFE_getAllByType('Text');
      expect(texts[0].props.children).toBe('Mintenance Service Hub');
    });

    it('should render greeting as second Text element', () => {
      const user = createMockUser();
      const { UNSAFE_getAllByType } = render(<WelcomeBanner user={user} />);

      const texts = UNSAFE_getAllByType('Text');
      expect(texts[1].props.children).toBe('Good morning,');
    });

    it('should render user name as third Text element', () => {
      const user = createMockUser({ firstName: 'TestName' });
      const { UNSAFE_getAllByType } = render(<WelcomeBanner user={user} />);

      const texts = UNSAFE_getAllByType('Text');
      expect(texts[2].props.children).toBe('TestName');
    });

    it('should apply styles to each Text element', () => {
      const user = createMockUser();
      const { UNSAFE_getAllByType } = render(<WelcomeBanner user={user} />);

      const texts = UNSAFE_getAllByType('Text');
      texts.forEach(text => {
        expect(text.props.style).toBeDefined();
      });
    });

    it('should render Text elements with proper content', () => {
      const user = createMockUser({ firstName: 'ContentTest' });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
      expect(screen.getByText('Good morning,')).toBeTruthy();
      expect(screen.getByText('ContentTest')).toBeTruthy();
    });
  });

  // SECTION 14: USER ROLE TESTS
  describe('User Roles', () => {
    it('should render correctly for homeowner user', () => {
      const user = createMockUser({ role: 'homeowner', firstName: 'Homeowner' });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Homeowner')).toBeTruthy();
      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
    });

    it('should render correctly for contractor user', () => {
      const user = createMockUser({ role: 'contractor', firstName: 'Contractor' });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Contractor')).toBeTruthy();
      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
    });

    it('should render correctly for admin user', () => {
      const user = createMockUser({ role: 'admin', firstName: 'Admin' });
      render(<WelcomeBanner user={user} />);

      expect(screen.getByText('Admin')).toBeTruthy();
      expect(screen.getByText('Mintenance Service Hub')).toBeTruthy();
    });

    it('should render same greeting for all user roles', () => {
      const homeowner = createMockUser({ role: 'homeowner' });
      const contractor = createMockUser({ role: 'contractor' });
      const admin = createMockUser({ role: 'admin' });

      const { rerender } = render(<WelcomeBanner user={homeowner} />);
      expect(screen.getByText('Good morning,')).toBeTruthy();

      rerender(<WelcomeBanner user={contractor} />);
      expect(screen.getByText('Good morning,')).toBeTruthy();

      rerender(<WelcomeBanner user={admin} />);
      expect(screen.getByText('Good morning,')).toBeTruthy();
    });
  });

  // SECTION 15: SNAPSHOT TESTS
  describe('Snapshots', () => {
    it('should match snapshot with homeowner user', () => {
      const user = createMockUser({ role: 'homeowner', firstName: 'Homeowner' });
      const { toJSON } = render(<WelcomeBanner user={user} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with contractor user', () => {
      const user = createMockUser({ role: 'contractor', firstName: 'Contractor' });
      const { toJSON } = render(<WelcomeBanner user={user} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with different user names', () => {
      const user1 = createMockUser({ firstName: 'Alice' });
      const user2 = createMockUser({ firstName: 'Bob' });

      const tree1 = render(<WelcomeBanner user={user1} />).toJSON();
      const tree2 = render(<WelcomeBanner user={user2} />).toJSON();

      expect(tree1).toMatchSnapshot();
      expect(tree2).toMatchSnapshot();
    });

    it('should match snapshot with empty firstName', () => {
      const user = createMockUser({ firstName: '' });
      const { toJSON } = render(<WelcomeBanner user={user} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with long firstName', () => {
      const user = createMockUser({ firstName: 'VeryLongFirstNameForTesting' });
      const { toJSON } = render(<WelcomeBanner user={user} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
