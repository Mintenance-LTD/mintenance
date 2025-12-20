import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Badge, Chip, NotificationBadge } from '../../components/ui/Badge/Badge';

// Mock design tokens
jest.mock('../../design-system/tokens', () => {
  const { designTokens } = require('../../__mocks__/designTokens');
  return { designTokens };
});

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, testID, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text testID={testID || 'icon'}>{name}</Text>;
  },
}));

describe('Badge Component', () => {
  // Basic rendering tests
  describe('Rendering', () => {
    it('renders with default props', () => {
      const { getByText } = render(<Badge>Default Badge</Badge>);
      expect(getByText('Default Badge')).toBeTruthy();
    });

    it('renders with custom text', () => {
      const { getByText } = render(<Badge>Custom Text</Badge>);
      expect(getByText('Custom Text')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = render(
        <Badge testID="test-badge">Test Badge</Badge>
      );
      expect(getByTestId('test-badge')).toBeTruthy();
    });
  });

  // Variant testing
  describe('Variants', () => {
    it('renders primary variant', () => {
      const { getByText } = render(
        <Badge variant="primary">Primary Badge</Badge>
      );
      expect(getByText('Primary Badge')).toBeTruthy();
    });

    it('renders secondary variant', () => {
      const { getByText } = render(
        <Badge variant="secondary">Secondary Badge</Badge>
      );
      expect(getByText('Secondary Badge')).toBeTruthy();
    });

    it('renders success variant', () => {
      const { getByText } = render(
        <Badge variant="success">Success Badge</Badge>
      );
      expect(getByText('Success Badge')).toBeTruthy();
    });

    it('renders error variant', () => {
      const { getByText } = render(
        <Badge variant="error">Error Badge</Badge>
      );
      expect(getByText('Error Badge')).toBeTruthy();
    });

    it('renders warning variant', () => {
      const { getByText } = render(
        <Badge variant="warning">Warning Badge</Badge>
      );
      expect(getByText('Warning Badge')).toBeTruthy();
    });

    it('renders info variant', () => {
      const { getByText } = render(
        <Badge variant="info">Info Badge</Badge>
      );
      expect(getByText('Info Badge')).toBeTruthy();
    });

    it('renders neutral variant', () => {
      const { getByText } = render(
        <Badge variant="neutral">Neutral Badge</Badge>
      );
      expect(getByText('Neutral Badge')).toBeTruthy();
    });
  });

  // Size testing
  describe('Sizes', () => {
    it('renders small size', () => {
      const { getByText } = render(
        <Badge size="sm">Small Badge</Badge>
      );
      expect(getByText('Small Badge')).toBeTruthy();
    });

    it('renders medium size (default)', () => {
      const { getByText } = render(
        <Badge size="md">Medium Badge</Badge>
      );
      expect(getByText('Medium Badge')).toBeTruthy();
    });

    it('renders large size', () => {
      const { getByText } = render(
        <Badge size="lg">Large Badge</Badge>
      );
      expect(getByText('Large Badge')).toBeTruthy();
    });
  });

  // Icon testing
  describe('Icons', () => {
    it('renders with icon', () => {
      const { getByText } = render(
        <Badge icon="star">Badge with Icon</Badge>
      );
      expect(getByText('Badge with Icon')).toBeTruthy();
      expect(getByText('star')).toBeTruthy();
    });

    it('renders without icon', () => {
      const { getByText, queryByText } = render(
        <Badge>Badge without Icon</Badge>
      );
      expect(getByText('Badge without Icon')).toBeTruthy();
      expect(queryByText('star')).toBeNull();
    });
  });

  // Interactive badge testing
  describe('Interactive Badge', () => {
    it('calls onPress when pressed', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <Badge onPress={mockOnPress} testID="pressable-badge">
          Pressable Badge
        </Badge>
      );

      fireEvent.press(getByTestId('pressable-badge'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('has proper accessibility role when pressable', () => {
      const { getByTestId } = render(
        <Badge onPress={() => {}} testID="pressable-badge">
          Pressable Badge
        </Badge>
      );

      const badge = getByTestId('pressable-badge');
      expect(badge.props.accessibilityRole).toBe('button');
    });

    it('has text accessibility role when not pressable', () => {
      const { getByTestId } = render(
        <Badge testID="text-badge">Text Badge</Badge>
      );

      const badge = getByTestId('text-badge');
      expect(badge.props.accessibilityRole).toBe('text');
    });
  });

  // Styling tests
  describe('Styling', () => {
    it('applies rounded style', () => {
      const { getByText } = render(
        <Badge rounded>Rounded Badge</Badge>
      );
      expect(getByText('Rounded Badge')).toBeTruthy();
    });

    it('applies custom style', () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByText } = render(
        <Badge style={customStyle}>Styled Badge</Badge>
      );
      expect(getByText('Styled Badge')).toBeTruthy();
    });

    it('applies custom text style', () => {
      const customTextStyle = { color: 'blue' };
      const { getByText } = render(
        <Badge textStyle={customTextStyle}>Custom Text Style</Badge>
      );
      expect(getByText('Custom Text Style')).toBeTruthy();
    });
  });

  // Accessibility tests
  describe('Accessibility', () => {
    it('has proper accessibility label', () => {
      const { getByTestId } = render(
        <Badge testID="accessible-badge">Accessible Badge</Badge>
      );

      const badge = getByTestId('accessible-badge');
      expect(badge.props.accessibilityLabel).toBe('Accessible Badge');
    });

    it('handles press animations', () => {
      const { getByTestId } = render(
        <Badge onPress={() => {}} testID="animated-badge">
          Animated Badge
        </Badge>
      );

      const badge = getByTestId('animated-badge');
      fireEvent(badge, 'pressIn');
      fireEvent(badge, 'pressOut');

      expect(badge).toBeTruthy();
    });
  });
});

describe('Chip Component', () => {
  // Basic rendering
  describe('Rendering', () => {
    it('renders with default props', () => {
      const { getByText } = render(<Chip>Default Chip</Chip>);
      expect(getByText('Default Chip')).toBeTruthy();
    });

    it('renders selected state', () => {
      const { getByText } = render(
        <Chip selected testID="selected-chip">Selected Chip</Chip>
      );
      expect(getByText('Selected Chip')).toBeTruthy();
    });

    it('renders unselected state', () => {
      const { getByText } = render(
        <Chip selected={false} testID="unselected-chip">Unselected Chip</Chip>
      );
      expect(getByText('Unselected Chip')).toBeTruthy();
    });
  });

  // Delete functionality
  describe('Delete Functionality', () => {
    it('renders delete button when onDelete is provided', () => {
      const mockOnDelete = jest.fn();
      const { getByText } = render(
        <Chip onDelete={mockOnDelete}>Deletable Chip</Chip>
      );

      expect(getByText('Deletable Chip')).toBeTruthy();
      expect(getByText('close')).toBeTruthy(); // Default delete icon
    });

    it('calls onDelete when delete button is pressed', () => {
      const mockOnDelete = jest.fn();
      const { getByText } = render(
        <Chip onDelete={mockOnDelete}>Deletable Chip</Chip>
      );

      fireEvent.press(getByText('close'));
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('renders custom delete icon', () => {
      const mockOnDelete = jest.fn();
      const { getByText } = render(
        <Chip onDelete={mockOnDelete} deleteIcon="trash">
          Custom Delete Chip
        </Chip>
      );

      expect(getByText('trash')).toBeTruthy();
    });

    it('does not render delete button when onDelete is not provided', () => {
      const { getByText, queryByText } = render(
        <Chip>Non-deletable Chip</Chip>
      );

      expect(getByText('Non-deletable Chip')).toBeTruthy();
      expect(queryByText('close')).toBeNull();
    });
  });

  // Interactive functionality
  describe('Interactive Functionality', () => {
    it('calls onPress when chip is pressed', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <Chip onPress={mockOnPress} testID="pressable-chip">
          Pressable Chip
        </Chip>
      );

      fireEvent.press(getByTestId('pressable-chip'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('has button accessibility role when pressable', () => {
      const { getByTestId } = render(
        <Chip onPress={() => {}} testID="pressable-chip">
          Pressable Chip
        </Chip>
      );

      const chip = getByTestId('pressable-chip');
      expect(chip.props.accessibilityRole).toBe('button');
    });
  });
});

describe('NotificationBadge Component', () => {
  // Basic rendering
  describe('Rendering', () => {
    it('renders with count', () => {
      const { getByText } = render(<NotificationBadge count={5} />);
      expect(getByText('5')).toBeTruthy();
    });

    it('does not render when count is 0 and showZero is false', () => {
      const { queryByText } = render(<NotificationBadge count={0} />);
      expect(queryByText('0')).toBeNull();
    });

    it('renders when count is 0 and showZero is true', () => {
      const { getByText } = render(<NotificationBadge count={0} showZero />);
      expect(getByText('0')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = render(
        <NotificationBadge count={3} testID="notification-badge" />
      );
      expect(getByTestId('notification-badge')).toBeTruthy();
    });
  });

  // Count display
  describe('Count Display', () => {
    it('displays exact count when under maxCount', () => {
      const { getByText } = render(<NotificationBadge count={15} maxCount={99} />);
      expect(getByText('15')).toBeTruthy();
    });

    it('displays maxCount+ when over maxCount', () => {
      const { getByText } = render(<NotificationBadge count={150} maxCount={99} />);
      expect(getByText('99+')).toBeTruthy();
    });

    it('displays exact count when equal to maxCount', () => {
      const { getByText } = render(<NotificationBadge count={99} maxCount={99} />);
      expect(getByText('99')).toBeTruthy();
    });

    it('uses default maxCount of 99', () => {
      const { getByText } = render(<NotificationBadge count={150} />);
      expect(getByText('99+')).toBeTruthy();
    });
  });

  // Accessibility
  describe('Accessibility', () => {
    it('has proper accessibility label for single notification', () => {
      const { getByTestId } = render(
        <NotificationBadge count={1} testID="single-notification" />
      );

      const badge = getByTestId('single-notification');
      expect(badge.props.accessibilityLabel).toBe('1 notification');
    });

    it('has proper accessibility label for multiple notifications', () => {
      const { getByTestId } = render(
        <NotificationBadge count={5} testID="multiple-notifications" />
      );

      const badge = getByTestId('multiple-notifications');
      expect(badge.props.accessibilityLabel).toBe('5 notifications');
    });

    it('has text accessibility role', () => {
      const { getByTestId } = render(
        <NotificationBadge count={3} testID="notification-badge" />
      );

      const badge = getByTestId('notification-badge');
      expect(badge.props.accessibilityRole).toBe('text');
    });
  });

  // Variants and sizes
  describe('Variants and Sizes', () => {
    it('renders with different variants', () => {
      const { getByText } = render(
        <NotificationBadge count={5} variant="success" />
      );
      expect(getByText('5')).toBeTruthy();
    });

    it('renders with different sizes', () => {
      const { getByText } = render(
        <NotificationBadge count={3} size="lg" />
      );
      expect(getByText('3')).toBeTruthy();
    });

    it('applies custom style', () => {
      const customStyle = { backgroundColor: 'purple' };
      const { getByText } = render(
        <NotificationBadge count={7} style={customStyle} />
      );
      expect(getByText('7')).toBeTruthy();
    });
  });
});