import React from 'react';
import { View, ViewProps } from 'react-native';
import { useResponsiveGrid } from '../../hooks/useResponsive';

interface ResponsiveGridProps extends ViewProps {
  children: React.ReactNode;
  columns: number;
  gap?: number;
  responsive?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns,
  gap,
  responsive,
  style,
  ...props
}) => {
  const { gridStyle, itemStyle } = useResponsiveGrid({
    columns,
    gap,
    responsive,
  });

  return (
    <View style={[gridStyle, style]} {...props}>
      {React.Children.map(children, (child, index) => (
        <View key={index} style={itemStyle}>
          {child}
        </View>
      ))}
    </View>
  );
};

interface ResponsiveGridItemProps extends ViewProps {
  children: React.ReactNode;
  span?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

export const ResponsiveGridItem: React.FC<ResponsiveGridItemProps> = ({
  children,
  span,
  style,
  ...props
}) => {
  // This would be used inside a parent grid context
  // For now, just render the children
  return (
    <View style={style} {...props}>
      {children}
    </View>
  );
};