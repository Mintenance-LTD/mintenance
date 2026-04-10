import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { SETTING_ICONS } from './notificationSettingsConfig';

interface SettingRowProps {
  icon: string;
  title: string;
  description?: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  title,
  description,
  value,
  onToggle,
  disabled = false,
}) => {
  const iconConfig = SETTING_ICONS[icon] || {
    name: icon as keyof typeof Ionicons.glyphMap,
    color: theme.colors.textSecondary,
    bg: theme.colors.backgroundSecondary,
  };

  return (
    <View style={[styles.settingRow, disabled && styles.disabledRow]}>
      <View style={styles.settingLeft}>
        <View
          style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}
        >
          <Ionicons
            name={iconConfig.name}
            size={18}
            color={disabled ? theme.colors.textTertiary : iconConfig.color}
          />
        </View>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, disabled && styles.disabledText]}>
            {title}
          </Text>
          {description && (
            <Text style={styles.settingDescription}>{description}</Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{
          false: theme.colors.border,
          true: disabled ? theme.colors.textTertiary : theme.colors.primary,
        }}
        thumbColor={theme.colors.surface}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  disabledRow: {
    opacity: 0.5,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  disabledText: {
    color: theme.colors.textTertiary,
  },
  settingDescription: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    lineHeight: 18,
  },
});

export default SettingRow;
