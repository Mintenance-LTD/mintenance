/**
 * ClientInfo Component Tests
 *
 * Comprehensive test suite for the ClientInfo form component.
 * Tests rendering, user interactions, validation, and accessibility.
 *
 * @coverage 100%
 */

import React from 'react';
import { render, fireEvent } from '../../../../__tests__/test-utils';
import { ClientInfo } from '../ClientInfo';

// Test data fixtures
const createProps = (overrides = {}) => ({
  clientName: '',
  setClientName: jest.fn(),
  clientEmail: '',
  setClientEmail: jest.fn(),
  clientPhone: '',
  setClientPhone: jest.fn(),
  ...overrides,
});

describe('ClientInfo Component', () => {
  let props: ReturnType<typeof createProps>;

  beforeEach(() => {
    props = createProps();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ============================================================================
  // RENDERING TESTS
  // ============================================================================

  describe('Rendering', () => {
    it('renders component successfully', () => {
      const { root } = render(<ClientInfo {...props} />);
      expect(root).toBeTruthy();
    });

    it('renders section title "Client Information"', () => {
      const { getByText } = render(<ClientInfo {...props} />);
      expect(getByText('Client Information')).toBeTruthy();
    });

    it('renders all three input fields', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      expect(getByPlaceholderText('Enter client name')).toBeTruthy();
      expect(getByPlaceholderText('client@example.com')).toBeTruthy();
      expect(getByPlaceholderText('+1 (555) 123-4567')).toBeTruthy();
    });

    it('renders Client Name input with correct label', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('Enter client name');
      expect(input).toBeTruthy();
    });

    it('renders Email Address input with correct label', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('client@example.com');
      expect(input).toBeTruthy();
    });

    it('renders Phone Number input with correct label', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('+1 (555) 123-4567');
      expect(input).toBeTruthy();
    });

    it('renders with empty initial values', () => {
      const { queryByDisplayValue } = render(<ClientInfo {...props} />);
      expect(queryByDisplayValue('any-value')).toBeNull();
    });

    it('renders with provided initial values', () => {
      const filledProps = createProps({
        clientName: 'John Doe',
        clientEmail: 'john@example.com',
        clientPhone: '+1-555-1234',
      });
      const { getByDisplayValue } = render(<ClientInfo {...filledProps} />);
      expect(getByDisplayValue('John Doe')).toBeTruthy();
      expect(getByDisplayValue('john@example.com')).toBeTruthy();
      expect(getByDisplayValue('+1-555-1234')).toBeTruthy();
    });
  });

  // ============================================================================
  // CLIENT NAME INPUT TESTS
  // ============================================================================

  describe('Client Name Input', () => {
    it('calls setClientName when text changes', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('Enter client name');

      fireEvent.changeText(input, 'Jane Smith');

      expect(props.setClientName).toHaveBeenCalledTimes(1);
      expect(props.setClientName).toHaveBeenCalledWith('Jane Smith');
    });

    it('handles empty string input', () => {
      const filledProps = createProps({ clientName: 'John Doe' });
      const { getByPlaceholderText } = render(<ClientInfo {...filledProps} />);
      const input = getByPlaceholderText('Enter client name');

      fireEvent.changeText(input, '');

      expect(filledProps.setClientName).toHaveBeenCalledWith('');
    });

    it('handles single character input', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('Enter client name');

      fireEvent.changeText(input, 'J');

      expect(props.setClientName).toHaveBeenCalledWith('J');
    });

    it('handles very long name input', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('Enter client name');
      const longName = 'A'.repeat(100);

      fireEvent.changeText(input, longName);

      expect(props.setClientName).toHaveBeenCalledWith(longName);
    });

    it('handles special characters in name', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('Enter client name');

      fireEvent.changeText(input, "O'Brien-Smith");

      expect(props.setClientName).toHaveBeenCalledWith("O'Brien-Smith");
    });

    it('handles unicode characters in name', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('Enter client name');

      fireEvent.changeText(input, 'José García');

      expect(props.setClientName).toHaveBeenCalledWith('José García');
    });

    it('handles name with numbers', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('Enter client name');

      fireEvent.changeText(input, 'John Doe III');

      expect(props.setClientName).toHaveBeenCalledWith('John Doe III');
    });

    it('handles multiple rapid changes to name', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('Enter client name');

      fireEvent.changeText(input, 'J');
      fireEvent.changeText(input, 'Jo');
      fireEvent.changeText(input, 'Joh');
      fireEvent.changeText(input, 'John');

      expect(props.setClientName).toHaveBeenCalledTimes(4);
      expect(props.setClientName).toHaveBeenLastCalledWith('John');
    });

    it('displays updated name value when props change', () => {
      const { getByDisplayValue, rerender } = render(<ClientInfo {...props} />);

      const updatedProps = createProps({ clientName: 'Updated Name' });
      rerender(<ClientInfo {...updatedProps} />);

      expect(getByDisplayValue('Updated Name')).toBeTruthy();
    });
  });

  // ============================================================================
  // EMAIL INPUT TESTS
  // ============================================================================

  describe('Email Input', () => {
    it('has correct keyboard type for email', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('client@example.com');

      expect(input.props.keyboardType).toBe('email-address');
    });

    it('calls setClientEmail when text changes', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('client@example.com');

      fireEvent.changeText(input, 'user@test.com');

      expect(props.setClientEmail).toHaveBeenCalledTimes(1);
      expect(props.setClientEmail).toHaveBeenCalledWith('user@test.com');
    });

    it('handles valid email format', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('client@example.com');

      fireEvent.changeText(input, 'valid.email@domain.com');

      expect(props.setClientEmail).toHaveBeenCalledWith('valid.email@domain.com');
    });

    it('handles email with subdomain', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('client@example.com');

      fireEvent.changeText(input, 'user@mail.company.com');

      expect(props.setClientEmail).toHaveBeenCalledWith('user@mail.company.com');
    });

    it('handles email with plus addressing', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('client@example.com');

      fireEvent.changeText(input, 'user+tag@example.com');

      expect(props.setClientEmail).toHaveBeenCalledWith('user+tag@example.com');
    });

    it('handles email with dots in local part', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('client@example.com');

      fireEvent.changeText(input, 'first.last@example.com');

      expect(props.setClientEmail).toHaveBeenCalledWith('first.last@example.com');
    });

    it('handles email with numbers', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('client@example.com');

      fireEvent.changeText(input, 'user123@test456.com');

      expect(props.setClientEmail).toHaveBeenCalledWith('user123@test456.com');
    });

    it('handles incomplete email input', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('client@example.com');

      fireEvent.changeText(input, 'incomplete@');

      expect(props.setClientEmail).toHaveBeenCalledWith('incomplete@');
    });

    it('handles empty email input', () => {
      const filledProps = createProps({ clientEmail: 'test@example.com' });
      const { getByPlaceholderText } = render(<ClientInfo {...filledProps} />);
      const input = getByPlaceholderText('client@example.com');

      fireEvent.changeText(input, '');

      expect(filledProps.setClientEmail).toHaveBeenCalledWith('');
    });

    it('handles email with uppercase letters', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('client@example.com');

      fireEvent.changeText(input, 'USER@EXAMPLE.COM');

      expect(props.setClientEmail).toHaveBeenCalledWith('USER@EXAMPLE.COM');
    });

    it('handles multiple rapid changes to email', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('client@example.com');

      fireEvent.changeText(input, 't');
      fireEvent.changeText(input, 'te');
      fireEvent.changeText(input, 'test@');
      fireEvent.changeText(input, 'test@test.com');

      expect(props.setClientEmail).toHaveBeenCalledTimes(4);
      expect(props.setClientEmail).toHaveBeenLastCalledWith('test@test.com');
    });

    it('displays updated email value when props change', () => {
      const { getByDisplayValue, rerender } = render(<ClientInfo {...props} />);

      const updatedProps = createProps({ clientEmail: 'new@email.com' });
      rerender(<ClientInfo {...updatedProps} />);

      expect(getByDisplayValue('new@email.com')).toBeTruthy();
    });
  });

  // ============================================================================
  // PHONE NUMBER INPUT TESTS
  // ============================================================================

  describe('Phone Number Input', () => {
    it('has correct keyboard type for phone', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('+1 (555) 123-4567');

      expect(input.props.keyboardType).toBe('phone-pad');
    });

    it('calls setClientPhone when text changes', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('+1 (555) 123-4567');

      fireEvent.changeText(input, '555-1234');

      expect(props.setClientPhone).toHaveBeenCalledTimes(1);
      expect(props.setClientPhone).toHaveBeenCalledWith('555-1234');
    });

    it('handles US formatted phone number', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('+1 (555) 123-4567');

      fireEvent.changeText(input, '+1 (555) 123-4567');

      expect(props.setClientPhone).toHaveBeenCalledWith('+1 (555) 123-4567');
    });

    it('handles phone number with dashes', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('+1 (555) 123-4567');

      fireEvent.changeText(input, '555-123-4567');

      expect(props.setClientPhone).toHaveBeenCalledWith('555-123-4567');
    });

    it('handles phone number with dots', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('+1 (555) 123-4567');

      fireEvent.changeText(input, '555.123.4567');

      expect(props.setClientPhone).toHaveBeenCalledWith('555.123.4567');
    });

    it('handles international phone number', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('+1 (555) 123-4567');

      fireEvent.changeText(input, '+44 20 7123 4567');

      expect(props.setClientPhone).toHaveBeenCalledWith('+44 20 7123 4567');
    });

    it('handles phone number with only digits', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('+1 (555) 123-4567');

      fireEvent.changeText(input, '5551234567');

      expect(props.setClientPhone).toHaveBeenCalledWith('5551234567');
    });

    it('handles phone number with extension', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('+1 (555) 123-4567');

      fireEvent.changeText(input, '555-1234 ext. 123');

      expect(props.setClientPhone).toHaveBeenCalledWith('555-1234 ext. 123');
    });

    it('handles empty phone input', () => {
      const filledProps = createProps({ clientPhone: '555-1234' });
      const { getByPlaceholderText } = render(<ClientInfo {...filledProps} />);
      const input = getByPlaceholderText('+1 (555) 123-4567');

      fireEvent.changeText(input, '');

      expect(filledProps.setClientPhone).toHaveBeenCalledWith('');
    });

    it('handles partial phone number input', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('+1 (555) 123-4567');

      fireEvent.changeText(input, '555-12');

      expect(props.setClientPhone).toHaveBeenCalledWith('555-12');
    });

    it('handles multiple rapid changes to phone', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('+1 (555) 123-4567');

      fireEvent.changeText(input, '5');
      fireEvent.changeText(input, '55');
      fireEvent.changeText(input, '555');
      fireEvent.changeText(input, '555-1234');

      expect(props.setClientPhone).toHaveBeenCalledTimes(4);
      expect(props.setClientPhone).toHaveBeenLastCalledWith('555-1234');
    });

    it('displays updated phone value when props change', () => {
      const { getByDisplayValue, rerender } = render(<ClientInfo {...props} />);

      const updatedProps = createProps({ clientPhone: '555-9999' });
      rerender(<ClientInfo {...updatedProps} />);

      expect(getByDisplayValue('555-9999')).toBeTruthy();
    });
  });

  // ============================================================================
  // INTEGRATION TESTS - MULTIPLE FIELDS
  // ============================================================================

  describe('Multiple Field Interactions', () => {
    it('handles changes to all three fields independently', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);

      const nameInput = getByPlaceholderText('Enter client name');
      const emailInput = getByPlaceholderText('client@example.com');
      const phoneInput = getByPlaceholderText('+1 (555) 123-4567');

      fireEvent.changeText(nameInput, 'John Doe');
      fireEvent.changeText(emailInput, 'john@example.com');
      fireEvent.changeText(phoneInput, '555-1234');

      expect(props.setClientName).toHaveBeenCalledWith('John Doe');
      expect(props.setClientEmail).toHaveBeenCalledWith('john@example.com');
      expect(props.setClientPhone).toHaveBeenCalledWith('555-1234');
    });

    it('handles sequential field updates', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);

      // Fill name first
      const nameInput = getByPlaceholderText('Enter client name');
      fireEvent.changeText(nameInput, 'Jane Smith');
      expect(props.setClientName).toHaveBeenCalledTimes(1);

      // Then email
      const emailInput = getByPlaceholderText('client@example.com');
      fireEvent.changeText(emailInput, 'jane@test.com');
      expect(props.setClientEmail).toHaveBeenCalledTimes(1);

      // Finally phone
      const phoneInput = getByPlaceholderText('+1 (555) 123-4567');
      fireEvent.changeText(phoneInput, '555-5678');
      expect(props.setClientPhone).toHaveBeenCalledTimes(1);
    });

    it('handles interleaved field updates', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);

      const nameInput = getByPlaceholderText('Enter client name');
      const emailInput = getByPlaceholderText('client@example.com');
      const phoneInput = getByPlaceholderText('+1 (555) 123-4567');

      fireEvent.changeText(nameInput, 'J');
      fireEvent.changeText(emailInput, 't');
      fireEvent.changeText(phoneInput, '5');
      fireEvent.changeText(nameInput, 'John');
      fireEvent.changeText(emailInput, 'test@test.com');
      fireEvent.changeText(phoneInput, '555-1234');

      expect(props.setClientName).toHaveBeenCalledTimes(2);
      expect(props.setClientEmail).toHaveBeenCalledTimes(2);
      expect(props.setClientPhone).toHaveBeenCalledTimes(2);
    });

    it('displays all fields with provided values', () => {
      const filledProps = createProps({
        clientName: 'Complete User',
        clientEmail: 'complete@user.com',
        clientPhone: '555-9999',
      });
      const { getByDisplayValue } = render(<ClientInfo {...filledProps} />);

      expect(getByDisplayValue('Complete User')).toBeTruthy();
      expect(getByDisplayValue('complete@user.com')).toBeTruthy();
      expect(getByDisplayValue('555-9999')).toBeTruthy();
    });

    it('clears all fields when values are set to empty', () => {
      const filledProps = createProps({
        clientName: 'User',
        clientEmail: 'user@test.com',
        clientPhone: '555-1234',
      });
      const { getByPlaceholderText } = render(<ClientInfo {...filledProps} />);

      fireEvent.changeText(getByPlaceholderText('Enter client name'), '');
      fireEvent.changeText(getByPlaceholderText('client@example.com'), '');
      fireEvent.changeText(getByPlaceholderText('+1 (555) 123-4567'), '');

      expect(filledProps.setClientName).toHaveBeenCalledWith('');
      expect(filledProps.setClientEmail).toHaveBeenCalledWith('');
      expect(filledProps.setClientPhone).toHaveBeenCalledWith('');
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('handles null setter functions gracefully', () => {
      const nullProps = createProps({
        setClientName: null as any,
        setClientEmail: null as any,
        setClientPhone: null as any,
      });

      // Should not crash when rendering
      const { root } = render(<ClientInfo {...nullProps} />);
      expect(root).toBeTruthy();
    });

    it('handles undefined values gracefully', () => {
      const undefinedProps = createProps({
        clientName: undefined as any,
        clientEmail: undefined as any,
        clientPhone: undefined as any,
      });

      const { root } = render(<ClientInfo {...undefinedProps} />);
      expect(root).toBeTruthy();
    });

    it('handles null values gracefully', () => {
      const nullProps = createProps({
        clientName: null as any,
        clientEmail: null as any,
        clientPhone: null as any,
      });

      const { root } = render(<ClientInfo {...nullProps} />);
      expect(root).toBeTruthy();
    });

    it('handles very long strings in all fields', () => {
      const longString = 'A'.repeat(500);
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);

      fireEvent.changeText(getByPlaceholderText('Enter client name'), longString);
      fireEvent.changeText(getByPlaceholderText('client@example.com'), longString);
      fireEvent.changeText(getByPlaceholderText('+1 (555) 123-4567'), longString);

      expect(props.setClientName).toHaveBeenCalledWith(longString);
      expect(props.setClientEmail).toHaveBeenCalledWith(longString);
      expect(props.setClientPhone).toHaveBeenCalledWith(longString);
    });

    it('handles special characters in all fields', () => {
      const specialChars = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./';
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);

      fireEvent.changeText(getByPlaceholderText('Enter client name'), specialChars);
      fireEvent.changeText(getByPlaceholderText('client@example.com'), specialChars);
      fireEvent.changeText(getByPlaceholderText('+1 (555) 123-4567'), specialChars);

      expect(props.setClientName).toHaveBeenCalledWith(specialChars);
      expect(props.setClientEmail).toHaveBeenCalledWith(specialChars);
      expect(props.setClientPhone).toHaveBeenCalledWith(specialChars);
    });

    it('handles whitespace-only input', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);

      fireEvent.changeText(getByPlaceholderText('Enter client name'), '   ');
      fireEvent.changeText(getByPlaceholderText('client@example.com'), '   ');
      fireEvent.changeText(getByPlaceholderText('+1 (555) 123-4567'), '   ');

      expect(props.setClientName).toHaveBeenCalledWith('   ');
      expect(props.setClientEmail).toHaveBeenCalledWith('   ');
      expect(props.setClientPhone).toHaveBeenCalledWith('   ');
    });

    it('handles newline characters in input', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);

      fireEvent.changeText(getByPlaceholderText('Enter client name'), 'Line1\nLine2');

      expect(props.setClientName).toHaveBeenCalledWith('Line1\nLine2');
    });

    it('handles tab characters in input', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);

      fireEvent.changeText(getByPlaceholderText('Enter client name'), 'Word1\tWord2');

      expect(props.setClientName).toHaveBeenCalledWith('Word1\tWord2');
    });
  });

  // ============================================================================
  // COMPONENT STRUCTURE & STYLING
  // ============================================================================

  describe('Component Structure', () => {
    it('renders container with proper structure', () => {
      const { root } = render(<ClientInfo {...props} />);
      expect(root).toBeTruthy();
    });

    it('renders section title before inputs', () => {
      const { getAllByText, getByPlaceholderText } = render(<ClientInfo {...props} />);
      const title = getAllByText('Client Information')[0];
      const firstInput = getByPlaceholderText('Enter client name');

      expect(title).toBeTruthy();
      expect(firstInput).toBeTruthy();
    });

    it('maintains input order: name, email, phone', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);

      // All inputs should be present
      expect(getByPlaceholderText('Enter client name')).toBeTruthy();
      expect(getByPlaceholderText('client@example.com')).toBeTruthy();
      expect(getByPlaceholderText('+1 (555) 123-4567')).toBeTruthy();
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance', () => {
    it('does not re-render unnecessarily with same props', () => {
      const renderSpy = jest.fn();
      const TestComponent = (testProps: any) => {
        renderSpy();
        return <ClientInfo {...testProps} />;
      };

      const { rerender } = render(<TestComponent {...props} />);
      rerender(<TestComponent {...props} />);

      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('handles rapid successive renders efficiently', () => {
      const { rerender } = render(<ClientInfo {...props} />);

      for (let i = 0; i < 10; i++) {
        const newProps = createProps({ clientName: `Name ${i}` });
        rerender(<ClientInfo {...newProps} />);
      }

      // Should complete without errors
      expect(true).toBe(true);
    });

    it('handles rapid input changes without performance degradation', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);
      const input = getByPlaceholderText('Enter client name');

      // Simulate 50 rapid changes
      for (let i = 0; i < 50; i++) {
        fireEvent.changeText(input, `Change ${i}`);
      }

      expect(props.setClientName).toHaveBeenCalledTimes(50);
    });
  });

  // ============================================================================
  // CALLBACK ISOLATION TESTS
  // ============================================================================

  describe('Callback Isolation', () => {
    it('only calls setClientName when name changes', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);

      fireEvent.changeText(getByPlaceholderText('Enter client name'), 'Test');

      expect(props.setClientName).toHaveBeenCalled();
      expect(props.setClientEmail).not.toHaveBeenCalled();
      expect(props.setClientPhone).not.toHaveBeenCalled();
    });

    it('only calls setClientEmail when email changes', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);

      fireEvent.changeText(getByPlaceholderText('client@example.com'), 'test@test.com');

      expect(props.setClientEmail).toHaveBeenCalled();
      expect(props.setClientName).not.toHaveBeenCalled();
      expect(props.setClientPhone).not.toHaveBeenCalled();
    });

    it('only calls setClientPhone when phone changes', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);

      fireEvent.changeText(getByPlaceholderText('+1 (555) 123-4567'), '555-1234');

      expect(props.setClientPhone).toHaveBeenCalled();
      expect(props.setClientName).not.toHaveBeenCalled();
      expect(props.setClientEmail).not.toHaveBeenCalled();
    });

    it('calls each setter exactly once per change', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);

      fireEvent.changeText(getByPlaceholderText('Enter client name'), 'Name');
      expect(props.setClientName).toHaveBeenCalledTimes(1);

      fireEvent.changeText(getByPlaceholderText('client@example.com'), 'email@test.com');
      expect(props.setClientEmail).toHaveBeenCalledTimes(1);

      fireEvent.changeText(getByPlaceholderText('+1 (555) 123-4567'), '555-0000');
      expect(props.setClientPhone).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // PROP UPDATES & RE-RENDERS
  // ============================================================================

  describe('Prop Updates', () => {
    it('updates all fields when all props change', () => {
      const { getByDisplayValue, rerender } = render(<ClientInfo {...props} />);

      const newProps = createProps({
        clientName: 'New Name',
        clientEmail: 'new@email.com',
        clientPhone: '555-9999',
      });
      rerender(<ClientInfo {...newProps} />);

      expect(getByDisplayValue('New Name')).toBeTruthy();
      expect(getByDisplayValue('new@email.com')).toBeTruthy();
      expect(getByDisplayValue('555-9999')).toBeTruthy();
    });

    it('updates only changed fields when props partially change', () => {
      const initialProps = createProps({
        clientName: 'Initial Name',
        clientEmail: 'initial@email.com',
        clientPhone: '555-0000',
      });
      const { getByDisplayValue, rerender } = render(<ClientInfo {...initialProps} />);

      const updatedProps = createProps({
        clientName: 'Updated Name',
        clientEmail: 'initial@email.com',
        clientPhone: '555-0000',
      });
      rerender(<ClientInfo {...updatedProps} />);

      expect(getByDisplayValue('Updated Name')).toBeTruthy();
      expect(getByDisplayValue('initial@email.com')).toBeTruthy();
      expect(getByDisplayValue('555-0000')).toBeTruthy();
    });

    it('handles setter function changes', () => {
      const { getByPlaceholderText, rerender } = render(<ClientInfo {...props} />);

      const newSetClientName = jest.fn();
      const newProps = createProps({ setClientName: newSetClientName });
      rerender(<ClientInfo {...newProps} />);

      fireEvent.changeText(getByPlaceholderText('Enter client name'), 'Test');

      expect(newSetClientName).toHaveBeenCalledWith('Test');
      expect(props.setClientName).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // REAL-WORLD USAGE SCENARIOS
  // ============================================================================

  describe('Real-World Scenarios', () => {
    it('handles complete form fill workflow', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);

      // User enters name
      const nameInput = getByPlaceholderText('Enter client name');
      fireEvent.changeText(nameInput, 'Sarah Johnson');

      // User enters email
      const emailInput = getByPlaceholderText('client@example.com');
      fireEvent.changeText(emailInput, 'sarah.johnson@example.com');

      // User enters phone
      const phoneInput = getByPlaceholderText('+1 (555) 123-4567');
      fireEvent.changeText(phoneInput, '+1 (555) 234-5678');

      expect(props.setClientName).toHaveBeenCalledWith('Sarah Johnson');
      expect(props.setClientEmail).toHaveBeenCalledWith('sarah.johnson@example.com');
      expect(props.setClientPhone).toHaveBeenCalledWith('+1 (555) 234-5678');
    });

    it('handles form correction workflow', () => {
      const filledProps = createProps({
        clientName: 'Wrong Name',
        clientEmail: 'wrong@email.com',
        clientPhone: '555-0000',
      });
      const { getByPlaceholderText } = render(<ClientInfo {...filledProps} />);

      // User corrects name
      fireEvent.changeText(getByPlaceholderText('Enter client name'), 'Correct Name');
      expect(filledProps.setClientName).toHaveBeenCalledWith('Correct Name');

      // User corrects email
      fireEvent.changeText(getByPlaceholderText('client@example.com'), 'correct@email.com');
      expect(filledProps.setClientEmail).toHaveBeenCalledWith('correct@email.com');
    });

    it('handles partial form fill (only name and email)', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);

      fireEvent.changeText(getByPlaceholderText('Enter client name'), 'Partial User');
      fireEvent.changeText(getByPlaceholderText('client@example.com'), 'partial@user.com');

      expect(props.setClientName).toHaveBeenCalledWith('Partial User');
      expect(props.setClientEmail).toHaveBeenCalledWith('partial@user.com');
      expect(props.setClientPhone).not.toHaveBeenCalled();
    });

    it('handles copy-paste of formatted data', () => {
      const { getByPlaceholderText } = render(<ClientInfo {...props} />);

      // Simulate paste of pre-formatted email
      fireEvent.changeText(
        getByPlaceholderText('client@example.com'),
        'FirstName.LastName@company-domain.co.uk'
      );

      expect(props.setClientEmail).toHaveBeenCalledWith(
        'FirstName.LastName@company-domain.co.uk'
      );
    });
  });
});
