import React from 'react';
import { View, ViewProps } from 'react-native';
import { useResponsive, useResponsiveStyle } from '../../hooks/useResponsive';

interface ResponsiveContainerProps extends ViewProps {
  children: React.ReactNode;
  maxWidth?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  padding?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  flex?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth,
  padding,
  flex,
  style,
  ...props
}) => {
  const { isWeb } = useResponsive();

  const responsiveMaxWidth = useResponsiveStyle({
    mobile: maxWidth?.mobile,
    tablet: maxWidth?.tablet,
    desktop: maxWidth?.desktop,
  });

  const responsivePadding = useResponsiveStyle({
    mobile: padding?.mobile ?? 16,
    tablet: padding?.tablet ?? 24,
    desktop: padding?.desktop ?? 32,
  });

  const responsiveFlex = useResponsiveStyle({
    mobile: flex?.mobile,
    tablet: flex?.tablet,
    desktop: flex?.desktop,
  });

  const containerStyle = [
    {
      maxWidth: responsiveMaxWidth,
      padding: responsivePadding,
      flex: responsiveFlex,
      // Center container on web desktop
      ...(isWeb && responsiveMaxWidth ? {
        marginHorizontal: 'auto',
        alignSelf: 'center',
      } : {}),
    },
    style,
  ];

  return (
    <View style={containerStyle} {...props}>
      {children}
    </View>
  );
};