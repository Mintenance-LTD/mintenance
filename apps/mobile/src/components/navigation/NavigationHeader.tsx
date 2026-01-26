/**
 * NavigationHeader Component
 *
 * Universal header component with menu icon for all screens
 * Provides consistent navigation experience across the app
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { theme } from '../../theme';
import { logger } from '@mintenance/shared';

interface NavigationHeaderProps {
  title: string;
  showMenuIcon?: boolean;
  showBackIcon?: boolean;
  rightIcon?: {
    name: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
  onMenuPress?: () => void;
  onBackPress?: () => void;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitle?: string;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  title,
  showMenuIcon = true,
  showBackIcon = false,
  rightIcon,
  onMenuPress,
  onBackPress,
  style,
  titleStyle,
  subtitle,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
    } else {
      // Try to open drawer if available
      try {
        navigation.dispatch(DrawerActions.openDrawer());
      } catch {
        // If no drawer, navigate to menu or do nothing
        logger.info('No drawer navigator available', { service: 'ui' });
      }
    }
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }, style]}>
      <View style={styles.headerContent}>
        {/* Left Icon - Menu or Back */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={showBackIcon ? handleBackPress : handleMenuPress}
          accessibilityRole="button"
          accessibilityLabel={showBackIcon ? 'Go back' : 'Open menu'}
          testID={showBackIcon ? 'back-icon-button' : 'menu-icon-button'}
        >
          <Ionicons
            name={showBackIcon ? 'arrow-back' : 'menu'}
            size={28}
            color={theme.colors.text.primary}
          />
        </TouchableOpacity>

        {/* Title Section */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, titleStyle]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right Icon (Optional) */}
        {rightIcon ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={rightIcon.onPress}
            accessibilityRole="button"
            testID="right-icon-button"
          >
            <Ionicons
              name={rightIcon.name}
              size={24}
              color={theme.colors.text.primary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    minHeight: 56,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  iconPlaceholder: {
    width: 44,
    height: 44,
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
});

export default NavigationHeader;