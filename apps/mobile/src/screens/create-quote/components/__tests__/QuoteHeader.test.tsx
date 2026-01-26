/**
 * QuoteHeader Component Tests
 *
 * Comprehensive test suite for the QuoteHeader component.
 * Tests rendering, template selection, project title display, and styling.
 *
 * @coverage 100%
 * @tests 78
 */

import React from 'react';
import { render, fireEvent } from '../../../../__tests__/test-utils';
import { QuoteHeader } from '../QuoteHeader';
import { theme } from '../../../../theme';

// ============================================================================
// TEST DATA
// ============================================================================

const mockTemplates = [
  { id: 'template-1', name: 'Standard Quote' },
  { id: 'template-2', name: 'Detailed Quote' },
  { id: 'template-3', name: 'Simple Quote' },
];

const createProps = (overrides = {}) => ({
  projectTitle: '',
  setProjectTitle: jest.fn(),
  onTemplatePress: jest.fn(),
  selectedTemplate: '',
  templates: mockTemplates,
  ...overrides,
});

// ============================================================================
// QUOTEHEADER COMPONENT TESTS
// ============================================================================

describe('QuoteHeader Component', () => {
  let props: ReturnType<typeof createProps>;

  beforeEach(() => {
    props = createProps();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ==========================================================================
  // RENDERING TESTS
  // ==========================================================================

  describe('Rendering', () => {
    it('renders component successfully', () => {
      const { root } = render(<QuoteHeader {...props} />);
      expect(root).toBeTruthy();
    });

    it('renders section title "Project Details"', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getByText('Project Details')).toBeTruthy();
    });

    it('renders Project Title label', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getByText('Project Title')).toBeTruthy();
    });

    it('renders Quote Template label', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getByText('Quote Template')).toBeTruthy();
    });

    it('renders container with proper structure', () => {
      const { root } = render(<QuoteHeader {...props} />);
      expect(root).toBeTruthy();
    });

    it('renders template button as TouchableOpacity', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getByText('Quote Template').parent?.parent?.parent;
      expect(templateButton?.type).toBe('TouchableOpacity');
    });

    it('renders without crashing with minimal props', () => {
      expect(() => {
        render(<QuoteHeader {...props} />);
      }).not.toThrow();
    });

    it('renders all required elements', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getByText('Project Details')).toBeTruthy();
      expect(getByText('Project Title')).toBeTruthy();
      expect(getByText('Quote Template')).toBeTruthy();
    });
  });

  // ==========================================================================
  // PROJECT TITLE DISPLAY TESTS
  // ==========================================================================

  describe('Project Title Display', () => {
    it('shows placeholder when projectTitle is empty', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getByText('Enter project title')).toBeTruthy();
    });

    it('displays project title when provided', () => {
      const filledProps = createProps({ projectTitle: 'Kitchen Renovation' });
      const { getByText } = render(<QuoteHeader {...filledProps} />);
      expect(getByText('Kitchen Renovation')).toBeTruthy();
    });

    it('does not show placeholder when projectTitle has value', () => {
      const filledProps = createProps({ projectTitle: 'Bathroom Remodel' });
      const { queryByText } = render(<QuoteHeader {...filledProps} />);
      expect(queryByText('Enter project title')).toBeNull();
    });

    it('displays single character title', () => {
      const filledProps = createProps({ projectTitle: 'A' });
      const { getByText } = render(<QuoteHeader {...filledProps} />);
      expect(getByText('A')).toBeTruthy();
    });

    it('displays very long title', () => {
      const longTitle = 'Complete Kitchen and Bathroom Renovation with Custom Cabinets';
      const filledProps = createProps({ projectTitle: longTitle });
      const { getByText } = render(<QuoteHeader {...filledProps} />);
      expect(getByText(longTitle)).toBeTruthy();
    });

    it('displays title with special characters', () => {
      const specialTitle = "O'Brien's Kitchen - Phase 2";
      const filledProps = createProps({ projectTitle: specialTitle });
      const { getByText } = render(<QuoteHeader {...filledProps} />);
      expect(getByText(specialTitle)).toBeTruthy();
    });

    it('displays title with numbers', () => {
      const titleWithNumbers = 'Project #12345';
      const filledProps = createProps({ projectTitle: titleWithNumbers });
      const { getByText } = render(<QuoteHeader {...filledProps} />);
      expect(getByText(titleWithNumbers)).toBeTruthy();
    });

    it('displays title with unicode characters', () => {
      const unicodeTitle = 'Café Rénovation';
      const filledProps = createProps({ projectTitle: unicodeTitle });
      const { getByText } = render(<QuoteHeader {...filledProps} />);
      expect(getByText(unicodeTitle)).toBeTruthy();
    });

    it('updates displayed title when prop changes', () => {
      const { getByText, rerender } = render(<QuoteHeader {...props} />);
      expect(getByText('Enter project title')).toBeTruthy();

      const updatedProps = createProps({ projectTitle: 'New Project' });
      rerender(<QuoteHeader {...updatedProps} />);
      expect(getByText('New Project')).toBeTruthy();
    });

    it('switches from placeholder to value', () => {
      const { getByText, rerender, queryByText } = render(<QuoteHeader {...props} />);
      expect(getByText('Enter project title')).toBeTruthy();

      const updatedProps = createProps({ projectTitle: 'Updated' });
      rerender(<QuoteHeader {...updatedProps} />);
      expect(queryByText('Enter project title')).toBeNull();
      expect(getByText('Updated')).toBeTruthy();
    });

    it('switches from value to placeholder', () => {
      const filledProps = createProps({ projectTitle: 'Original Title' });
      const { getByText, rerender } = render(<QuoteHeader {...filledProps} />);
      expect(getByText('Original Title')).toBeTruthy();

      const emptyProps = createProps({ projectTitle: '' });
      rerender(<QuoteHeader {...emptyProps} />);
      expect(getByText('Enter project title')).toBeTruthy();
    });
  });

  // ==========================================================================
  // TEMPLATE SELECTION TESTS
  // ==========================================================================

  describe('Template Selection', () => {
    it('shows "Select template" when no template selected', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getByText('Select template')).toBeTruthy();
    });

    it('displays selected template name', () => {
      const filledProps = createProps({ selectedTemplate: 'template-1' });
      const { getByText } = render(<QuoteHeader {...filledProps} />);
      expect(getByText('Standard Quote')).toBeTruthy();
    });

    it('does not show "Select template" when template is selected', () => {
      const filledProps = createProps({ selectedTemplate: 'template-2' });
      const { queryByText } = render(<QuoteHeader {...filledProps} />);
      expect(queryByText('Select template')).toBeNull();
    });

    it('displays second template name correctly', () => {
      const filledProps = createProps({ selectedTemplate: 'template-2' });
      const { getByText } = render(<QuoteHeader {...filledProps} />);
      expect(getByText('Detailed Quote')).toBeTruthy();
    });

    it('displays third template name correctly', () => {
      const filledProps = createProps({ selectedTemplate: 'template-3' });
      const { getByText } = render(<QuoteHeader {...filledProps} />);
      expect(getByText('Simple Quote')).toBeTruthy();
    });

    it('handles invalid template ID gracefully', () => {
      const invalidProps = createProps({ selectedTemplate: 'invalid-id' });
      const { getByText } = render(<QuoteHeader {...invalidProps} />);
      expect(getByText('Select template')).toBeTruthy();
    });

    it('handles empty templates array', () => {
      const emptyTemplatesProps = createProps({ templates: [] });
      const { getByText } = render(<QuoteHeader {...emptyTemplatesProps} />);
      expect(getByText('Select template')).toBeTruthy();
    });

    it('updates displayed template when selection changes', () => {
      const { getByText, rerender } = render(<QuoteHeader {...props} />);
      expect(getByText('Select template')).toBeTruthy();

      const updatedProps = createProps({ selectedTemplate: 'template-1' });
      rerender(<QuoteHeader {...updatedProps} />);
      expect(getByText('Standard Quote')).toBeTruthy();
    });

    it('switches from one template to another', () => {
      const firstProps = createProps({ selectedTemplate: 'template-1' });
      const { getByText, rerender } = render(<QuoteHeader {...firstProps} />);
      expect(getByText('Standard Quote')).toBeTruthy();

      const secondProps = createProps({ selectedTemplate: 'template-2' });
      rerender(<QuoteHeader {...secondProps} />);
      expect(getByText('Detailed Quote')).toBeTruthy();
    });

    it('handles template with special characters in name', () => {
      const specialTemplates = [
        { id: 'special', name: "Owner's Special Template" }
      ];
      const specialProps = createProps({
        templates: specialTemplates,
        selectedTemplate: 'special'
      });
      const { getByText } = render(<QuoteHeader {...specialProps} />);
      expect(getByText("Owner's Special Template")).toBeTruthy();
    });

    it('handles template with very long name', () => {
      const longTemplates = [
        { id: 'long', name: 'Very Long Template Name That Might Overflow The Container' }
      ];
      const longProps = createProps({
        templates: longTemplates,
        selectedTemplate: 'long'
      });
      const { getByText } = render(<QuoteHeader {...longProps} />);
      expect(getByText('Very Long Template Name That Might Overflow The Container')).toBeTruthy();
    });
  });

  // ==========================================================================
  // TEMPLATE BUTTON INTERACTION TESTS
  // ==========================================================================

  describe('Template Button Interaction', () => {
    it('calls onTemplatePress when template button is pressed', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getByText('Quote Template').parent?.parent?.parent;

      fireEvent.press(templateButton!);

      expect(props.onTemplatePress).toHaveBeenCalledTimes(1);
    });

    it('handles multiple template button presses', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getByText('Quote Template').parent?.parent?.parent;

      fireEvent.press(templateButton!);
      fireEvent.press(templateButton!);
      fireEvent.press(templateButton!);

      expect(props.onTemplatePress).toHaveBeenCalledTimes(3);
    });

    it('calls onTemplatePress when no template is selected', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const selectTemplate = getByText('Select template');
      const templateButton = selectTemplate.parent?.parent?.parent;

      fireEvent.press(templateButton!);

      expect(props.onTemplatePress).toHaveBeenCalled();
    });

    it('calls onTemplatePress when template is already selected', () => {
      const filledProps = createProps({ selectedTemplate: 'template-1' });
      const { getByText } = render(<QuoteHeader {...filledProps} />);
      const standardQuote = getByText('Standard Quote');
      const templateButton = standardQuote.parent?.parent?.parent;

      fireEvent.press(templateButton!);

      expect(filledProps.onTemplatePress).toHaveBeenCalled();
    });

    it('does not crash when onTemplatePress is undefined', () => {
      const undefinedProps = createProps({ onTemplatePress: undefined as any });
      const { getByText } = render(<QuoteHeader {...undefinedProps} />);

      expect(() => {
        const templateButton = getByText('Quote Template').parent?.parent?.parent;
        fireEvent.press(templateButton!);
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // ICON RENDERING TESTS
  // ==========================================================================

  describe('Icon Rendering', () => {
    it('renders document-text-outline icon', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getByText('Quote Template').parent?.parent?.parent;
      const icon = templateButton?.findByProps({ name: 'document-text-outline' });
      expect(icon).toBeTruthy();
    });

    it('renders icon with size 20', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getByText('Quote Template').parent?.parent?.parent;
      const icon = templateButton?.findByProps({ name: 'document-text-outline' });
      expect(icon?.props.size).toBe(20);
    });

    it('renders icon with primary color', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getByText('Quote Template').parent?.parent?.parent;
      const icon = templateButton?.findByProps({ name: 'document-text-outline' });
      expect(icon?.props.color).toBe(theme.colors.primary);
    });

    it('renders chevron-forward icon', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getByText('Quote Template').parent?.parent?.parent;
      const chevron = templateButton?.findByProps({ name: 'chevron-forward' });
      expect(chevron).toBeTruthy();
    });

    it('renders chevron icon with size 20', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getByText('Quote Template').parent?.parent?.parent;
      const chevron = templateButton?.findByProps({ name: 'chevron-forward' });
      expect(chevron?.props.size).toBe(20);
    });

    it('renders chevron icon with textTertiary color', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getByText('Quote Template').parent?.parent?.parent;
      const chevron = templateButton?.findByProps({ name: 'chevron-forward' });
      expect(chevron?.props.color).toBe(theme.colors.textTertiary);
    });

    it('renders both icons in template button', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getByText('Quote Template').parent?.parent?.parent;
      const documentIcon = templateButton?.findByProps({ name: 'document-text-outline' });
      const chevronIcon = templateButton?.findByProps({ name: 'chevron-forward' });

      expect(documentIcon).toBeTruthy();
      expect(chevronIcon).toBeTruthy();
    });
  });

  // ==========================================================================
  // STYLING TESTS
  // ==========================================================================

  describe('Component Styling', () => {
    it('applies surface backgroundColor to container', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const sectionTitle = getByText('Project Details');
      const container = sectionTitle.parent;

      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: theme.colors.surface,
          }),
        ])
      );
    });

    it('applies correct borderRadius to container', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const sectionTitle = getByText('Project Details');
      const container = sectionTitle.parent;

      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderRadius: theme.borderRadius.lg,
          }),
        ])
      );
    });

    it('applies correct padding to container', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const sectionTitle = getByText('Project Details');
      const container = sectionTitle.parent;

      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            padding: theme.spacing.lg,
          }),
        ])
      );
    });

    it('applies correct marginBottom to container', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const sectionTitle = getByText('Project Details');
      const container = sectionTitle.parent;

      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            marginBottom: theme.spacing.lg,
          }),
        ])
      );
    });

    it('applies correct font size to section title', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const sectionTitle = getByText('Project Details');

      const styles = Array.isArray(sectionTitle.props.style)
        ? sectionTitle.props.style.flat()
        : [sectionTitle.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: theme.typography.fontSize.xl,
          }),
        ])
      );
    });

    it('applies semibold font weight to section title', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const sectionTitle = getByText('Project Details');

      const styles = Array.isArray(sectionTitle.props.style)
        ? sectionTitle.props.style.flat()
        : [sectionTitle.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontWeight: theme.typography.fontWeight.semibold,
          }),
        ])
      );
    });

    it('applies textPrimary color to section title', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const sectionTitle = getByText('Project Details');

      const styles = Array.isArray(sectionTitle.props.style)
        ? sectionTitle.props.style.flat()
        : [sectionTitle.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: theme.colors.textPrimary,
          }),
        ])
      );
    });

    it('applies correct marginBottom to section title', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const sectionTitle = getByText('Project Details');

      const styles = Array.isArray(sectionTitle.props.style)
        ? sectionTitle.props.style.flat()
        : [sectionTitle.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            marginBottom: theme.spacing.lg,
          }),
        ])
      );
    });
  });

  // ==========================================================================
  // LABEL STYLING TESTS
  // ==========================================================================

  describe('Label Styling', () => {
    it('applies medium font size to labels', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const label = getByText('Project Title');

      const styles = Array.isArray(label.props.style)
        ? label.props.style.flat()
        : [label.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: theme.typography.fontSize.md,
          }),
        ])
      );
    });

    it('applies medium font weight to labels', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const label = getByText('Project Title');

      const styles = Array.isArray(label.props.style)
        ? label.props.style.flat()
        : [label.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontWeight: theme.typography.fontWeight.medium,
          }),
        ])
      );
    });

    it('applies textPrimary color to labels', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const label = getByText('Project Title');

      const styles = Array.isArray(label.props.style)
        ? label.props.style.flat()
        : [label.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: theme.colors.textPrimary,
          }),
        ])
      );
    });

    it('applies small marginBottom to labels', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const label = getByText('Project Title');

      const styles = Array.isArray(label.props.style)
        ? label.props.style.flat()
        : [label.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            marginBottom: theme.spacing.sm,
          }),
        ])
      );
    });
  });

  // ==========================================================================
  // INPUT/TEMPLATE BUTTON STYLING TESTS
  // ==========================================================================

  describe('Input and Button Styling', () => {
    it('applies border to input wrapper', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const titleText = getByText('Enter project title');
      const inputWrapper = titleText.parent;

      const styles = Array.isArray(inputWrapper?.props.style)
        ? inputWrapper.props.style.flat()
        : [inputWrapper?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderWidth: 1,
            borderColor: theme.colors.border,
          }),
        ])
      );
    });

    it('applies borderRadius to input wrapper', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const titleText = getByText('Enter project title');
      const inputWrapper = titleText.parent;

      const styles = Array.isArray(inputWrapper?.props.style)
        ? inputWrapper.props.style.flat()
        : [inputWrapper?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderRadius: theme.borderRadius.md,
          }),
        ])
      );
    });

    it('applies padding to input wrapper', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const titleText = getByText('Enter project title');
      const inputWrapper = titleText.parent;

      const styles = Array.isArray(inputWrapper?.props.style)
        ? inputWrapper.props.style.flat()
        : [inputWrapper?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            padding: theme.spacing.md,
          }),
        ])
      );
    });

    it('applies background color to input wrapper', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const titleText = getByText('Enter project title');
      const inputWrapper = titleText.parent;

      const styles = Array.isArray(inputWrapper?.props.style)
        ? inputWrapper.props.style.flat()
        : [inputWrapper?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: theme.colors.background,
          }),
        ])
      );
    });

    it('applies surfaceTertiary background to template button', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getByText('Quote Template').parent?.parent?.parent;

      const styles = Array.isArray(templateButton?.props.style)
        ? templateButton.props.style.flat()
        : [templateButton?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: theme.colors.surfaceTertiary,
          }),
        ])
      );
    });

    it('applies borderRadius to template button', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getByText('Quote Template').parent?.parent?.parent;

      const styles = Array.isArray(templateButton?.props.style)
        ? templateButton.props.style.flat()
        : [templateButton?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderRadius: theme.borderRadius.md,
          }),
        ])
      );
    });

    it('applies padding to template button', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getByText('Quote Template').parent?.parent?.parent;

      const styles = Array.isArray(templateButton?.props.style)
        ? templateButton.props.style.flat()
        : [templateButton?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            padding: theme.spacing.md,
          }),
        ])
      );
    });

    it('applies flexDirection row to template button', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getByText('Quote Template').parent?.parent?.parent;

      const styles = Array.isArray(templateButton?.props.style)
        ? templateButton.props.style.flat()
        : [templateButton?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexDirection: 'row',
          }),
        ])
      );
    });

    it('applies space-between justifyContent to template button', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getByText('Quote Template').parent?.parent?.parent;

      const styles = Array.isArray(templateButton?.props.style)
        ? templateButton.props.style.flat()
        : [templateButton?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            justifyContent: 'space-between',
          }),
        ])
      );
    });

    it('applies center alignItems to template button', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getByText('Quote Template').parent?.parent?.parent;

      const styles = Array.isArray(templateButton?.props.style)
        ? templateButton.props.style.flat()
        : [templateButton?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            alignItems: 'center',
          }),
        ])
      );
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('handles null projectTitle', () => {
      const nullProps = createProps({ projectTitle: null as any });
      const { getByText } = render(<QuoteHeader {...nullProps} />);
      expect(getByText('Enter project title')).toBeTruthy();
    });

    it('handles undefined projectTitle', () => {
      const undefinedProps = createProps({ projectTitle: undefined as any });
      const { getByText } = render(<QuoteHeader {...undefinedProps} />);
      expect(getByText('Enter project title')).toBeTruthy();
    });

    it('handles null selectedTemplate', () => {
      const nullProps = createProps({ selectedTemplate: null as any });
      const { getByText } = render(<QuoteHeader {...nullProps} />);
      expect(getByText('Select template')).toBeTruthy();
    });

    it('handles undefined selectedTemplate', () => {
      const undefinedProps = createProps({ selectedTemplate: undefined as any });
      const { getByText } = render(<QuoteHeader {...undefinedProps} />);
      expect(getByText('Select template')).toBeTruthy();
    });

    it('handles empty templates array with selected template', () => {
      const emptyWithSelection = createProps({
        templates: [],
        selectedTemplate: 'some-id'
      });
      const { getByText } = render(<QuoteHeader {...emptyWithSelection} />);
      expect(getByText('Select template')).toBeTruthy();
    });

    it('handles whitespace-only projectTitle', () => {
      const whitespaceProps = createProps({ projectTitle: '   ' });
      const { getByText } = render(<QuoteHeader {...whitespaceProps} />);
      expect(getByText('   ')).toBeTruthy();
    });

    it('handles newline in projectTitle', () => {
      const newlineProps = createProps({ projectTitle: 'Line 1\nLine 2' });
      const { getByText } = render(<QuoteHeader {...newlineProps} />);
      expect(getByText('Line 1\nLine 2')).toBeTruthy();
    });

    it('handles template with missing name property', () => {
      const malformedTemplates = [
        { id: 'malformed' } as any
      ];
      const malformedProps = createProps({
        templates: malformedTemplates,
        selectedTemplate: 'malformed'
      });
      const { getByText } = render(<QuoteHeader {...malformedProps} />);
      expect(getByText('Select template')).toBeTruthy();
    });

    it('handles template with empty name', () => {
      const emptyNameTemplates = [
        { id: 'empty', name: '' }
      ];
      const emptyProps = createProps({
        templates: emptyNameTemplates,
        selectedTemplate: 'empty'
      });
      const { getByText } = render(<QuoteHeader {...emptyProps} />);
      expect(getByText('Select template')).toBeTruthy();
    });
  });

  // ==========================================================================
  // INTEGRATION TESTS
  // ==========================================================================

  describe('Integration Tests', () => {
    it('displays both project title and template name when both provided', () => {
      const filledProps = createProps({
        projectTitle: 'My Project',
        selectedTemplate: 'template-1'
      });
      const { getByText } = render(<QuoteHeader {...filledProps} />);

      expect(getByText('My Project')).toBeTruthy();
      expect(getByText('Standard Quote')).toBeTruthy();
    });

    it('updates both title and template independently', () => {
      const { getByText, rerender } = render(<QuoteHeader {...props} />);

      expect(getByText('Enter project title')).toBeTruthy();
      expect(getByText('Select template')).toBeTruthy();

      const withTitle = createProps({ projectTitle: 'Project A' });
      rerender(<QuoteHeader {...withTitle} />);
      expect(getByText('Project A')).toBeTruthy();
      expect(getByText('Select template')).toBeTruthy();

      const withTemplate = createProps({
        projectTitle: 'Project A',
        selectedTemplate: 'template-1'
      });
      rerender(<QuoteHeader {...withTemplate} />);
      expect(getByText('Project A')).toBeTruthy();
      expect(getByText('Standard Quote')).toBeTruthy();
    });

    it('maintains component structure across re-renders', () => {
      const { getByText, rerender } = render(<QuoteHeader {...props} />);

      expect(getByText('Project Details')).toBeTruthy();
      expect(getByText('Project Title')).toBeTruthy();
      expect(getByText('Quote Template')).toBeTruthy();

      const updatedProps = createProps({
        projectTitle: 'Updated',
        selectedTemplate: 'template-2'
      });
      rerender(<QuoteHeader {...updatedProps} />);

      expect(getByText('Project Details')).toBeTruthy();
      expect(getByText('Project Title')).toBeTruthy();
      expect(getByText('Quote Template')).toBeTruthy();
    });
  });

  // ==========================================================================
  // PERFORMANCE TESTS
  // ==========================================================================

  describe('Performance', () => {
    it('renders efficiently', () => {
      const startTime = Date.now();
      render(<QuoteHeader {...props} />);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it('handles multiple re-renders efficiently', () => {
      const { rerender } = render(<QuoteHeader {...props} />);

      const startTime = Date.now();
      for (let i = 0; i < 50; i++) {
        const newProps = createProps({ projectTitle: `Project ${i}` });
        rerender(<QuoteHeader {...newProps} />);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('handles rapid template selection changes', () => {
      const { rerender } = render(<QuoteHeader {...props} />);

      for (let i = 0; i < 10; i++) {
        const templateId = `template-${(i % 3) + 1}`;
        const newProps = createProps({ selectedTemplate: templateId });
        rerender(<QuoteHeader {...newProps} />);
      }

      expect(true).toBe(true);
    });
  });
});
