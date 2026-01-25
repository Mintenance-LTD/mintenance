/**
 * DateTimeSelector Component Tests
 *
 * Comprehensive test suite for DateTimeSelector component
 * Target: 100% coverage
 *
 * @filesize Target: <400 lines
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { DateTimeSelector } from '../DateTimeSelector';

// Mock dependencies
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('../../../../theme', () => ({
  theme: {
    colors: {
      primary: '#007AFF',
      textPrimary: '#000000',
      textSecondary: '#666666',
      textTertiary: '#999999',
      surface: '#FFFFFF',
      surfaceTertiary: '#F5F5F5',
    },
    spacing: {
      md: 12,
      lg: 16,
    },
    borderRadius: {
      lg: 12,
      md: 8,
    },
    typography: {
      fontSize: {
        sm: 12,
        md: 14,
        xl: 20,
      },
      fontWeight: {
        medium: '500',
        semibold: '600',
      },
    },
    shadows: {
      sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    },
  },
}));

describe('DateTimeSelector Component', () => {
  const mockOnDateChange = jest.fn();
  const mockOnTimeChange = jest.fn();
  const mockOnShowDatePicker = jest.fn();
  const mockOnShowTimePicker = jest.fn();

  // Deterministic dates for testing
  const fixedDate = new Date('2026-03-15T10:00:00.000Z');
  const fixedTime = new Date('2026-03-15T14:30:00.000Z');

  const defaultProps = {
    selectedDate: fixedDate,
    selectedTime: fixedTime,
    showDatePicker: false,
    showTimePicker: false,
    onDateChange: mockOnDateChange,
    onTimeChange: mockOnTimeChange,
    onShowDatePicker: mockOnShowDatePicker,
    onShowTimePicker: mockOnShowTimePicker,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<DateTimeSelector {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render root element with correct structure', () => {
      const { root } = render(<DateTimeSelector {...defaultProps} />);
      expect(root).toBeTruthy();
    });

    it('should render section title "Date & Time"', () => {
      const { getByText } = render(<DateTimeSelector {...defaultProps} />);
      expect(getByText('Date & Time')).toBeTruthy();
    });

    it('should render date selector button', () => {
      const { getByText } = render(<DateTimeSelector {...defaultProps} />);
      expect(getByText('Date')).toBeTruthy();
    });

    it('should render time selector button', () => {
      const { getByText } = render(<DateTimeSelector {...defaultProps} />);
      expect(getByText('Time')).toBeTruthy();
    });

    it('should match snapshot in default state', () => {
      const { toJSON } = render(<DateTimeSelector {...defaultProps} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render both date and time icons', () => {
      const { UNSAFE_getAllByType } = render(<DateTimeSelector {...defaultProps} />);
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const calendarIcon = icons.find((icon: any) => icon.props.name === 'calendar-outline');
      const timeIcon = icons.find((icon: any) => icon.props.name === 'time-outline');
      expect(calendarIcon).toBeTruthy();
      expect(timeIcon).toBeTruthy();
    });

    it('should render chevron icons', () => {
      const { UNSAFE_getAllByType } = render(<DateTimeSelector {...defaultProps} />);
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const chevronIcons = icons.filter((icon: any) => icon.props.name === 'chevron-down');
      expect(chevronIcons).toHaveLength(2);
    });
  });

  describe('Date Display', () => {
    it('should display formatted date', () => {
      const { getByText } = render(<DateTimeSelector {...defaultProps} />);
      // Date format: "weekday, month day, year" in en-US locale
      expect(getByText(/March|Saturday/)).toBeTruthy();
    });

    it('should update date display when selectedDate changes', () => {
      const { rerender, getByText } = render(<DateTimeSelector {...defaultProps} />);

      const newDate = new Date('2026-06-20T10:00:00.000Z');
      rerender(<DateTimeSelector {...defaultProps} selectedDate={newDate} />);

      expect(getByText(/June|Saturday/)).toBeTruthy();
    });

    it('should format date with all components', () => {
      const { getByText } = render(<DateTimeSelector {...defaultProps} />);
      // Should include weekday, month, day, and year
      const dateText = getByText(/2026/);
      expect(dateText).toBeTruthy();
    });

    it('should handle different year formats', () => {
      const date2025 = new Date('2025-01-01T10:00:00.000Z');
      const { getByText } = render(
        <DateTimeSelector {...defaultProps} selectedDate={date2025} />
      );
      expect(getByText(/2025/)).toBeTruthy();
    });

    it('should handle different months', () => {
      const months = [
        { date: new Date('2026-01-15T10:00:00.000Z'), text: /January/ },
        { date: new Date('2026-12-15T10:00:00.000Z'), text: /December/ },
      ];

      months.forEach(({ date, text }) => {
        const { getByText } = render(
          <DateTimeSelector {...defaultProps} selectedDate={date} />
        );
        expect(getByText(text)).toBeTruthy();
      });
    });

    it('should handle different days', () => {
      const firstDay = new Date('2026-03-01T10:00:00.000Z');
      const lastDay = new Date('2026-03-31T10:00:00.000Z');

      const { rerender, queryByText } = render(
        <DateTimeSelector {...defaultProps} selectedDate={firstDay} />
      );
      expect(queryByText(/March/)).toBeTruthy();

      rerender(<DateTimeSelector {...defaultProps} selectedDate={lastDay} />);
      expect(queryByText(/March/)).toBeTruthy();
    });

    it('should handle leap year dates', () => {
      const leapDay = new Date('2024-02-29T10:00:00.000Z');
      const { getByText } = render(
        <DateTimeSelector {...defaultProps} selectedDate={leapDay} />
      );
      expect(getByText(/February/)).toBeTruthy();
      expect(getByText(/2024/)).toBeTruthy();
    });

    it('should display date in correct locale format', () => {
      const { getByText } = render(<DateTimeSelector {...defaultProps} />);
      // en-US locale should use "Month Day, Year" format
      const dateElement = getByText(/March/);
      expect(dateElement).toBeTruthy();
    });
  });

  describe('Time Display', () => {
    it('should display formatted time', () => {
      const { getByText } = render(<DateTimeSelector {...defaultProps} />);
      // Time should include AM/PM
      expect(getByText(/PM|AM/)).toBeTruthy();
    });

    it('should update time display when selectedTime changes', () => {
      const { rerender, getByText } = render(<DateTimeSelector {...defaultProps} />);

      const newTime = new Date('2026-03-15T09:15:00.000Z');
      rerender(<DateTimeSelector {...defaultProps} selectedTime={newTime} />);

      expect(getByText(/AM|PM/)).toBeTruthy();
    });

    it('should format time with hour and minute', () => {
      const { getByText } = render(<DateTimeSelector {...defaultProps} />);
      expect(getByText(/:/)).toBeTruthy();
    });

    it('should display AM time correctly', () => {
      const amTime = new Date('2026-03-15T09:30:00.000Z');
      const { getByText } = render(
        <DateTimeSelector {...defaultProps} selectedTime={amTime} />
      );
      expect(getByText(/AM/)).toBeTruthy();
    });

    it('should display PM time correctly', () => {
      const pmTime = new Date('2026-03-15T15:45:00.000Z');
      const { getByText } = render(
        <DateTimeSelector {...defaultProps} selectedTime={pmTime} />
      );
      expect(getByText(/PM/)).toBeTruthy();
    });

    it('should handle midnight correctly', () => {
      const midnight = new Date('2026-03-15T00:00:00.000Z');
      const { getByText } = render(
        <DateTimeSelector {...defaultProps} selectedTime={midnight} />
      );
      expect(getByText(/12:00/)).toBeTruthy();
    });

    it('should handle noon correctly', () => {
      const noon = new Date('2026-03-15T12:00:00.000Z');
      const { getByText } = render(
        <DateTimeSelector {...defaultProps} selectedTime={noon} />
      );
      expect(getByText(/12:00/)).toBeTruthy();
    });

    it('should format minutes with 2 digits', () => {
      const timeWithSingleDigitMinute = new Date('2026-03-15T14:05:00.000Z');
      const { getByText } = render(
        <DateTimeSelector {...defaultProps} selectedTime={timeWithSingleDigitMinute} />
      );
      expect(getByText(/:05/)).toBeTruthy();
    });

    it('should handle different hours throughout the day', () => {
      const times = [
        new Date('2026-03-15T06:00:00.000Z'),
        new Date('2026-03-15T13:00:00.000Z'),
        new Date('2026-03-15T18:00:00.000Z'),
        new Date('2026-03-15T23:59:00.000Z'),
      ];

      times.forEach(time => {
        const { getByText } = render(
          <DateTimeSelector {...defaultProps} selectedTime={time} />
        );
        expect(getByText(/AM|PM/)).toBeTruthy();
      });
    });
  });

  describe('Date Picker Interaction', () => {
    it('should call onShowDatePicker when date button is pressed', () => {
      const { getByText } = render(<DateTimeSelector {...defaultProps} />);
      fireEvent.press(getByText('Date'));
      expect(mockOnShowDatePicker).toHaveBeenCalledTimes(1);
      expect(mockOnShowDatePicker).toHaveBeenCalledWith(true);
    });

    it('should show DateTimePicker when showDatePicker is true', () => {
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={true} />
      );
      const datePickers = UNSAFE_getAllByType('DateTimePicker' as any);
      expect(datePickers.length).toBeGreaterThan(0);
    });

    it('should not show DateTimePicker when showDatePicker is false', () => {
      const { UNSAFE_queryAllByType } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={false} />
      );
      const datePickers = UNSAFE_queryAllByType('DateTimePicker' as any);
      expect(datePickers.length).toBe(0);
    });

    it('should configure date picker with correct mode', () => {
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={true} />
      );
      const datePicker = UNSAFE_getAllByType('DateTimePicker' as any)[0];
      expect(datePicker.props.mode).toBe('date');
    });

    it('should pass correct value to date picker', () => {
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={true} />
      );
      const datePicker = UNSAFE_getAllByType('DateTimePicker' as any)[0];
      expect(datePicker.props.value).toBe(fixedDate);
    });

    it('should set minimumDate to current date', () => {
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={true} />
      );
      const datePicker = UNSAFE_getAllByType('DateTimePicker' as any)[0];
      expect(datePicker.props.minimumDate).toBeInstanceOf(Date);
    });

    it('should use spinner display on iOS', () => {
      Platform.OS = 'ios';
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={true} />
      );
      const datePicker = UNSAFE_getAllByType('DateTimePicker' as any)[0];
      expect(datePicker.props.display).toBe('spinner');
    });

    it('should use default display on Android', () => {
      Platform.OS = 'android';
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={true} />
      );
      const datePicker = UNSAFE_getAllByType('DateTimePicker' as any)[0];
      expect(datePicker.props.display).toBe('default');
    });

    it('should call onDateChange when date is selected', () => {
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={true} />
      );
      const datePicker = UNSAFE_getAllByType('DateTimePicker' as any)[0];
      const newDate = new Date('2026-04-20T10:00:00.000Z');

      datePicker.props.onChange({}, newDate);

      expect(mockOnShowDatePicker).toHaveBeenCalledWith(false);
      expect(mockOnDateChange).toHaveBeenCalledWith(newDate);
    });

    it('should close picker without calling onDateChange when cancelled', () => {
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={true} />
      );
      const datePicker = UNSAFE_getAllByType('DateTimePicker' as any)[0];

      datePicker.props.onChange({}, undefined);

      expect(mockOnShowDatePicker).toHaveBeenCalledWith(false);
      expect(mockOnDateChange).not.toHaveBeenCalled();
    });

    it('should handle multiple date selections', () => {
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={true} />
      );
      const datePicker = UNSAFE_getAllByType('DateTimePicker' as any)[0];

      const date1 = new Date('2026-04-01T10:00:00.000Z');
      const date2 = new Date('2026-05-01T10:00:00.000Z');

      datePicker.props.onChange({}, date1);
      datePicker.props.onChange({}, date2);

      expect(mockOnDateChange).toHaveBeenCalledTimes(2);
      expect(mockOnDateChange).toHaveBeenNthCalledWith(1, date1);
      expect(mockOnDateChange).toHaveBeenNthCalledWith(2, date2);
    });
  });

  describe('Time Picker Interaction', () => {
    it('should call onShowTimePicker when time button is pressed', () => {
      const { getByText } = render(<DateTimeSelector {...defaultProps} />);
      fireEvent.press(getByText('Time'));
      expect(mockOnShowTimePicker).toHaveBeenCalledTimes(1);
      expect(mockOnShowTimePicker).toHaveBeenCalledWith(true);
    });

    it('should show DateTimePicker when showTimePicker is true', () => {
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showTimePicker={true} />
      );
      const timePickers = UNSAFE_getAllByType('DateTimePicker' as any);
      expect(timePickers.length).toBeGreaterThan(0);
    });

    it('should not show TimePicker when showTimePicker is false', () => {
      const { UNSAFE_queryAllByType } = render(
        <DateTimeSelector {...defaultProps} showTimePicker={false} />
      );
      const timePickers = UNSAFE_queryAllByType('DateTimePicker' as any);
      expect(timePickers.length).toBe(0);
    });

    it('should configure time picker with correct mode', () => {
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showTimePicker={true} />
      );
      const timePicker = UNSAFE_getAllByType('DateTimePicker' as any)[0];
      expect(timePicker.props.mode).toBe('time');
    });

    it('should pass correct value to time picker', () => {
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showTimePicker={true} />
      );
      const timePicker = UNSAFE_getAllByType('DateTimePicker' as any)[0];
      expect(timePicker.props.value).toBe(fixedTime);
    });

    it('should use spinner display on iOS for time picker', () => {
      Platform.OS = 'ios';
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showTimePicker={true} />
      );
      const timePicker = UNSAFE_getAllByType('DateTimePicker' as any)[0];
      expect(timePicker.props.display).toBe('spinner');
    });

    it('should use default display on Android for time picker', () => {
      Platform.OS = 'android';
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showTimePicker={true} />
      );
      const timePicker = UNSAFE_getAllByType('DateTimePicker' as any)[0];
      expect(timePicker.props.display).toBe('default');
    });

    it('should call onTimeChange when time is selected', () => {
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showTimePicker={true} />
      );
      const timePicker = UNSAFE_getAllByType('DateTimePicker' as any)[0];
      const newTime = new Date('2026-03-15T16:45:00.000Z');

      timePicker.props.onChange({}, newTime);

      expect(mockOnShowTimePicker).toHaveBeenCalledWith(false);
      expect(mockOnTimeChange).toHaveBeenCalledWith(newTime);
    });

    it('should close picker without calling onTimeChange when cancelled', () => {
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showTimePicker={true} />
      );
      const timePicker = UNSAFE_getAllByType('DateTimePicker' as any)[0];

      timePicker.props.onChange({}, undefined);

      expect(mockOnShowTimePicker).toHaveBeenCalledWith(false);
      expect(mockOnTimeChange).not.toHaveBeenCalled();
    });

    it('should handle multiple time selections', () => {
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showTimePicker={true} />
      );
      const timePicker = UNSAFE_getAllByType('DateTimePicker' as any)[0];

      const time1 = new Date('2026-03-15T09:00:00.000Z');
      const time2 = new Date('2026-03-15T17:30:00.000Z');

      timePicker.props.onChange({}, time1);
      timePicker.props.onChange({}, time2);

      expect(mockOnTimeChange).toHaveBeenCalledTimes(2);
      expect(mockOnTimeChange).toHaveBeenNthCalledWith(1, time1);
      expect(mockOnTimeChange).toHaveBeenNthCalledWith(2, time2);
    });

    it('should not have minimumDate prop on time picker', () => {
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showTimePicker={true} />
      );
      const timePicker = UNSAFE_getAllByType('DateTimePicker' as any)[0];
      expect(timePicker.props.minimumDate).toBeUndefined();
    });
  });

  describe('Both Pickers Visible', () => {
    it('should show both pickers when both flags are true', () => {
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={true} showTimePicker={true} />
      );
      const pickers = UNSAFE_getAllByType('DateTimePicker' as any);
      expect(pickers.length).toBe(2);
    });

    it('should distinguish between date and time pickers', () => {
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={true} showTimePicker={true} />
      );
      const pickers = UNSAFE_getAllByType('DateTimePicker' as any);

      const datePicker = pickers.find((p: any) => p.props.mode === 'date');
      const timePicker = pickers.find((p: any) => p.props.mode === 'time');

      expect(datePicker).toBeTruthy();
      expect(timePicker).toBeTruthy();
    });

    it('should maintain separate values for date and time pickers', () => {
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={true} showTimePicker={true} />
      );
      const pickers = UNSAFE_getAllByType('DateTimePicker' as any);

      const datePicker = pickers.find((p: any) => p.props.mode === 'date');
      const timePicker = pickers.find((p: any) => p.props.mode === 'time');

      expect(datePicker.props.value).toBe(fixedDate);
      expect(timePicker.props.value).toBe(fixedTime);
    });
  });

  describe('Icon Configuration', () => {
    it('should render calendar icon with correct size', () => {
      const { UNSAFE_getAllByType } = render(<DateTimeSelector {...defaultProps} />);
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const calendarIcon = icons.find((icon: any) => icon.props.name === 'calendar-outline');
      expect(calendarIcon.props.size).toBe(20);
    });

    it('should render time icon with correct size', () => {
      const { UNSAFE_getAllByType } = render(<DateTimeSelector {...defaultProps} />);
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const timeIcon = icons.find((icon: any) => icon.props.name === 'time-outline');
      expect(timeIcon.props.size).toBe(20);
    });

    it('should render calendar icon with correct color', () => {
      const { UNSAFE_getAllByType } = render(<DateTimeSelector {...defaultProps} />);
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const calendarIcon = icons.find((icon: any) => icon.props.name === 'calendar-outline');
      expect(calendarIcon.props.color).toBe('#007AFF');
    });

    it('should render time icon with correct color', () => {
      const { UNSAFE_getAllByType } = render(<DateTimeSelector {...defaultProps} />);
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const timeIcon = icons.find((icon: any) => icon.props.name === 'time-outline');
      expect(timeIcon.props.color).toBe('#007AFF');
    });

    it('should render chevron icons with correct size', () => {
      const { UNSAFE_getAllByType } = render(<DateTimeSelector {...defaultProps} />);
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const chevronIcons = icons.filter((icon: any) => icon.props.name === 'chevron-down');
      chevronIcons.forEach((icon: any) => {
        expect(icon.props.size).toBe(20);
      });
    });

    it('should render chevron icons with correct color', () => {
      const { UNSAFE_getAllByType } = render(<DateTimeSelector {...defaultProps} />);
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const chevronIcons = icons.filter((icon: any) => icon.props.name === 'chevron-down');
      chevronIcons.forEach((icon: any) => {
        expect(icon.props.color).toBe('#999999');
      });
    });
  });

  describe('State Transitions', () => {
    it('should transition from closed to open date picker', () => {
      const { rerender, UNSAFE_queryAllByType } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={false} />
      );
      expect(UNSAFE_queryAllByType('DateTimePicker' as any).length).toBe(0);

      rerender(<DateTimeSelector {...defaultProps} showDatePicker={true} />);
      expect(UNSAFE_queryAllByType('DateTimePicker' as any).length).toBeGreaterThan(0);
    });

    it('should transition from open to closed date picker', () => {
      const { rerender, UNSAFE_queryAllByType } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={true} />
      );
      expect(UNSAFE_queryAllByType('DateTimePicker' as any).length).toBeGreaterThan(0);

      rerender(<DateTimeSelector {...defaultProps} showDatePicker={false} />);
      expect(UNSAFE_queryAllByType('DateTimePicker' as any).length).toBe(0);
    });

    it('should transition from closed to open time picker', () => {
      const { rerender, UNSAFE_queryAllByType } = render(
        <DateTimeSelector {...defaultProps} showTimePicker={false} />
      );
      expect(UNSAFE_queryAllByType('DateTimePicker' as any).length).toBe(0);

      rerender(<DateTimeSelector {...defaultProps} showTimePicker={true} />);
      expect(UNSAFE_queryAllByType('DateTimePicker' as any).length).toBeGreaterThan(0);
    });

    it('should transition from open to closed time picker', () => {
      const { rerender, UNSAFE_queryAllByType } = render(
        <DateTimeSelector {...defaultProps} showTimePicker={true} />
      );
      expect(UNSAFE_queryAllByType('DateTimePicker' as any).length).toBeGreaterThan(0);

      rerender(<DateTimeSelector {...defaultProps} showTimePicker={false} />);
      expect(UNSAFE_queryAllByType('DateTimePicker' as any).length).toBe(0);
    });

    it('should handle rapid picker toggles', () => {
      const { rerender, UNSAFE_queryAllByType } = render(
        <DateTimeSelector {...defaultProps} />
      );

      for (let i = 0; i < 5; i++) {
        rerender(<DateTimeSelector {...defaultProps} showDatePicker={true} />);
        rerender(<DateTimeSelector {...defaultProps} showDatePicker={false} />);
        rerender(<DateTimeSelector {...defaultProps} showTimePicker={true} />);
        rerender(<DateTimeSelector {...defaultProps} showTimePicker={false} />);
      }

      expect(UNSAFE_queryAllByType('DateTimePicker' as any).length).toBe(0);
    });

    it('should update displayed date when prop changes', () => {
      const { rerender, queryByText } = render(<DateTimeSelector {...defaultProps} />);

      const newDate = new Date('2027-12-25T10:00:00.000Z');
      rerender(<DateTimeSelector {...defaultProps} selectedDate={newDate} />);

      expect(queryByText(/December/)).toBeTruthy();
      expect(queryByText(/2027/)).toBeTruthy();
    });

    it('should update displayed time when prop changes', () => {
      const { rerender, queryByText } = render(<DateTimeSelector {...defaultProps} />);

      const newTime = new Date('2026-03-15T23:59:00.000Z');
      rerender(<DateTimeSelector {...defaultProps} selectedTime={newTime} />);

      expect(queryByText(/11:59/)).toBeTruthy();
      expect(queryByText(/PM/)).toBeTruthy();
    });
  });

  describe('Component Lifecycle', () => {
    it('should mount without errors', () => {
      expect(() => render(<DateTimeSelector {...defaultProps} />)).not.toThrow();
    });

    it('should unmount without errors', () => {
      const { unmount } = render(<DateTimeSelector {...defaultProps} />);
      expect(() => unmount()).not.toThrow();
    });

    it('should handle multiple mount/unmount cycles', () => {
      const { unmount: unmount1 } = render(<DateTimeSelector {...defaultProps} />);
      unmount1();

      const { unmount: unmount2 } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={true} />
      );
      unmount2();

      const { unmount: unmount3 } = render(
        <DateTimeSelector {...defaultProps} showTimePicker={true} />
      );
      expect(() => unmount3()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle year 2100 dates', () => {
      const futureDate = new Date('2100-12-31T10:00:00.000Z');
      const { getByText } = render(
        <DateTimeSelector {...defaultProps} selectedDate={futureDate} />
      );
      expect(getByText(/2100/)).toBeTruthy();
    });

    it('should handle past dates', () => {
      const pastDate = new Date('2020-01-01T10:00:00.000Z');
      const { getByText } = render(
        <DateTimeSelector {...defaultProps} selectedDate={pastDate} />
      );
      expect(getByText(/2020/)).toBeTruthy();
    });

    it('should handle date at year boundary', () => {
      const yearBoundary = new Date('2026-01-01T00:00:00.000Z');
      const { getByText } = render(
        <DateTimeSelector {...defaultProps} selectedDate={yearBoundary} />
      );
      expect(getByText(/January/)).toBeTruthy();
      expect(getByText(/2026/)).toBeTruthy();
    });

    it('should handle end of year date', () => {
      const endOfYear = new Date('2026-12-31T23:59:59.000Z');
      const { getByText } = render(
        <DateTimeSelector {...defaultProps} selectedDate={endOfYear} />
      );
      expect(getByText(/December/)).toBeTruthy();
      expect(getByText(/2026/)).toBeTruthy();
    });

    it('should handle callback reference changes', () => {
      const newOnDateChange = jest.fn();
      const { rerender, UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={true} />
      );

      rerender(
        <DateTimeSelector
          {...defaultProps}
          showDatePicker={true}
          onDateChange={newOnDateChange}
        />
      );

      const datePicker = UNSAFE_getAllByType('DateTimePicker' as any)[0];
      const newDate = new Date('2026-05-01T10:00:00.000Z');
      datePicker.props.onChange({}, newDate);

      expect(newOnDateChange).toHaveBeenCalledWith(newDate);
      expect(mockOnDateChange).not.toHaveBeenCalled();
    });

    it('should handle simultaneous picker visibility changes', () => {
      const { rerender, UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} />
      );

      rerender(
        <DateTimeSelector {...defaultProps} showDatePicker={true} showTimePicker={true} />
      );

      const pickers = UNSAFE_getAllByType('DateTimePicker' as any);
      expect(pickers.length).toBe(2);
    });

    it('should handle null event in onChange handlers', () => {
      const { UNSAFE_getAllByType } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={true} />
      );
      const datePicker = UNSAFE_getAllByType('DateTimePicker' as any)[0];

      expect(() => datePicker.props.onChange(null, new Date())).not.toThrow();
    });
  });

  describe('Rendering Consistency', () => {
    it('should render consistently across multiple renders', () => {
      const { toJSON: toJSON1 } = render(<DateTimeSelector {...defaultProps} />);
      const { toJSON: toJSON2 } = render(<DateTimeSelector {...defaultProps} />);
      const snapshot1 = toJSON1();
      const snapshot2 = toJSON2();
      expect(JSON.stringify(snapshot1)).toEqual(JSON.stringify(snapshot2));
    });

    it('should maintain structure with different dates', () => {
      const date1 = new Date('2026-01-01T10:00:00.000Z');
      const date2 = new Date('2026-12-31T10:00:00.000Z');

      const { getByText: getText1 } = render(
        <DateTimeSelector {...defaultProps} selectedDate={date1} />
      );
      const { getByText: getText2 } = render(
        <DateTimeSelector {...defaultProps} selectedDate={date2} />
      );

      expect(getText1('Date & Time')).toBeTruthy();
      expect(getText2('Date & Time')).toBeTruthy();
    });

    it('should maintain structure with different times', () => {
      const time1 = new Date('2026-03-15T06:00:00.000Z');
      const time2 = new Date('2026-03-15T18:00:00.000Z');

      const { getByText: getText1 } = render(
        <DateTimeSelector {...defaultProps} selectedTime={time1} />
      );
      const { getByText: getText2 } = render(
        <DateTimeSelector {...defaultProps} selectedTime={time2} />
      );

      expect(getText1('Date & Time')).toBeTruthy();
      expect(getText2('Date & Time')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible date selector button', () => {
      const { getByText } = render(<DateTimeSelector {...defaultProps} />);
      const dateLabel = getByText('Date');
      // Navigate up to find the TouchableOpacity
      let parent = dateLabel.parent;
      while (parent && parent.type !== 'TouchableOpacity') {
        parent = parent.parent;
      }
      expect(parent).toBeTruthy();
      expect(parent?.type).toBe('TouchableOpacity');
    });

    it('should have accessible time selector button', () => {
      const { getByText } = render(<DateTimeSelector {...defaultProps} />);
      const timeLabel = getByText('Time');
      // Navigate up to find the TouchableOpacity
      let parent = timeLabel.parent;
      while (parent && parent.type !== 'TouchableOpacity') {
        parent = parent.parent;
      }
      expect(parent).toBeTruthy();
      expect(parent?.type).toBe('TouchableOpacity');
    });

    it('should display human-readable date format', () => {
      const { getByText } = render(<DateTimeSelector {...defaultProps} />);
      // Should include full month name, not just number
      expect(getByText(/March/)).toBeTruthy();
    });

    it('should display human-readable time format', () => {
      const { getByText } = render(<DateTimeSelector {...defaultProps} />);
      // Should include AM/PM for clarity
      expect(getByText(/AM|PM/)).toBeTruthy();
    });

    it('should have clear visual labels', () => {
      const { getByText } = render(<DateTimeSelector {...defaultProps} />);
      expect(getByText('Date')).toBeTruthy();
      expect(getByText('Time')).toBeTruthy();
    });
  });

  describe('Platform-Specific Behavior', () => {
    it('should render correctly on iOS', () => {
      Platform.OS = 'ios';
      const { getByText } = render(<DateTimeSelector {...defaultProps} />);
      expect(getByText('Date & Time')).toBeTruthy();
    });

    it('should render correctly on Android', () => {
      Platform.OS = 'android';
      const { getByText } = render(<DateTimeSelector {...defaultProps} />);
      expect(getByText('Date & Time')).toBeTruthy();
    });

    it('should use platform-appropriate picker display style', () => {
      const originalOS = Platform.OS;

      Platform.OS = 'ios';
      const { UNSAFE_getAllByType: getTypeIOS } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={true} />
      );
      const iosDatePicker = getTypeIOS('DateTimePicker' as any)[0];
      expect(iosDatePicker.props.display).toBe('spinner');

      Platform.OS = 'android';
      const { UNSAFE_getAllByType: getTypeAndroid } = render(
        <DateTimeSelector {...defaultProps} showDatePicker={true} />
      );
      const androidDatePicker = getTypeAndroid('DateTimePicker' as any)[0];
      expect(androidDatePicker.props.display).toBe('default');

      Platform.OS = originalOS;
    });
  });
});
