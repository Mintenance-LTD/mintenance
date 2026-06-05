/**
 * QuoteHeader Component Tests
 *
 * Test suite for the QuoteHeader component.
 *
 * Realigned 2026-06-04 to the Mint Editorial design. Changes vs the legacy
 * suite:
 *  - The project title is now a real <TextInput> (accessibilityLabel
 *    "Project title", placeholder "e.g. Bathroom Renovation Quote"), not a
 *    Text node. Title state is asserted via the input's `value`/`placeholder`
 *    props and `setProjectTitle` is exercised via `fireEvent.changeText`.
 *  - The template button shows the label "Quote Template" with a value line
 *    that reads "Choose a template (optional)" when nothing is selected, or the
 *    selected template name otherwise.
 *  - Icons are `document-text` (16), `copy-outline` (18) and `chevron-forward`
 *    (18); colours come from the `me` (mint-editorial) tokens.
 *  - Structurally, the template TouchableOpacity is the GRAND-parent of the
 *    "Quote Template" label (label -> textWrap View -> TouchableOpacity).
 *
 * @coverage component-behaviour
 */

import React from 'react';
import { render, fireEvent } from '../../../../__tests__/test-utils';
import { QuoteHeader } from '../QuoteHeader';
import { me } from '../../../../design-system/mint-editorial';

// ============================================================================
// TEST DATA
// ============================================================================

const TITLE_PLACEHOLDER = 'e.g. Bathroom Renovation Quote';
const NO_TEMPLATE_TEXT = 'Choose a template (optional)';

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

// Helper: the template TouchableOpacity is the grand-parent of its label.
const getTemplateButton = (getByText: any) =>
  getByText('Quote Template').parent?.parent;

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

    it('renders the project title text input', () => {
      const { getByPlaceholderText } = render(<QuoteHeader {...props} />);
      expect(getByPlaceholderText(TITLE_PLACEHOLDER)).toBeTruthy();
    });

    it('renders template button as TouchableOpacity', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getTemplateButton(getByText);
      expect(templateButton?.type).toBe('TouchableOpacity');
    });

    it('renders without crashing with minimal props', () => {
      expect(() => {
        render(<QuoteHeader {...props} />);
      }).not.toThrow();
    });

    it('renders all required elements', () => {
      const { getByText, getByPlaceholderText } = render(
        <QuoteHeader {...props} />
      );
      expect(getByText('Project Details')).toBeTruthy();
      expect(getByText('Project Title')).toBeTruthy();
      expect(getByText('Quote Template')).toBeTruthy();
      expect(getByPlaceholderText(TITLE_PLACEHOLDER)).toBeTruthy();
    });
  });

  // ==========================================================================
  // PROJECT TITLE INPUT TESTS
  // ==========================================================================

  describe('Project Title Input', () => {
    it('shows placeholder when projectTitle is empty', () => {
      const { getByPlaceholderText } = render(<QuoteHeader {...props} />);
      expect(getByPlaceholderText(TITLE_PLACEHOLDER)).toBeTruthy();
    });

    it('displays project title value when provided', () => {
      const filledProps = createProps({ projectTitle: 'Kitchen Renovation' });
      const { getByDisplayValue } = render(<QuoteHeader {...filledProps} />);
      expect(getByDisplayValue('Kitchen Renovation')).toBeTruthy();
    });

    it('calls setProjectTitle when text changes', () => {
      const { getByPlaceholderText } = render(<QuoteHeader {...props} />);
      const input = getByPlaceholderText(TITLE_PLACEHOLDER);
      fireEvent.changeText(input, 'New Title');
      expect(props.setProjectTitle).toHaveBeenCalledWith('New Title');
    });

    it('displays single character title', () => {
      const filledProps = createProps({ projectTitle: 'A' });
      const { getByDisplayValue } = render(<QuoteHeader {...filledProps} />);
      expect(getByDisplayValue('A')).toBeTruthy();
    });

    it('displays very long title', () => {
      const longTitle =
        'Complete Kitchen and Bathroom Renovation with Custom Cabinets';
      const filledProps = createProps({ projectTitle: longTitle });
      const { getByDisplayValue } = render(<QuoteHeader {...filledProps} />);
      expect(getByDisplayValue(longTitle)).toBeTruthy();
    });

    it('displays title with special characters', () => {
      const specialTitle = "O'Brien's Kitchen - Phase 2";
      const filledProps = createProps({ projectTitle: specialTitle });
      const { getByDisplayValue } = render(<QuoteHeader {...filledProps} />);
      expect(getByDisplayValue(specialTitle)).toBeTruthy();
    });

    it('displays title with numbers', () => {
      const titleWithNumbers = 'Project #12345';
      const filledProps = createProps({ projectTitle: titleWithNumbers });
      const { getByDisplayValue } = render(<QuoteHeader {...filledProps} />);
      expect(getByDisplayValue(titleWithNumbers)).toBeTruthy();
    });

    it('displays title with unicode characters', () => {
      const unicodeTitle = 'Café Rénovation';
      const filledProps = createProps({ projectTitle: unicodeTitle });
      const { getByDisplayValue } = render(<QuoteHeader {...filledProps} />);
      expect(getByDisplayValue(unicodeTitle)).toBeTruthy();
    });

    it('updates displayed title when prop changes', () => {
      const { getByPlaceholderText, getByDisplayValue, rerender } = render(
        <QuoteHeader {...props} />
      );
      expect(getByPlaceholderText(TITLE_PLACEHOLDER)).toBeTruthy();

      const updatedProps = createProps({ projectTitle: 'New Project' });
      rerender(<QuoteHeader {...updatedProps} />);
      expect(getByDisplayValue('New Project')).toBeTruthy();
    });

    it('switches from value to placeholder when cleared', () => {
      const filledProps = createProps({ projectTitle: 'Original Title' });
      const { getByDisplayValue, getByPlaceholderText, rerender } = render(
        <QuoteHeader {...filledProps} />
      );
      expect(getByDisplayValue('Original Title')).toBeTruthy();

      const emptyProps = createProps({ projectTitle: '' });
      rerender(<QuoteHeader {...emptyProps} />);
      expect(getByPlaceholderText(TITLE_PLACEHOLDER)).toBeTruthy();
    });

    it('has the Project title accessibility label', () => {
      const { getByLabelText } = render(<QuoteHeader {...props} />);
      expect(getByLabelText('Project title')).toBeTruthy();
    });
  });

  // ==========================================================================
  // TEMPLATE SELECTION TESTS
  // ==========================================================================

  describe('Template Selection', () => {
    it('shows the optional-template hint when no template selected', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getByText(NO_TEMPLATE_TEXT)).toBeTruthy();
    });

    it('displays selected template name', () => {
      const filledProps = createProps({ selectedTemplate: 'template-1' });
      const { getByText } = render(<QuoteHeader {...filledProps} />);
      expect(getByText('Standard Quote')).toBeTruthy();
    });

    it('does not show the optional-template hint when template is selected', () => {
      const filledProps = createProps({ selectedTemplate: 'template-2' });
      const { queryByText } = render(<QuoteHeader {...filledProps} />);
      expect(queryByText(NO_TEMPLATE_TEXT)).toBeNull();
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
      expect(getByText(NO_TEMPLATE_TEXT)).toBeTruthy();
    });

    it('handles empty templates array', () => {
      const emptyTemplatesProps = createProps({ templates: [] });
      const { getByText } = render(<QuoteHeader {...emptyTemplatesProps} />);
      expect(getByText(NO_TEMPLATE_TEXT)).toBeTruthy();
    });

    it('updates displayed template when selection changes', () => {
      const { getByText, rerender } = render(<QuoteHeader {...props} />);
      expect(getByText(NO_TEMPLATE_TEXT)).toBeTruthy();

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
        { id: 'special', name: "Owner's Special Template" },
      ];
      const specialProps = createProps({
        templates: specialTemplates,
        selectedTemplate: 'special',
      });
      const { getByText } = render(<QuoteHeader {...specialProps} />);
      expect(getByText("Owner's Special Template")).toBeTruthy();
    });

    it('handles template with very long name', () => {
      const longTemplates = [
        {
          id: 'long',
          name: 'Very Long Template Name That Might Overflow The Container',
        },
      ];
      const longProps = createProps({
        templates: longTemplates,
        selectedTemplate: 'long',
      });
      const { getByText } = render(<QuoteHeader {...longProps} />);
      expect(
        getByText('Very Long Template Name That Might Overflow The Container')
      ).toBeTruthy();
    });
  });

  // ==========================================================================
  // TEMPLATE BUTTON INTERACTION TESTS
  // ==========================================================================

  describe('Template Button Interaction', () => {
    it('calls onTemplatePress when template button is pressed', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      fireEvent.press(getTemplateButton(getByText)!);
      expect(props.onTemplatePress).toHaveBeenCalledTimes(1);
    });

    it('handles multiple template button presses', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getTemplateButton(getByText);

      fireEvent.press(templateButton!);
      fireEvent.press(templateButton!);
      fireEvent.press(templateButton!);

      expect(props.onTemplatePress).toHaveBeenCalledTimes(3);
    });

    it('calls onTemplatePress when no template is selected', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      fireEvent.press(getTemplateButton(getByText)!);
      expect(props.onTemplatePress).toHaveBeenCalled();
    });

    it('calls onTemplatePress when template is already selected', () => {
      const filledProps = createProps({ selectedTemplate: 'template-1' });
      const { getByText } = render(<QuoteHeader {...filledProps} />);
      fireEvent.press(getTemplateButton(getByText)!);
      expect(filledProps.onTemplatePress).toHaveBeenCalled();
    });

    it('does not crash when onTemplatePress is undefined', () => {
      const undefinedProps = createProps({ onTemplatePress: undefined as any });
      const { getByText } = render(<QuoteHeader {...undefinedProps} />);

      expect(() => {
        fireEvent.press(getTemplateButton(getByText)!);
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // ICON RENDERING TESTS
  // ==========================================================================

  describe('Icon Rendering', () => {
    it('renders copy-outline template icon', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getTemplateButton(getByText);
      const icon = templateButton?.findByProps({ name: 'copy-outline' });
      expect(icon).toBeTruthy();
    });

    it('renders template icon with size 18', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getTemplateButton(getByText);
      const icon = templateButton?.findByProps({ name: 'copy-outline' });
      expect(icon?.props.size).toBe(18);
    });

    it('renders template icon with brand color', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getTemplateButton(getByText);
      const icon = templateButton?.findByProps({ name: 'copy-outline' });
      expect(icon?.props.color).toBe(me.brand);
    });

    it('renders chevron-forward icon', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getTemplateButton(getByText);
      const chevron = templateButton?.findByProps({ name: 'chevron-forward' });
      expect(chevron).toBeTruthy();
    });

    it('renders chevron icon with size 18', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getTemplateButton(getByText);
      const chevron = templateButton?.findByProps({ name: 'chevron-forward' });
      expect(chevron?.props.size).toBe(18);
    });

    it('renders chevron icon with ink3 color', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getTemplateButton(getByText);
      const chevron = templateButton?.findByProps({ name: 'chevron-forward' });
      expect(chevron?.props.color).toBe(me.ink3);
    });

    it('renders both icons in template button', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const templateButton = getTemplateButton(getByText);
      const copyIcon = templateButton?.findByProps({ name: 'copy-outline' });
      const chevronIcon = templateButton?.findByProps({
        name: 'chevron-forward',
      });

      expect(copyIcon).toBeTruthy();
      expect(chevronIcon).toBeTruthy();
    });

    it('renders the document-text section icon', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      // Container is the grand-parent of the "Project Details" section title.
      const container = getByText('Project Details').parent?.parent;
      const icon = container?.findByProps({ name: 'document-text' });
      expect(icon).toBeTruthy();
      expect(icon?.props.size).toBe(16);
      expect(icon?.props.color).toBe(me.brand);
    });
  });

  // ==========================================================================
  // STYLING TESTS
  // ==========================================================================

  describe('Component Styling', () => {
    const getContainerStyles = (getByText: any) => {
      // Container is the grand-parent of the section title; the immediate
      // parent is the sectionHeader row.
      const container = getByText('Project Details').parent?.parent;
      return Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];
    };

    it('applies surface backgroundColor to container', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getContainerStyles(getByText)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: me.surface }),
        ])
      );
    });

    it('applies correct borderRadius to container', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getContainerStyles(getByText)).toEqual(
        expect.arrayContaining([expect.objectContaining({ borderRadius: 20 })])
      );
    });

    it('applies correct padding to container', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getContainerStyles(getByText)).toEqual(
        expect.arrayContaining([expect.objectContaining({ padding: 20 })])
      );
    });

    it('applies correct marginBottom to container', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getContainerStyles(getByText)).toEqual(
        expect.arrayContaining([expect.objectContaining({ marginBottom: 12 })])
      );
    });

    it('applies correct font size to section title', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const sectionTitle = getByText('Project Details');
      const styles = Array.isArray(sectionTitle.props.style)
        ? sectionTitle.props.style.flat()
        : [sectionTitle.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontSize: 17 })])
      );
    });

    it('applies bold font weight to section title', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const sectionTitle = getByText('Project Details');
      const styles = Array.isArray(sectionTitle.props.style)
        ? sectionTitle.props.style.flat()
        : [sectionTitle.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontWeight: '700' })])
      );
    });

    it('applies ink color to section title', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      const sectionTitle = getByText('Project Details');
      const styles = Array.isArray(sectionTitle.props.style)
        ? sectionTitle.props.style.flat()
        : [sectionTitle.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: me.ink })])
      );
    });
  });

  // ==========================================================================
  // LABEL STYLING TESTS
  // ==========================================================================

  describe('Label Styling', () => {
    const getLabelStyles = (getByText: any) => {
      const label = getByText('Project Title');
      return Array.isArray(label.props.style)
        ? label.props.style.flat()
        : [label.props.style];
    };

    it('applies correct font size to labels', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getLabelStyles(getByText)).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontSize: 13 })])
      );
    });

    it('applies semibold font weight to labels', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getLabelStyles(getByText)).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontWeight: '600' })])
      );
    });

    it('applies ink2 color to labels', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getLabelStyles(getByText)).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: me.ink2 })])
      );
    });

    it('applies uppercase transform to labels', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getLabelStyles(getByText)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ textTransform: 'uppercase' }),
        ])
      );
    });
  });

  // ==========================================================================
  // INPUT/TEMPLATE BUTTON STYLING TESTS
  // ==========================================================================

  describe('Input and Button Styling', () => {
    const getInputStyles = (getByPlaceholderText: any) => {
      const input = getByPlaceholderText(TITLE_PLACEHOLDER);
      return Array.isArray(input.props.style)
        ? input.props.style.flat()
        : [input.props.style];
    };

    const getTemplateButtonStyles = (getByText: any) => {
      const templateButton = getTemplateButton(getByText);
      return Array.isArray(templateButton?.props.style)
        ? templateButton.props.style.flat()
        : [templateButton?.props.style];
    };

    it('applies border to text input', () => {
      const { getByPlaceholderText } = render(<QuoteHeader {...props} />);
      expect(getInputStyles(getByPlaceholderText)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ borderWidth: 1, borderColor: me.line }),
        ])
      );
    });

    it('applies borderRadius to text input', () => {
      const { getByPlaceholderText } = render(<QuoteHeader {...props} />);
      expect(getInputStyles(getByPlaceholderText)).toEqual(
        expect.arrayContaining([expect.objectContaining({ borderRadius: 14 })])
      );
    });

    it('applies padding to text input', () => {
      const { getByPlaceholderText } = render(<QuoteHeader {...props} />);
      expect(getInputStyles(getByPlaceholderText)).toEqual(
        expect.arrayContaining([expect.objectContaining({ padding: 14 })])
      );
    });

    it('applies sunken background color to text input', () => {
      const { getByPlaceholderText } = render(<QuoteHeader {...props} />);
      expect(getInputStyles(getByPlaceholderText)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: me.bg2 }),
        ])
      );
    });

    it('applies sunken background to template button', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getTemplateButtonStyles(getByText)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: me.bg2 }),
        ])
      );
    });

    it('applies borderRadius to template button', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getTemplateButtonStyles(getByText)).toEqual(
        expect.arrayContaining([expect.objectContaining({ borderRadius: 14 })])
      );
    });

    it('applies padding to template button', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getTemplateButtonStyles(getByText)).toEqual(
        expect.arrayContaining([expect.objectContaining({ padding: 14 })])
      );
    });

    it('applies flexDirection row to template button', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getTemplateButtonStyles(getByText)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ flexDirection: 'row' }),
        ])
      );
    });

    it('applies center alignItems to template button', () => {
      const { getByText } = render(<QuoteHeader {...props} />);
      expect(getTemplateButtonStyles(getByText)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ alignItems: 'center' }),
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
      const { getByPlaceholderText } = render(<QuoteHeader {...nullProps} />);
      expect(getByPlaceholderText(TITLE_PLACEHOLDER)).toBeTruthy();
    });

    it('handles undefined projectTitle', () => {
      const undefinedProps = createProps({ projectTitle: undefined as any });
      const { getByPlaceholderText } = render(
        <QuoteHeader {...undefinedProps} />
      );
      expect(getByPlaceholderText(TITLE_PLACEHOLDER)).toBeTruthy();
    });

    it('handles null selectedTemplate', () => {
      const nullProps = createProps({ selectedTemplate: null as any });
      const { getByText } = render(<QuoteHeader {...nullProps} />);
      expect(getByText(NO_TEMPLATE_TEXT)).toBeTruthy();
    });

    it('handles undefined selectedTemplate', () => {
      const undefinedProps = createProps({
        selectedTemplate: undefined as any,
      });
      const { getByText } = render(<QuoteHeader {...undefinedProps} />);
      expect(getByText(NO_TEMPLATE_TEXT)).toBeTruthy();
    });

    it('handles empty templates array with selected template', () => {
      const emptyWithSelection = createProps({
        templates: [],
        selectedTemplate: 'some-id',
      });
      const { getByText } = render(<QuoteHeader {...emptyWithSelection} />);
      expect(getByText(NO_TEMPLATE_TEXT)).toBeTruthy();
    });

    it('handles whitespace-only projectTitle as a value', () => {
      const whitespaceProps = createProps({ projectTitle: '   ' });
      const { getByDisplayValue } = render(
        <QuoteHeader {...whitespaceProps} />
      );
      expect(getByDisplayValue('   ')).toBeTruthy();
    });

    it('handles template with missing name property', () => {
      const malformedTemplates = [{ id: 'malformed' } as any];
      const malformedProps = createProps({
        templates: malformedTemplates,
        selectedTemplate: 'malformed',
      });
      const { getByText } = render(<QuoteHeader {...malformedProps} />);
      expect(getByText(NO_TEMPLATE_TEXT)).toBeTruthy();
    });

    it('handles template with empty name', () => {
      const emptyNameTemplates = [{ id: 'empty', name: '' }];
      const emptyProps = createProps({
        templates: emptyNameTemplates,
        selectedTemplate: 'empty',
      });
      const { getByText } = render(<QuoteHeader {...emptyProps} />);
      expect(getByText(NO_TEMPLATE_TEXT)).toBeTruthy();
    });
  });

  // ==========================================================================
  // INTEGRATION TESTS
  // ==========================================================================

  describe('Integration Tests', () => {
    it('displays both project title and template name when both provided', () => {
      const filledProps = createProps({
        projectTitle: 'My Project',
        selectedTemplate: 'template-1',
      });
      const { getByDisplayValue, getByText } = render(
        <QuoteHeader {...filledProps} />
      );

      expect(getByDisplayValue('My Project')).toBeTruthy();
      expect(getByText('Standard Quote')).toBeTruthy();
    });

    it('updates both title and template independently', () => {
      const { getByPlaceholderText, getByDisplayValue, getByText, rerender } =
        render(<QuoteHeader {...props} />);

      expect(getByPlaceholderText(TITLE_PLACEHOLDER)).toBeTruthy();
      expect(getByText(NO_TEMPLATE_TEXT)).toBeTruthy();

      const withTitle = createProps({ projectTitle: 'Project A' });
      rerender(<QuoteHeader {...withTitle} />);
      expect(getByDisplayValue('Project A')).toBeTruthy();
      expect(getByText(NO_TEMPLATE_TEXT)).toBeTruthy();

      const withTemplate = createProps({
        projectTitle: 'Project A',
        selectedTemplate: 'template-1',
      });
      rerender(<QuoteHeader {...withTemplate} />);
      expect(getByDisplayValue('Project A')).toBeTruthy();
      expect(getByText('Standard Quote')).toBeTruthy();
    });

    it('maintains component structure across re-renders', () => {
      const { getByText, rerender } = render(<QuoteHeader {...props} />);

      expect(getByText('Project Details')).toBeTruthy();
      expect(getByText('Project Title')).toBeTruthy();
      expect(getByText('Quote Template')).toBeTruthy();

      const updatedProps = createProps({
        projectTitle: 'Updated',
        selectedTemplate: 'template-2',
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
      const { rerender, getByText } = render(<QuoteHeader {...props} />);

      for (let i = 0; i < 10; i++) {
        const templateId = `template-${(i % 3) + 1}`;
        const newProps = createProps({ selectedTemplate: templateId });
        rerender(<QuoteHeader {...newProps} />);
      }

      // After the final rerender (i=9 -> template-1) the first template shows.
      expect(getByText('Standard Quote')).toBeTruthy();
    });
  });
});
