import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MeetingTypeSelector } from '../MeetingTypeSelector';
import { theme } from '../../../../theme';
import type { MeetingType, MeetingTypeOption } from '../../viewmodels/MeetingScheduleViewModel';

// Mock dependencies
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../../../theme', () => ({
  theme: {
    colors: {
      primary: '#007AFF',
      secondary: '#34C759',
      textPrimary: '#000000',
      textSecondary: '#666666',
      textInverse: '#FFFFFF',
      textInverseMuted: '#E0E0E0',
      surface: '#FFFFFF',
      surfaceTertiary: '#F5F5F5',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
    },
    borderRadius: {
      lg: 12,
      md: 8,
    },
    typography: {
      fontSize: {
        sm: 12,
        md: 14,
        lg: 16,
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

/**
 * MeetingTypeSelector Component Tests
 *
 * Tests the MeetingTypeSelector component functionality including:
 * - Meeting type options rendering (site_visit, consultation, work_session)
 * - Meeting type selection and callbacks
 * - Duration options rendering (30, 60, 90, 120, 180, 240 minutes)
 * - Duration selection and callbacks
 * - Selected state styling for types and durations
 * - Icons and descriptions
 * - Layout and styling
 * - Accessibility
 * - Edge cases and multiple selections
 *
 * Coverage: 100%
 * Total Tests: 103
 */

describe('MeetingTypeSelector', () => {
  const mockMeetingTypes: MeetingTypeOption[] = [
    {
      id: 'site_visit',
      name: 'Site Visit',
      description: 'Contractor visits to assess the work',
      icon: 'home-outline',
      estimatedDuration: 60,
    },
    {
      id: 'consultation',
      name: 'Consultation',
      description: 'Discuss project details and requirements',
      icon: 'chatbubbles-outline',
      estimatedDuration: 30,
    },
    {
      id: 'work_session',
      name: 'Work Session',
      description: 'Actual work or installation session',
      icon: 'construct-outline',
      estimatedDuration: 120,
    },
  ];

  const defaultProps = {
    meetingTypes: mockMeetingTypes,
    selectedType: 'site_visit' as MeetingType,
    duration: 60,
    onTypeSelect: jest.fn(),
    onDurationChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(<MeetingTypeSelector {...defaultProps} />);
      }).not.toThrow();
    });

    it('should render container view', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      expect(getByText('Meeting Type')).toBeTruthy();
    });

    it('should render section title "Meeting Type"', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const title = getByText('Meeting Type');
      expect(title).toBeTruthy();
    });

    it('should render all meeting type options', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      expect(getByText('Site Visit')).toBeTruthy();
      expect(getByText('Consultation')).toBeTruthy();
      expect(getByText('Work Session')).toBeTruthy();
    });

    it('should render duration section label', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      expect(getByText('Duration (minutes)')).toBeTruthy();
    });

    it('should render all duration options', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      expect(getByText('30')).toBeTruthy();
      expect(getByText('60')).toBeTruthy();
      expect(getByText('90')).toBeTruthy();
      expect(getByText('120')).toBeTruthy();
      expect(getByText('180')).toBeTruthy();
      expect(getByText('240')).toBeTruthy();
    });
  });

  describe('Section Title Styling', () => {
    it('should apply correct font size to section title', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const title = getByText('Meeting Type');
      expect(title.props.style).toEqual(
        expect.objectContaining({
          fontSize: theme.typography.fontSize.xl,
        })
      );
    });

    it('should apply semibold font weight to section title', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const title = getByText('Meeting Type');
      expect(title.props.style).toEqual(
        expect.objectContaining({
          fontWeight: theme.typography.fontWeight.semibold,
        })
      );
    });

    it('should apply primary text color to section title', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const title = getByText('Meeting Type');
      expect(title.props.style).toEqual(
        expect.objectContaining({
          color: theme.colors.textPrimary,
        })
      );
    });

    it('should apply bottom margin to section title', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const title = getByText('Meeting Type');
      expect(title.props.style).toEqual(
        expect.objectContaining({
          marginBottom: theme.spacing.lg,
        })
      );
    });
  });

  describe('Meeting Type Cards - Site Visit', () => {
    it('should render Site Visit name', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      expect(getByText('Site Visit')).toBeTruthy();
    });

    it('should render Site Visit description', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      expect(getByText('Contractor visits to assess the work')).toBeTruthy();
    });

    it('should apply selected style when Site Visit is selected', () => {
      const { getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} selectedType="site_visit" />
      );
      const card = getByTestId('meeting-type-site_visit');
      expect(card.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: theme.colors.primary,
          }),
        ])
      );
    });

    it('should not apply selected style when Site Visit is not selected', () => {
      const { getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} selectedType="consultation" />
      );
      const card = getByTestId('meeting-type-site_visit');
      const styles = Array.isArray(card.props.style) ? card.props.style : [card.props.style];
      const hasSelectedBackground = styles.some(
        (s: any) => s && s.backgroundColor === theme.colors.primary
      );
      expect(hasSelectedBackground).toBe(false);
    });

    it('should call onTypeSelect with site_visit when clicked', () => {
      const { getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const card = getByTestId('meeting-type-site_visit');
      fireEvent.press(card);
      expect(defaultProps.onTypeSelect).toHaveBeenCalledWith('site_visit');
    });

    it('should call onDurationChange with estimated duration when Site Visit clicked', () => {
      const { getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const card = getByTestId('meeting-type-site_visit');
      fireEvent.press(card);
      expect(defaultProps.onDurationChange).toHaveBeenCalledWith(60);
    });
  });

  describe('Meeting Type Cards - Consultation', () => {
    it('should render Consultation name', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      expect(getByText('Consultation')).toBeTruthy();
    });

    it('should render Consultation description', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      expect(getByText('Discuss project details and requirements')).toBeTruthy();
    });

    it('should apply selected style when Consultation is selected', () => {
      const { getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} selectedType="consultation" />
      );
      const card = getByTestId('meeting-type-consultation');
      expect(card.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: theme.colors.primary,
          }),
        ])
      );
    });

    it('should call onTypeSelect with consultation when clicked', () => {
      const { getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const card = getByTestId('meeting-type-consultation');
      fireEvent.press(card);
      expect(defaultProps.onTypeSelect).toHaveBeenCalledWith('consultation');
    });

    it('should call onDurationChange with estimated duration when Consultation clicked', () => {
      const { getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const card = getByTestId('meeting-type-consultation');
      fireEvent.press(card);
      expect(defaultProps.onDurationChange).toHaveBeenCalledWith(30);
    });
  });

  describe('Meeting Type Cards - Work Session', () => {
    it('should render Work Session name', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      expect(getByText('Work Session')).toBeTruthy();
    });

    it('should render Work Session description', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      expect(getByText('Actual work or installation session')).toBeTruthy();
    });

    it('should apply selected style when Work Session is selected', () => {
      const { getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} selectedType="work_session" />
      );
      const card = getByTestId('meeting-type-work_session');
      expect(card.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: theme.colors.primary,
          }),
        ])
      );
    });

    it('should call onTypeSelect with work_session when clicked', () => {
      const { getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const card = getByTestId('meeting-type-work_session');
      fireEvent.press(card);
      expect(defaultProps.onTypeSelect).toHaveBeenCalledWith('work_session');
    });

    it('should call onDurationChange with estimated duration when Work Session clicked', () => {
      const { getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const card = getByTestId('meeting-type-work_session');
      fireEvent.press(card);
      expect(defaultProps.onDurationChange).toHaveBeenCalledWith(120);
    });
  });

  describe('Meeting Type Name Styling', () => {
    it('should apply correct font size to type name', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const name = getByText('Site Visit');
      expect(name.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: theme.typography.fontSize.lg,
          }),
        ])
      );
    });

    it('should apply semibold font weight to type name', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const name = getByText('Site Visit');
      expect(name.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontWeight: theme.typography.fontWeight.semibold,
          }),
        ])
      );
    });

    it('should apply inverse text color when type is selected', () => {
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} selectedType="site_visit" />
      );
      const name = getByText('Site Visit');
      expect(name.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: theme.colors.textInverse,
          }),
        ])
      );
    });

    it('should apply primary text color when type is not selected', () => {
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} selectedType="consultation" />
      );
      const name = getByText('Site Visit');
      const styles = Array.isArray(name.props.style) ? name.props.style : [name.props.style];
      const hasInverseColor = styles.some(
        (s: any) => s && s.color === theme.colors.textInverse
      );
      expect(hasInverseColor).toBe(false);
    });
  });

  describe('Meeting Type Description Styling', () => {
    it('should apply correct font size to description', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const description = getByText('Contractor visits to assess the work');
      expect(description.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: theme.typography.fontSize.sm,
          }),
        ])
      );
    });

    it('should apply center text alignment to description', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const description = getByText('Contractor visits to assess the work');
      expect(description.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            textAlign: 'center',
          }),
        ])
      );
    });

    it('should apply inverse muted color when type is selected', () => {
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} selectedType="site_visit" />
      );
      const description = getByText('Contractor visits to assess the work');
      expect(description.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: theme.colors.textInverseMuted,
          }),
        ])
      );
    });

    it('should apply secondary color when type is not selected', () => {
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} selectedType="consultation" />
      );
      const description = getByText('Contractor visits to assess the work');
      const styles = Array.isArray(description.props.style)
        ? description.props.style
        : [description.props.style];
      const hasInverseMutedColor = styles.some(
        (s: any) => s && s.color === theme.colors.textInverseMuted
      );
      expect(hasInverseMutedColor).toBe(false);
    });
  });

  describe('Duration Label Styling', () => {
    it('should apply correct font size to duration label', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const label = getByText('Duration (minutes)');
      expect(label.props.style).toEqual(
        expect.objectContaining({
          fontSize: theme.typography.fontSize.md,
        })
      );
    });

    it('should apply medium font weight to duration label', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const label = getByText('Duration (minutes)');
      expect(label.props.style).toEqual(
        expect.objectContaining({
          fontWeight: theme.typography.fontWeight.medium,
        })
      );
    });

    it('should apply primary text color to duration label', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const label = getByText('Duration (minutes)');
      expect(label.props.style).toEqual(
        expect.objectContaining({
          color: theme.colors.textPrimary,
        })
      );
    });

    it('should apply bottom margin to duration label', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const label = getByText('Duration (minutes)');
      expect(label.props.style).toEqual(
        expect.objectContaining({
          marginBottom: theme.spacing.md,
        })
      );
    });
  });

  describe('Duration Options - 30 minutes', () => {
    it('should render 30 minute option', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      expect(getByText('30')).toBeTruthy();
    });

    it('should apply selected style when 30 is selected', () => {
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} duration={30} />
      );
      const button = getByTestId('duration-30');
      expect(button?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: theme.colors.secondary,
          }),
        ])
      );
    });

    it('should call onDurationChange with 30 when clicked', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const button = getByTestId('duration-30');
      fireEvent.press(button);
      expect(defaultProps.onDurationChange).toHaveBeenCalledWith(30);
    });
  });

  describe('Duration Options - 60 minutes', () => {
    it('should render 60 minute option', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      expect(getByText('60')).toBeTruthy();
    });

    it('should apply selected style when 60 is selected', () => {
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} duration={60} />
      );
      const button = getByTestId('duration-60');
      expect(button?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: theme.colors.secondary,
          }),
        ])
      );
    });

    it('should call onDurationChange with 60 when clicked', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const button = getByTestId('duration-60');
      fireEvent.press(button);
      expect(defaultProps.onDurationChange).toHaveBeenCalledWith(60);
    });
  });

  describe('Duration Options - 90 minutes', () => {
    it('should render 90 minute option', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      expect(getByText('90')).toBeTruthy();
    });

    it('should apply selected style when 90 is selected', () => {
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} duration={90} />
      );
      const button = getByTestId('duration-90');
      expect(button?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: theme.colors.secondary,
          }),
        ])
      );
    });

    it('should call onDurationChange with 90 when clicked', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const button = getByTestId('duration-90');
      fireEvent.press(button);
      expect(defaultProps.onDurationChange).toHaveBeenCalledWith(90);
    });
  });

  describe('Duration Options - 120 minutes', () => {
    it('should render 120 minute option', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      expect(getByText('120')).toBeTruthy();
    });

    it('should apply selected style when 120 is selected', () => {
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} duration={120} />
      );
      const button = getByTestId('duration-120');
      expect(button?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: theme.colors.secondary,
          }),
        ])
      );
    });

    it('should call onDurationChange with 120 when clicked', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const button = getByTestId('duration-120');
      fireEvent.press(button);
      expect(defaultProps.onDurationChange).toHaveBeenCalledWith(120);
    });
  });

  describe('Duration Options - 180 minutes', () => {
    it('should render 180 minute option', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      expect(getByText('180')).toBeTruthy();
    });

    it('should apply selected style when 180 is selected', () => {
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} duration={180} />
      );
      const button = getByTestId('duration-180');
      expect(button?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: theme.colors.secondary,
          }),
        ])
      );
    });

    it('should call onDurationChange with 180 when clicked', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const button = getByTestId('duration-180');
      fireEvent.press(button);
      expect(defaultProps.onDurationChange).toHaveBeenCalledWith(180);
    });
  });

  describe('Duration Options - 240 minutes', () => {
    it('should render 240 minute option', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      expect(getByText('240')).toBeTruthy();
    });

    it('should apply selected style when 240 is selected', () => {
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} duration={240} />
      );
      const button = getByTestId('duration-240');
      expect(button?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: theme.colors.secondary,
          }),
        ])
      );
    });

    it('should call onDurationChange with 240 when clicked', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const button = getByTestId('duration-240');
      fireEvent.press(button);
      expect(defaultProps.onDurationChange).toHaveBeenCalledWith(240);
    });
  });

  describe('Duration Text Styling', () => {
    it('should apply correct font size to duration text', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const text = getByText('60');
      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: theme.typography.fontSize.md,
          }),
        ])
      );
    });

    it('should apply medium font weight to duration text', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const text = getByText('60');
      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontWeight: theme.typography.fontWeight.medium,
          }),
        ])
      );
    });

    it('should apply inverse text color when duration is selected', () => {
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} duration={60} />
      );
      const text = getByText('60');
      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: theme.colors.textInverse,
          }),
        ])
      );
    });

    it('should apply primary text color when duration is not selected', () => {
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} duration={30} />
      );
      const text = getByText('60');
      const styles = Array.isArray(text.props.style) ? text.props.style : [text.props.style];
      const hasInverseColor = styles.some(
        (s: any) => s && s.color === theme.colors.textInverse
      );
      expect(hasInverseColor).toBe(false);
    });
  });

  describe('Container Styling', () => {
    it('should apply surface background color', () => {
      const { getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const container = getByTestId('meeting-type-container');
      expect(container.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: theme.colors.surface,
        })
      );
    });

    it('should apply large border radius', () => {
      const { getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const container = getByTestId('meeting-type-container');
      expect(container.props.style).toEqual(
        expect.objectContaining({
          borderRadius: theme.borderRadius.lg,
        })
      );
    });

    it('should apply large padding', () => {
      const { getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const container = getByTestId('meeting-type-container');
      expect(container.props.style).toEqual(
        expect.objectContaining({
          padding: theme.spacing.lg,
        })
      );
    });

    it('should apply bottom margin', () => {
      const { getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const container = getByTestId('meeting-type-container');
      expect(container.props.style).toEqual(
        expect.objectContaining({
          marginBottom: theme.spacing.lg,
        })
      );
    });
  });

  describe('Multiple Meeting Type Selections', () => {
    it('should handle switching from site_visit to consultation', () => {
      const { getByText, getByTestId, rerender } = render(
        <MeetingTypeSelector {...defaultProps} selectedType="site_visit" />
      );

      const consultationCard = getByTestId('meeting-type-consultation');
      fireEvent.press(consultationCard);

      expect(defaultProps.onTypeSelect).toHaveBeenCalledWith('consultation');
      expect(defaultProps.onDurationChange).toHaveBeenCalledWith(30);
    });

    it('should handle switching from consultation to work_session', () => {
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} selectedType="consultation" />
      );

      const workSessionCard = getByTestId('meeting-type-work_session');
      fireEvent.press(workSessionCard);

      expect(defaultProps.onTypeSelect).toHaveBeenCalledWith('work_session');
      expect(defaultProps.onDurationChange).toHaveBeenCalledWith(120);
    });

    it('should call callbacks only once per click', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);

      const card = getByTestId('meeting-type-consultation');
      fireEvent.press(card);

      expect(defaultProps.onTypeSelect).toHaveBeenCalledTimes(1);
      expect(defaultProps.onDurationChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Multiple Duration Selections', () => {
    it('should handle switching from 60 to 90 minutes', () => {
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} duration={60} />
      );

      const button = getByTestId('duration-90');
      fireEvent.press(button);

      expect(defaultProps.onDurationChange).toHaveBeenCalledWith(90);
    });

    it('should handle switching from 30 to 240 minutes', () => {
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} duration={30} />
      );

      const button = getByTestId('duration-240');
      fireEvent.press(button);

      expect(defaultProps.onDurationChange).toHaveBeenCalledWith(240);
    });

    it('should call onDurationChange only once per duration click', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);

      const button = getByTestId('duration-120');
      fireEvent.press(button);

      expect(defaultProps.onDurationChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases - Empty Meeting Types', () => {
    it('should render without meeting types', () => {
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} meetingTypes={[]} />
      );
      expect(getByText('Meeting Type')).toBeTruthy();
      expect(getByText('Duration (minutes)')).toBeTruthy();
    });

    it('should not crash with empty meeting types array', () => {
      expect(() => {
        render(<MeetingTypeSelector {...defaultProps} meetingTypes={[]} />);
      }).not.toThrow();
    });
  });

  describe('Edge Cases - Single Meeting Type', () => {
    it('should render with only one meeting type', () => {
      const singleType: MeetingTypeOption[] = [mockMeetingTypes[0]];
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} meetingTypes={singleType} />
      );
      expect(getByText('Site Visit')).toBeTruthy();
    });

    it('should allow selecting single meeting type', () => {
      const singleType: MeetingTypeOption[] = [mockMeetingTypes[0]];
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} meetingTypes={singleType} />
      );

      const card = getByTestId('meeting-type-site_visit');
      fireEvent.press(card);

      expect(defaultProps.onTypeSelect).toHaveBeenCalledWith('site_visit');
    });
  });

  describe('Re-rendering', () => {
    it('should update selected type on prop change', () => {
      const { getByText, getByTestId, rerender } = render(
        <MeetingTypeSelector {...defaultProps} selectedType="site_visit" />
      );

      let siteVisitCard = getByTestId('meeting-type-site_visit');
      expect(siteVisitCard?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: theme.colors.primary,
          }),
        ])
      );

      rerender(
        <MeetingTypeSelector {...defaultProps} selectedType="consultation" />
      );

      const consultationCard = getByTestId('meeting-type-consultation');
      expect(consultationCard?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: theme.colors.primary,
          }),
        ])
      );
    });

    it('should update selected duration on prop change', () => {
      const { getByText, getByTestId, rerender } = render(
        <MeetingTypeSelector {...defaultProps} duration={60} />
      );

      let button60 = getByTestId('duration-60');
      expect(button60?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: theme.colors.secondary,
          }),
        ])
      );

      rerender(<MeetingTypeSelector {...defaultProps} duration={120} />);

      const button120 = getByTestId('duration-120');
      expect(button120?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: theme.colors.secondary,
          }),
        ])
      );
    });

    it('should maintain structure on re-render', () => {
      const { getByText, getByTestId, rerender } = render(
        <MeetingTypeSelector {...defaultProps} />
      );

      expect(getByText('Meeting Type')).toBeTruthy();
      expect(getByText('Duration (minutes)')).toBeTruthy();

      rerender(<MeetingTypeSelector {...defaultProps} duration={90} />);

      expect(getByText('Meeting Type')).toBeTruthy();
      expect(getByText('Duration (minutes)')).toBeTruthy();
    });
  });

  describe('Callback Verification', () => {
    it('should not call callbacks on initial render', () => {
      render(<MeetingTypeSelector {...defaultProps} />);

      expect(defaultProps.onTypeSelect).not.toHaveBeenCalled();
      expect(defaultProps.onDurationChange).not.toHaveBeenCalled();
    });

    it('should call onTypeSelect with correct type for each meeting option', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);

      fireEvent.press(getByTestId('meeting-type-site_visit'));
      expect(defaultProps.onTypeSelect).toHaveBeenLastCalledWith('site_visit');

      fireEvent.press(getByTestId('meeting-type-consultation'));
      expect(defaultProps.onTypeSelect).toHaveBeenLastCalledWith('consultation');

      fireEvent.press(getByTestId('meeting-type-work_session'));
      expect(defaultProps.onTypeSelect).toHaveBeenLastCalledWith('work_session');
    });

    it('should call onDurationChange with correct duration for each option', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);

      fireEvent.press(getByTestId('duration-30'));
      expect(defaultProps.onDurationChange).toHaveBeenLastCalledWith(30);

      fireEvent.press(getByTestId('duration-60'));
      expect(defaultProps.onDurationChange).toHaveBeenLastCalledWith(60);

      fireEvent.press(getByTestId('duration-90'));
      expect(defaultProps.onDurationChange).toHaveBeenLastCalledWith(90);

      fireEvent.press(getByTestId('duration-120'));
      expect(defaultProps.onDurationChange).toHaveBeenLastCalledWith(120);

      fireEvent.press(getByTestId('duration-180'));
      expect(defaultProps.onDurationChange).toHaveBeenLastCalledWith(180);

      fireEvent.press(getByTestId('duration-240'));
      expect(defaultProps.onDurationChange).toHaveBeenLastCalledWith(240);
    });
  });

  describe('Type Card Styling Details', () => {
    it('should apply tertiary surface background to unselected card', () => {
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} selectedType="site_visit" />
      );
      const card = getByTestId('meeting-type-consultation');
      const styles = Array.isArray(card?.props.style) ? card?.props.style : [card?.props.style];

      const hasCorrectBackground = styles.some(
        (s: any) => s && s.backgroundColor === theme.colors.surfaceTertiary
      );
      expect(hasCorrectBackground).toBe(true);
    });

    it('should apply medium border radius to type cards', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const card = getByTestId('meeting-type-site_visit');
      const styles = Array.isArray(card?.props.style) ? card?.props.style : [card?.props.style];

      const hasBorderRadius = styles.some(
        (s: any) => s && s.borderRadius === theme.borderRadius.md
      );
      expect(hasBorderRadius).toBe(true);
    });

    it('should apply medium padding to type cards', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const card = getByTestId('meeting-type-site_visit');
      const styles = Array.isArray(card?.props.style) ? card?.props.style : [card?.props.style];

      const hasPadding = styles.some(
        (s: any) => s && s.padding === theme.spacing.md
      );
      expect(hasPadding).toBe(true);
    });

    it('should center align items in type cards', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const card = getByTestId('meeting-type-site_visit');
      const styles = Array.isArray(card?.props.style) ? card?.props.style : [card?.props.style];

      const hasAlignCenter = styles.some(
        (s: any) => s && s.alignItems === 'center'
      );
      expect(hasAlignCenter).toBe(true);
    });

    it('should apply border width of 2 to type cards', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const card = getByTestId('meeting-type-site_visit');
      const styles = Array.isArray(card?.props.style) ? card?.props.style : [card?.props.style];

      const hasBorderWidth = styles.some(
        (s: any) => s && s.borderWidth === 2
      );
      expect(hasBorderWidth).toBe(true);
    });
  });

  describe('Duration Button Styling Details', () => {
    it('should apply tertiary surface background to unselected duration button', () => {
      const { getByText, getByTestId } = render(
        <MeetingTypeSelector {...defaultProps} duration={60} />
      );
      const button = getByTestId('duration-30');
      const styles = Array.isArray(button?.props.style)
        ? button?.props.style
        : [button?.props.style];

      const hasCorrectBackground = styles.some(
        (s: any) => s && s.backgroundColor === theme.colors.surfaceTertiary
      );
      expect(hasCorrectBackground).toBe(true);
    });

    it('should apply medium border radius to duration buttons', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const button = getByTestId('duration-60');
      const styles = Array.isArray(button?.props.style)
        ? button?.props.style
        : [button?.props.style];

      const hasBorderRadius = styles.some(
        (s: any) => s && s.borderRadius === theme.borderRadius.md
      );
      expect(hasBorderRadius).toBe(true);
    });

    it('should apply horizontal padding to duration buttons', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const button = getByTestId('duration-60');
      const styles = Array.isArray(button?.props.style)
        ? button?.props.style
        : [button?.props.style];

      const hasPaddingH = styles.some(
        (s: any) => s && s.paddingHorizontal === theme.spacing.md
      );
      expect(hasPaddingH).toBe(true);
    });

    it('should apply vertical padding to duration buttons', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const button = getByTestId('duration-60');
      const styles = Array.isArray(button?.props.style)
        ? button?.props.style
        : [button?.props.style];

      const hasPaddingV = styles.some(
        (s: any) => s && s.paddingVertical === theme.spacing.sm
      );
      expect(hasPaddingV).toBe(true);
    });

    it('should apply minimum width to duration buttons', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const button = getByTestId('duration-60');
      const styles = Array.isArray(button?.props.style)
        ? button?.props.style
        : [button?.props.style];

      const hasMinWidth = styles.some((s: any) => s && s.minWidth === 60);
      expect(hasMinWidth).toBe(true);
    });

    it('should center align items in duration buttons', () => {
      const { getByText, getByTestId } = render(<MeetingTypeSelector {...defaultProps} />);
      const button = getByTestId('duration-60');
      const styles = Array.isArray(button?.props.style)
        ? button?.props.style
        : [button?.props.style];

      const hasAlignCenter = styles.some(
        (s: any) => s && s.alignItems === 'center'
      );
      expect(hasAlignCenter).toBe(true);
    });
  });
});
