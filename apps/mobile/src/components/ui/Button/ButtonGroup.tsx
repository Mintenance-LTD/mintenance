import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { designTokens } from '../../../design-system/tokens';
import { Button, ButtonProps } from './Button';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ButtonGroupProps {
  children: React.ReactElement<ButtonProps>[];
  orientation?: 'horizontal' | 'vertical';
  spacing?: keyof typeof designTokens.spacing;
  style?: ViewStyle;
}

// ============================================================================
// BUTTON GROUP COMPONENT
// ============================================================================

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  orientation = 'horizontal',
  spacing = 'md',
  style,
}) => {
  const spacingValue = designTokens.spacing[spacing];

  const containerStyle: ViewStyle = {
    flexDirection: orientation === 'horizontal' ? 'row' : 'column',
    ...style,
  };

  const renderChildren = () => {
    return React.Children.map(children, (child, index) => {
      if (!React.isValidElement(child)) return null;

      const isLast = index === children.length - 1;
      const marginStyle = !isLast
        ? orientation === 'horizontal'
          ? { marginRight: spacingValue }
          : { marginBottom: spacingValue }
        : {};

      return React.cloneElement(child, {
        ...child.props,
        style: StyleSheet.flatten([child.props.style, marginStyle]),
      });
    });
  };

  return <View style={containerStyle}>{renderChildren()}</View>;
};

export default ButtonGroup;