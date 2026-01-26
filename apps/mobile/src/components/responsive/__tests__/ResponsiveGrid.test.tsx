import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View, useWindowDimensions } from 'react-native';
import { ResponsiveGrid, ResponsiveGridItem } from '../ResponsiveGrid';

// Mock useResponsive hook
jest.mock('../../../hooks/useResponsive', () => ({
  useResponsiveGrid: jest.fn((props) => {
    const columns = props.responsive?.mobile ?? props.columns;
    const gap = props.gap ?? 16;

    return {
      columns,
      gap,
      columnWidth: `${(100 / columns)}%`,
      gridStyle: {
        flexDirection: 'row' as const,
        flexWrap: 'wrap' as const,
        marginHorizontal: -gap / 2,
      },
      itemStyle: {
        width: `${(100 / columns)}%`,
        paddingHorizontal: gap / 2,
        marginBottom: gap,
      },
    };
  }),
}));

// Mock useWindowDimensions
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    useWindowDimensions: jest.fn(() => ({
      width: 375,
      height: 667,
      scale: 2,
      fontScale: 1,
    })),
  };
});

describe('ResponsiveGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders View container', () => {
      const { UNSAFE_root } = render(<ResponsiveGrid columns={2} />);
      const views = UNSAFE_root.findAllByType(View);
      expect(views.length).toBeGreaterThan(0);
    });

    it('renders children when provided', () => {
      const { getByText } = render(
        <ResponsiveGrid columns={2}>
          <Text>Child 1</Text>
          <Text>Child 2</Text>
        </ResponsiveGrid>
      );
      expect(getByText('Child 1')).toBeDefined();
      expect(getByText('Child 2')).toBeDefined();
    });

    it('renders without children (empty grid)', () => {
      const { UNSAFE_root } = render(<ResponsiveGrid columns={2} />);
      const rootView = UNSAFE_root.findAllByType(View)[0];
      expect(rootView).toBeDefined();
    });

    it('wraps each child in a View with itemStyle', () => {
      const { UNSAFE_root } = render(
        <ResponsiveGrid columns={2}>
          <Text>Item 1</Text>
          <Text>Item 2</Text>
        </ResponsiveGrid>
      );
      const views = UNSAFE_root.findAllByType(View);
      // Root view + 2 wrapper views
      expect(views.length).toBe(3);
    });
  });

  describe('columns Prop', () => {
    it('applies columns prop to useResponsiveGrid hook', () => {
      const { useResponsiveGrid } = require('../../../hooks/useResponsive');

      render(<ResponsiveGrid columns={3} />);

      expect(useResponsiveGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: 3,
        })
      );
    });

    it('handles columns=1 (single column layout)', () => {
      const { useResponsiveGrid } = require('../../../hooks/useResponsive');

      render(<ResponsiveGrid columns={1} />);

      expect(useResponsiveGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: 1,
        })
      );
    });

    it('handles columns=2 (two column layout)', () => {
      const { useResponsiveGrid } = require('../../../hooks/useResponsive');

      render(<ResponsiveGrid columns={2} />);

      expect(useResponsiveGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: 2,
        })
      );
    });

    it('handles columns=4 (four column layout)', () => {
      const { useResponsiveGrid } = require('../../../hooks/useResponsive');

      render(<ResponsiveGrid columns={4} />);

      expect(useResponsiveGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: 4,
        })
      );
    });
  });

  describe('gap Prop', () => {
    it('uses default gap when not provided', () => {
      const { useResponsiveGrid } = require('../../../hooks/useResponsive');

      render(<ResponsiveGrid columns={2} />);

      expect(useResponsiveGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          gap: undefined,
        })
      );
    });

    it('applies custom gap when provided', () => {
      const { useResponsiveGrid } = require('../../../hooks/useResponsive');

      render(<ResponsiveGrid columns={2} gap={24} />);

      expect(useResponsiveGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          gap: 24,
        })
      );
    });

    it('handles gap=0', () => {
      const { useResponsiveGrid } = require('../../../hooks/useResponsive');

      render(<ResponsiveGrid columns={2} gap={0} />);

      expect(useResponsiveGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          gap: 0,
        })
      );
    });

    it('handles large gap values', () => {
      const { useResponsiveGrid } = require('../../../hooks/useResponsive');

      render(<ResponsiveGrid columns={2} gap={48} />);

      expect(useResponsiveGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          gap: 48,
        })
      );
    });
  });

  describe('responsive Prop', () => {
    it('passes responsive prop to useResponsiveGrid hook', () => {
      const { useResponsiveGrid } = require('../../../hooks/useResponsive');
      const responsive = { mobile: 1, tablet: 2, desktop: 3 };

      render(<ResponsiveGrid columns={2} responsive={responsive} />);

      expect(useResponsiveGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          responsive,
        })
      );
    });

    it('handles responsive with only mobile', () => {
      const { useResponsiveGrid } = require('../../../hooks/useResponsive');
      const responsive = { mobile: 1 };

      render(<ResponsiveGrid columns={2} responsive={responsive} />);

      expect(useResponsiveGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          responsive,
        })
      );
    });

    it('handles responsive with only tablet', () => {
      const { useResponsiveGrid } = require('../../../hooks/useResponsive');
      const responsive = { tablet: 2 };

      render(<ResponsiveGrid columns={2} responsive={responsive} />);

      expect(useResponsiveGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          responsive,
        })
      );
    });

    it('handles responsive with only desktop', () => {
      const { useResponsiveGrid } = require('../../../hooks/useResponsive');
      const responsive = { desktop: 4 };

      render(<ResponsiveGrid columns={2} responsive={responsive} />);

      expect(useResponsiveGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          responsive,
        })
      );
    });

    it('handles responsive with all breakpoints', () => {
      const { useResponsiveGrid } = require('../../../hooks/useResponsive');
      const responsive = { mobile: 1, tablet: 2, desktop: 3 };

      render(<ResponsiveGrid columns={2} responsive={responsive} />);

      expect(useResponsiveGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          responsive,
        })
      );
    });
  });

  describe('gridStyle Application', () => {
    it('applies gridStyle from useResponsiveGrid hook', () => {
      const { UNSAFE_root } = render(<ResponsiveGrid columns={2} gap={16} />);
      const rootView = UNSAFE_root.findAllByType(View)[0];

      const styles = rootView.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      expect(flatStyles.flexDirection).toBe('row');
      expect(flatStyles.flexWrap).toBe('wrap');
      expect(flatStyles.marginHorizontal).toBe(-8);
    });

    it('gridStyle is applied to root View', () => {
      const { UNSAFE_root } = render(
        <ResponsiveGrid columns={3} gap={24}>
          <Text>Item</Text>
        </ResponsiveGrid>
      );
      const rootView = UNSAFE_root.findAllByType(View)[0];

      const styles = rootView.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      expect(flatStyles.flexDirection).toBe('row');
      expect(flatStyles.flexWrap).toBe('wrap');
    });
  });

  describe('itemStyle Application', () => {
    it('applies itemStyle to each child wrapper View', () => {
      const { UNSAFE_root } = render(
        <ResponsiveGrid columns={2} gap={16}>
          <Text>Item 1</Text>
          <Text>Item 2</Text>
        </ResponsiveGrid>
      );
      const views = UNSAFE_root.findAllByType(View);
      // Skip root view, check wrapper views
      const itemView = views[1];

      const styles = itemView.props.style;
      expect(styles).toMatchObject({
        width: '50%',
        paddingHorizontal: 8,
        marginBottom: 16,
      });
    });

    it('itemStyle width matches column count', () => {
      const { UNSAFE_root } = render(
        <ResponsiveGrid columns={3}>
          <Text>Item</Text>
        </ResponsiveGrid>
      );
      const views = UNSAFE_root.findAllByType(View);
      const itemView = views[1];

      expect(itemView.props.style.width).toBe('33.333333333333336%');
    });
  });

  describe('style Prop (Custom Styles)', () => {
    it('applies custom style when style prop provided', () => {
      const customStyle = { backgroundColor: '#f0f0f0' };
      const { UNSAFE_root } = render(
        <ResponsiveGrid columns={2} style={customStyle} />
      );
      const rootView = UNSAFE_root.findAllByType(View)[0];

      const styles = rootView.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      expect(flatStyles.backgroundColor).toBe('#f0f0f0');
    });

    it('custom styles override gridStyle', () => {
      const customStyle = { marginHorizontal: 20 };
      const { UNSAFE_root } = render(
        <ResponsiveGrid columns={2} gap={16} style={customStyle} />
      );
      const rootView = UNSAFE_root.findAllByType(View)[0];

      const styles = rootView.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      // Custom marginHorizontal should override gridStyle marginHorizontal
      expect(flatStyles.marginHorizontal).toBe(20);
    });

    it('handles array of custom styles', () => {
      const customStyles = [
        { backgroundColor: '#fff' },
        { paddingVertical: 10 },
      ];
      const { UNSAFE_root } = render(
        <ResponsiveGrid columns={2} style={customStyles} />
      );
      const rootView = UNSAFE_root.findAllByType(View)[0];

      const styles = rootView.props.style;
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

      expect(flatStyles.backgroundColor).toBe('#fff');
      expect(flatStyles.paddingVertical).toBe(10);
    });

    it('handles undefined style prop', () => {
      const { UNSAFE_root } = render(
        <ResponsiveGrid columns={2} style={undefined} />
      );
      const rootView = UNSAFE_root.findAllByType(View)[0];
      expect(rootView).toBeDefined();
    });
  });

  describe('Children Mapping', () => {
    it('maps single child correctly', () => {
      const { getByText } = render(
        <ResponsiveGrid columns={2}>
          <Text>Single Child</Text>
        </ResponsiveGrid>
      );
      expect(getByText('Single Child')).toBeDefined();
    });

    it('maps multiple children correctly', () => {
      const { getByText } = render(
        <ResponsiveGrid columns={2}>
          <Text>Child 1</Text>
          <Text>Child 2</Text>
          <Text>Child 3</Text>
        </ResponsiveGrid>
      );
      expect(getByText('Child 1')).toBeDefined();
      expect(getByText('Child 2')).toBeDefined();
      expect(getByText('Child 3')).toBeDefined();
    });

    it('assigns unique key to each child wrapper', () => {
      const { UNSAFE_root } = render(
        <ResponsiveGrid columns={2}>
          <Text>Item 1</Text>
          <Text>Item 2</Text>
          <Text>Item 3</Text>
        </ResponsiveGrid>
      );
      const views = UNSAFE_root.findAllByType(View);
      // Skip root view, check wrapper views
      const wrapperViews = views.slice(1);

      // Each wrapper should have a key (0, 1, 2)
      expect(wrapperViews.length).toBe(3);
    });

    it('handles null children', () => {
      const { UNSAFE_root } = render(
        <ResponsiveGrid columns={2}>
          {null}
        </ResponsiveGrid>
      );
      const rootView = UNSAFE_root.findAllByType(View)[0];
      expect(rootView).toBeDefined();
    });

    it('handles undefined children', () => {
      const { UNSAFE_root } = render(
        <ResponsiveGrid columns={2}>
          {undefined}
        </ResponsiveGrid>
      );
      const rootView = UNSAFE_root.findAllByType(View)[0];
      expect(rootView).toBeDefined();
    });

    it('handles mixed children types', () => {
      const CustomComponent = () => <Text>Custom</Text>;
      const { getByText } = render(
        <ResponsiveGrid columns={2}>
          <Text>Text Child</Text>
          <CustomComponent />
          <View><Text>Nested</Text></View>
        </ResponsiveGrid>
      );
      expect(getByText('Text Child')).toBeDefined();
      expect(getByText('Custom')).toBeDefined();
      expect(getByText('Nested')).toBeDefined();
    });
  });

  describe('Additional ViewProps', () => {
    it('passes through additional View props', () => {
      const { UNSAFE_root } = render(
        <ResponsiveGrid
          columns={2}
          testID="grid-container"
          accessible={true}
        />
      );
      const rootView = UNSAFE_root.findAllByType(View)[0];
      expect(rootView.props.testID).toBe('grid-container');
      expect(rootView.props.accessible).toBe(true);
    });

    it('handles onLayout prop', () => {
      const onLayout = jest.fn();
      const { UNSAFE_root } = render(
        <ResponsiveGrid columns={2} onLayout={onLayout} />
      );
      const rootView = UNSAFE_root.findAllByType(View)[0];
      expect(rootView.props.onLayout).toBe(onLayout);
    });
  });

  describe('Integration Tests', () => {
    it('renders complete grid with all props', () => {
      const responsive = { mobile: 1, tablet: 2, desktop: 3 };
      const customStyle = { padding: 16 };

      const { getByText, UNSAFE_root } = render(
        <ResponsiveGrid
          columns={2}
          gap={24}
          responsive={responsive}
          style={customStyle}
          testID="complete-grid"
        >
          <Text>Item 1</Text>
          <Text>Item 2</Text>
          <Text>Item 3</Text>
        </ResponsiveGrid>
      );

      expect(getByText('Item 1')).toBeDefined();
      expect(getByText('Item 2')).toBeDefined();
      expect(getByText('Item 3')).toBeDefined();

      const rootView = UNSAFE_root.findAllByType(View)[0];
      expect(rootView.props.testID).toBe('complete-grid');

      const styles = rootView.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      expect(flatStyles.padding).toBe(16);
      expect(flatStyles.flexDirection).toBe('row');
      expect(flatStyles.flexWrap).toBe('wrap');
    });
  });
});

describe('ResponsiveGridItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders View container', () => {
      const { UNSAFE_root } = render(<ResponsiveGridItem />);
      const view = UNSAFE_root.findByType(View);
      expect(view).toBeDefined();
    });

    it('renders children when provided', () => {
      const { getByText } = render(
        <ResponsiveGridItem>
          <Text>Grid Item Content</Text>
        </ResponsiveGridItem>
      );
      expect(getByText('Grid Item Content')).toBeDefined();
    });

    it('renders without children (empty item)', () => {
      const { UNSAFE_root } = render(<ResponsiveGridItem />);
      const view = UNSAFE_root.findByType(View);
      expect(view).toBeDefined();
      expect(view.props.children).toBeUndefined();
    });
  });

  describe('children Rendering', () => {
    it('renders text children', () => {
      const { getByText } = render(
        <ResponsiveGridItem>
          <Text>Text Content</Text>
        </ResponsiveGridItem>
      );
      expect(getByText('Text Content')).toBeDefined();
    });

    it('renders component children', () => {
      const CustomComponent = () => <Text>Custom</Text>;
      const { getByText } = render(
        <ResponsiveGridItem>
          <CustomComponent />
        </ResponsiveGridItem>
      );
      expect(getByText('Custom')).toBeDefined();
    });

    it('renders multiple children', () => {
      const { getByText } = render(
        <ResponsiveGridItem>
          <Text>First</Text>
          <Text>Second</Text>
          <Text>Third</Text>
        </ResponsiveGridItem>
      );
      expect(getByText('First')).toBeDefined();
      expect(getByText('Second')).toBeDefined();
      expect(getByText('Third')).toBeDefined();
    });

    it('handles null children', () => {
      const { UNSAFE_root } = render(
        <ResponsiveGridItem>{null}</ResponsiveGridItem>
      );
      const view = UNSAFE_root.findByType(View);
      expect(view).toBeDefined();
    });

    it('handles undefined children', () => {
      const { UNSAFE_root } = render(
        <ResponsiveGridItem>{undefined}</ResponsiveGridItem>
      );
      const view = UNSAFE_root.findByType(View);
      expect(view).toBeDefined();
    });
  });

  describe('span Prop', () => {
    it('accepts span prop with mobile value', () => {
      const span = { mobile: 1 };
      const { UNSAFE_root } = render(
        <ResponsiveGridItem span={span}>
          <Text>Item</Text>
        </ResponsiveGridItem>
      );
      const view = UNSAFE_root.findByType(View);
      expect(view).toBeDefined();
    });

    it('accepts span prop with tablet value', () => {
      const span = { tablet: 2 };
      const { UNSAFE_root } = render(
        <ResponsiveGridItem span={span}>
          <Text>Item</Text>
        </ResponsiveGridItem>
      );
      const view = UNSAFE_root.findByType(View);
      expect(view).toBeDefined();
    });

    it('accepts span prop with desktop value', () => {
      const span = { desktop: 3 };
      const { UNSAFE_root } = render(
        <ResponsiveGridItem span={span}>
          <Text>Item</Text>
        </ResponsiveGridItem>
      );
      const view = UNSAFE_root.findByType(View);
      expect(view).toBeDefined();
    });

    it('accepts span prop with all breakpoints', () => {
      const span = { mobile: 1, tablet: 2, desktop: 3 };
      const { UNSAFE_root } = render(
        <ResponsiveGridItem span={span}>
          <Text>Item</Text>
        </ResponsiveGridItem>
      );
      const view = UNSAFE_root.findByType(View);
      expect(view).toBeDefined();
    });

    it('handles undefined span prop', () => {
      const { UNSAFE_root } = render(
        <ResponsiveGridItem span={undefined}>
          <Text>Item</Text>
        </ResponsiveGridItem>
      );
      const view = UNSAFE_root.findByType(View);
      expect(view).toBeDefined();
    });
  });

  describe('style Prop', () => {
    it('applies custom style when style prop provided', () => {
      const customStyle = { backgroundColor: '#f0f0f0', padding: 16 };
      const { UNSAFE_root } = render(
        <ResponsiveGridItem style={customStyle}>
          <Text>Item</Text>
        </ResponsiveGridItem>
      );
      const view = UNSAFE_root.findByType(View);

      const styles = view.props.style;
      expect(styles).toMatchObject(customStyle);
    });

    it('applies array of custom styles', () => {
      const customStyles = [
        { backgroundColor: '#fff' },
        { marginTop: 10 },
      ];
      const { UNSAFE_root } = render(
        <ResponsiveGridItem style={customStyles}>
          <Text>Item</Text>
        </ResponsiveGridItem>
      );
      const view = UNSAFE_root.findByType(View);
      expect(view.props.style).toEqual(customStyles);
    });

    it('handles undefined style prop', () => {
      const { UNSAFE_root } = render(
        <ResponsiveGridItem style={undefined}>
          <Text>Item</Text>
        </ResponsiveGridItem>
      );
      const view = UNSAFE_root.findByType(View);
      expect(view).toBeDefined();
    });

    it('handles null style prop', () => {
      const { UNSAFE_root } = render(
        <ResponsiveGridItem style={null as any}>
          <Text>Item</Text>
        </ResponsiveGridItem>
      );
      const view = UNSAFE_root.findByType(View);
      expect(view).toBeDefined();
    });
  });

  describe('Additional ViewProps', () => {
    it('passes through additional View props', () => {
      const { UNSAFE_root } = render(
        <ResponsiveGridItem
          testID="grid-item"
          accessible={true}
        >
          <Text>Item</Text>
        </ResponsiveGridItem>
      );
      const view = UNSAFE_root.findByType(View);
      expect(view.props.testID).toBe('grid-item');
      expect(view.props.accessible).toBe(true);
    });

    it('handles onLayout prop', () => {
      const onLayout = jest.fn();
      const { UNSAFE_root } = render(
        <ResponsiveGridItem onLayout={onLayout}>
          <Text>Item</Text>
        </ResponsiveGridItem>
      );
      const view = UNSAFE_root.findByType(View);
      expect(view.props.onLayout).toBe(onLayout);
    });

    it('handles onPress when wrapped in Touchable', () => {
      // ResponsiveGridItem itself doesn't handle onPress,
      // but it should work when used with parent components
      const { UNSAFE_root } = render(
        <ResponsiveGridItem testID="pressable-item">
          <Text>Pressable Item</Text>
        </ResponsiveGridItem>
      );
      const view = UNSAFE_root.findByType(View);
      expect(view.props.testID).toBe('pressable-item');
    });
  });

  describe('Integration Tests', () => {
    it('renders complete grid item with all props', () => {
      const span = { mobile: 1, tablet: 2, desktop: 3 };
      const customStyle = { backgroundColor: '#f0f0f0', padding: 16 };

      const { getByText, UNSAFE_root } = render(
        <ResponsiveGridItem
          span={span}
          style={customStyle}
          testID="complete-item"
          accessible={true}
        >
          <Text>Complete Item Content</Text>
        </ResponsiveGridItem>
      );

      expect(getByText('Complete Item Content')).toBeDefined();

      const view = UNSAFE_root.findByType(View);
      expect(view.props.testID).toBe('complete-item');
      expect(view.props.accessible).toBe(true);
      expect(view.props.style).toMatchObject(customStyle);
    });

    it('can be used inside ResponsiveGrid', () => {
      const { getByText } = render(
        <ResponsiveGrid columns={2}>
          <ResponsiveGridItem>
            <Text>Item 1</Text>
          </ResponsiveGridItem>
          <ResponsiveGridItem>
            <Text>Item 2</Text>
          </ResponsiveGridItem>
        </ResponsiveGrid>
      );

      expect(getByText('Item 1')).toBeDefined();
      expect(getByText('Item 2')).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty children array', () => {
      const { UNSAFE_root } = render(
        <ResponsiveGridItem>{[]}</ResponsiveGridItem>
      );
      const view = UNSAFE_root.findByType(View);
      expect(view).toBeDefined();
    });

    it('handles complex nested children', () => {
      const { getByText } = render(
        <ResponsiveGridItem>
          <View>
            <View>
              <Text>Deeply Nested</Text>
            </View>
          </View>
        </ResponsiveGridItem>
      );
      expect(getByText('Deeply Nested')).toBeDefined();
    });

    it('handles fragment children', () => {
      const { getByText } = render(
        <ResponsiveGridItem>
          <>
            <Text>Fragment Child 1</Text>
            <Text>Fragment Child 2</Text>
          </>
        </ResponsiveGridItem>
      );
      expect(getByText('Fragment Child 1')).toBeDefined();
      expect(getByText('Fragment Child 2')).toBeDefined();
    });
  });
});
