import React from 'react';
import { Modal, Pressable, TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { theme } from '../../../theme';
import { styles } from '../homeownerDashboardStyles';

interface DashboardProfileMenuProps {
  visible: boolean;
  onClose: () => void;
  insetsTop: number;
  onSignOut: () => void;
}

export const DashboardProfileMenu: React.FC<DashboardProfileMenuProps> = ({
  visible,
  onClose,
  insetsTop,
  onSignOut,
}) => {
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();

  const menuItems = [
    {
      label: 'Properties',
      icon: 'home-outline' as const,
      onPress: () =>
        navigation.navigate('ProfileTab', { screen: 'Properties' }),
    },
    {
      label: 'Messages',
      icon: 'chatbubble-outline' as const,
      onPress: () => navigation.navigate('MessagingTab' as never),
    },
    {
      label: 'Payments',
      icon: 'card-outline' as const,
      onPress: () =>
        navigation.navigate('ProfileTab', { screen: 'PaymentMethods' }),
    },
    {
      label: 'Settings',
      icon: 'settings-outline' as const,
      onPress: () =>
        navigation.navigate('ProfileTab', { screen: 'SettingsHub' }),
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.dropdownOverlay, { paddingTop: insetsTop + 50 }]}
        onPress={onClose}
      >
        <Pressable style={styles.dropdownMenu}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.dropdownItem}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              accessibilityRole='button'
              accessibilityLabel={item.label}
            >
              <View style={styles.dropdownIconWrap}>
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </View>
              <Text style={styles.dropdownItemText}>{item.label}</Text>
              <Ionicons
                name='chevron-forward'
                size={14}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>
          ))}

          <View style={styles.dropdownDivider} />

          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              onClose();
              navigation.navigate('ProfileTab', { screen: 'ProfileMain' });
            }}
            accessibilityRole='button'
            accessibilityLabel='View profile'
          >
            <View style={styles.dropdownIconWrap}>
              <Ionicons
                name='person-outline'
                size={18}
                color={theme.colors.textSecondary}
              />
            </View>
            <Text style={styles.dropdownItemText}>View Profile</Text>
            <Ionicons
              name='chevron-forward'
              size={14}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>

          <View style={styles.dropdownDivider} />

          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              onClose();
              onSignOut();
            }}
            accessibilityRole='button'
            accessibilityLabel='Sign out'
          >
            <View
              style={[styles.dropdownIconWrap, { backgroundColor: '#FEE2E2' }]}
            >
              <Ionicons
                name='log-out-outline'
                size={18}
                color={theme.colors.error}
              />
            </View>
            <Text
              style={[styles.dropdownItemText, { color: theme.colors.error }]}
            >
              Sign Out
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
