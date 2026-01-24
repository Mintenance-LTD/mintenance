import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { Card } from '../Card';

// Mock theme
jest.mock('../../../theme', () => ({
  theme: {
    spacing: {
      4: 16,
    },
    borderRadius: {
      xl: 16,
    },
    components: {
      card: {
        default: {
          backgroundColor: '#FFFFFF',
          borderColor: '#E5E5E5',
          borderWidth: 1,
          borderRadius: 16,
        },
        elevated: {
          backgroundColor: '#FFFFFF',
          borderColor: 'transparent',
          borderWidth: 0,
        },
        outlined: {
          backgroundColor: 'transparent',
          borderColor: '#E5E5E5',
          borderWidth: 1,
        },
      },
    },
  },
}));

describe('Card', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders View container', () => {
      const { UNSAFE_root } = render(<Card />);
      const view = UNSAFE_root.findByType(View);
      expect(view).toBeDefined();
    });

    it('renders children when provided', () => {
      const { getByText } = render(
        <Card>
          <Text>Test Content</Text>
        </Card>
      );
      expect(getByText('Test Content')).toBeDefined();
    });

    it('applies base styles (padding, borderRadius)', () => {
      const { UNSAFE_root } = render(<Card />);
      const view = UNSAFE_root.findByType(View);

      // Check that base styles are applied
      const styles = view.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      expect(flatStyles.padding).toBe(16);
      expect(flatStyles.borderRadius).toBe(16);
    });

    it('renders without children (empty card)', () => {
      const { UNSAFE_root } = render(<Card />);
      const view = UNSAFE_root.findByType(View);
      expect(view.props.children).toBeUndefined();
    });
  });

  describe('variant Prop', () => {
    it('uses "default" variant when variant prop not provided', () => {
      const { UNSAFE_root } = render(<Card />);
      const view = UNSAFE_root.findByType(View);

      const styles = view.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      expect(flatStyles.backgroundColor).toBe('#FFFFFF');
      expect(flatStyles.borderColor).toBe('#E5E5E5');
      expect(flatStyles.borderWidth).toBe(1);
    });

    it('applies "default" variant styles', () => {
      const { UNSAFE_root } = render(<Card variant="default" />);
      const view = UNSAFE_root.findByType(View);

      const styles = view.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      expect(flatStyles.backgroundColor).toBe('#FFFFFF');
      expect(flatStyles.borderColor).toBe('#E5E5E5');
      expect(flatStyles.borderWidth).toBe(1);
    });

    it('applies "elevated" variant styles when variant="elevated"', () => {
      const { UNSAFE_root } = render(<Card variant="elevated" />);
      const view = UNSAFE_root.findByType(View);

      const styles = view.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      expect(flatStyles.backgroundColor).toBe('#FFFFFF');
      expect(flatStyles.borderColor).toBe('transparent');
      expect(flatStyles.borderWidth).toBe(0);
    });

    it('applies "outlined" variant styles when variant="outlined"', () => {
      const { UNSAFE_root } = render(<Card variant="outlined" />);
      const view = UNSAFE_root.findByType(View);

      const styles = view.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      expect(flatStyles.backgroundColor).toBe('transparent');
      expect(flatStyles.borderColor).toBe('#E5E5E5');
      expect(flatStyles.borderWidth).toBe(1);
    });

    it('variant styles are applied to View', () => {
      const { UNSAFE_root } = render(<Card variant="elevated" />);
      const view = UNSAFE_root.findByType(View);

      expect(view.props.style).toBeDefined();
      const flatStyles = Array.isArray(view.props.style)
        ? view.props.style.reduce((acc, style) => ({ ...acc, ...style }), {})
        : view.props.style;

      // Verify elevated variant styles are present
      expect(flatStyles.borderWidth).toBe(0);
    });
  });

  describe('style Prop', () => {
    it('applies custom style when style prop provided (single object)', () => {
      const customStyle = { marginTop: 20 };
      const { UNSAFE_root } = render(<Card style={customStyle} />);
      const view = UNSAFE_root.findByType(View);

      const styles = view.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      expect(flatStyles.marginTop).toBe(20);
    });

    it('applies custom styles when style prop is array', () => {
      const customStyles = [{ marginTop: 20 }, { marginBottom: 10 }];
      const { UNSAFE_root } = render(<Card style={customStyles} />);
      const view = UNSAFE_root.findByType(View);

      const styles = view.props.style;
      // Flatten nested arrays recursively
      const flattenStyles = (arr: any[]): any => {
        return arr.reduce((acc, style) => {
          if (Array.isArray(style)) {
            return { ...acc, ...flattenStyles(style) };
          }
          return { ...acc, ...style };
        }, {});
      };

      const flatStyles = Array.isArray(styles)
        ? flattenStyles(styles)
        : styles;

      expect(flatStyles.marginTop).toBe(20);
      expect(flatStyles.marginBottom).toBe(10);
    });

    it('custom styles override base styles', () => {
      const customStyle = { padding: 24 };
      const { UNSAFE_root } = render(<Card style={customStyle} />);
      const view = UNSAFE_root.findByType(View);

      const styles = view.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      // Custom padding should override base padding
      expect(flatStyles.padding).toBe(24);
    });

    it('custom styles override variant styles', () => {
      const customStyle = { backgroundColor: '#FF0000' };
      const { UNSAFE_root } = render(
        <Card variant="default" style={customStyle} />
      );
      const view = UNSAFE_root.findByType(View);

      const styles = view.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      // Custom backgroundColor should override variant backgroundColor
      expect(flatStyles.backgroundColor).toBe('#FF0000');
    });

    it('handles undefined/null style prop', () => {
      const { UNSAFE_root: root1 } = render(<Card style={undefined} />);
      const view1 = root1.findByType(View);
      expect(view1).toBeDefined();

      const { UNSAFE_root: root2 } = render(<Card style={null as any} />);
      const view2 = root2.findByType(View);
      expect(view2).toBeDefined();
    });
  });

  describe('children Rendering', () => {
    it('renders text children', () => {
      const { getByText } = render(
        <Card>
          <Text>Simple Text</Text>
        </Card>
      );
      expect(getByText('Simple Text')).toBeDefined();
    });

    it('renders component children', () => {
      const CustomComponent = () => <Text>Custom Component</Text>;
      const { getByText } = render(
        <Card>
          <CustomComponent />
        </Card>
      );
      expect(getByText('Custom Component')).toBeDefined();
    });

    it('renders multiple children', () => {
      const { getByText } = render(
        <Card>
          <Text>First Child</Text>
          <Text>Second Child</Text>
          <Text>Third Child</Text>
        </Card>
      );
      expect(getByText('First Child')).toBeDefined();
      expect(getByText('Second Child')).toBeDefined();
      expect(getByText('Third Child')).toBeDefined();
    });

    it('handles null/undefined children', () => {
      const { UNSAFE_root: root1 } = render(<Card>{null}</Card>);
      const view1 = root1.findByType(View);
      expect(view1).toBeDefined();

      const { UNSAFE_root: root2 } = render(<Card>{undefined}</Card>);
      const view2 = root2.findByType(View);
      expect(view2).toBeDefined();
    });
  });

  describe('Style Merging', () => {
    it('base styles applied first', () => {
      const { UNSAFE_root } = render(<Card />);
      const view = UNSAFE_root.findByType(View);

      // Verify style array structure
      expect(Array.isArray(view.props.style)).toBe(true);
      const styleArray = view.props.style as any[];

      // Base styles should be in the array
      const hasBasePadding = styleArray.some((style) => style?.padding === 16);
      expect(hasBasePadding).toBe(true);
    });

    it('variant styles applied second', () => {
      const { UNSAFE_root } = render(<Card variant="elevated" />);
      const view = UNSAFE_root.findByType(View);

      const styles = view.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      // Variant styles should be present
      expect(flatStyles.borderWidth).toBe(0);
      expect(flatStyles.borderColor).toBe('transparent');
    });

    it('custom styles applied last (highest priority)', () => {
      const customStyle = { backgroundColor: '#123456', padding: 30 };
      const { UNSAFE_root } = render(
        <Card variant="default" style={customStyle} />
      );
      const view = UNSAFE_root.findByType(View);

      const styles = view.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      // Custom styles should have highest priority
      expect(flatStyles.backgroundColor).toBe('#123456');
      expect(flatStyles.padding).toBe(30);
    });

    it('style order: [base, variant, custom]', () => {
      const customStyle = { marginTop: 10 };
      const { UNSAFE_root } = render(
        <Card variant="outlined" style={customStyle} />
      );
      const view = UNSAFE_root.findByType(View);

      // Verify style is an array
      expect(Array.isArray(view.props.style)).toBe(true);
      const styleArray = view.props.style as any[];

      // Should have 3 style objects: base, variant, custom
      expect(styleArray.length).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('handles unknown variant (falls back gracefully)', () => {
      // TypeScript would normally prevent this, but test runtime behavior
      const { UNSAFE_root } = render(<Card variant={'unknown' as any} />);
      const view = UNSAFE_root.findByType(View);

      // Should still render without crashing
      expect(view).toBeDefined();
    });

    it('handles empty children array', () => {
      const { UNSAFE_root } = render(<Card>{[]}</Card>);
      const view = UNSAFE_root.findByType(View);
      expect(view).toBeDefined();
    });

    it('handles complex nested children', () => {
      const { getByText } = render(
        <Card>
          <View>
            <View>
              <Text>Deeply Nested</Text>
            </View>
          </View>
        </Card>
      );
      expect(getByText('Deeply Nested')).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('renders complete card with all props', () => {
      const customStyle = { marginHorizontal: 20 };
      const { getByText, UNSAFE_root } = render(
        <Card variant="elevated" style={customStyle}>
          <Text>Complete Card</Text>
        </Card>
      );

      expect(getByText('Complete Card')).toBeDefined();
      const view = UNSAFE_root.findByType(View);
      const flatStyles = Array.isArray(view.props.style)
        ? view.props.style.reduce((acc: any, style: any) => ({ ...acc, ...style }), {})
        : view.props.style;

      // Verify all styles are applied
      expect(flatStyles.padding).toBe(16); // base
      expect(flatStyles.borderRadius).toBe(16); // base
      expect(flatStyles.borderWidth).toBe(0); // elevated variant
      expect(flatStyles.marginHorizontal).toBe(20); // custom
    });

    it('renders card with default variant and children', () => {
      const { getByText, UNSAFE_root } = render(
        <Card>
          <Text>Default Card</Text>
        </Card>
      );

      expect(getByText('Default Card')).toBeDefined();
      const view = UNSAFE_root.findByType(View);
      const flatStyles = Array.isArray(view.props.style)
        ? view.props.style.reduce((acc: any, style: any) => ({ ...acc, ...style }), {})
        : view.props.style;

      expect(flatStyles.backgroundColor).toBe('#FFFFFF');
      expect(flatStyles.borderWidth).toBe(1);
    });

    it('renders card with custom variant and style override', () => {
      const customStyle = {
        backgroundColor: '#F0F0F0',
        borderColor: '#0000FF',
        padding: 24,
      };

      const { getByText, UNSAFE_root } = render(
        <Card variant="outlined" style={customStyle}>
          <Text>Customized Outlined Card</Text>
        </Card>
      );

      expect(getByText('Customized Outlined Card')).toBeDefined();
      const view = UNSAFE_root.findByType(View);
      const flatStyles = Array.isArray(view.props.style)
        ? view.props.style.reduce((acc: any, style: any) => ({ ...acc, ...style }), {})
        : view.props.style;

      // Custom styles should override variant and base styles
      expect(flatStyles.backgroundColor).toBe('#F0F0F0');
      expect(flatStyles.borderColor).toBe('#0000FF');
      expect(flatStyles.padding).toBe(24);
      expect(flatStyles.borderWidth).toBe(1); // from outlined variant
    });
  });
});
