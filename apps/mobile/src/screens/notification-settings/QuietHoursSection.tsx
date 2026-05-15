import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';
import SettingsSection from './SettingsSection';
import SettingRow from './SettingRow';
import {
  NotificationSettings,
  parseTime,
  formatTime,
} from './notificationSettingsConfig';

interface QuietHoursSectionProps {
  settings: NotificationSettings;
  onToggle: (key: keyof NotificationSettings) => void;
  onTimeChange: (
    key: 'quietHoursStart' | 'quietHoursEnd',
    value: string
  ) => void;
}

const QuietHoursSection: React.FC<QuietHoursSectionProps> = ({
  settings,
  onToggle,
  onTimeChange,
}) => {
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  return (
    <>
      <SettingsSection title='Quiet Hours'>
        <SettingRow
          icon='moon-outline'
          title='Enable Quiet Hours'
          description='Pause notifications during specified hours'
          value={settings.quietHoursEnabled}
          onToggle={() => onToggle('quietHoursEnabled')}
        />
        {settings.quietHoursEnabled && (
          <>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowStartPicker(true)}
            >
              <View style={styles.settingLeft}>
                <View
                  style={[styles.iconContainer, { backgroundColor: me.bg2 }]}
                >
                  <Ionicons name='time-outline' size={18} color={me.ink2} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Start Time</Text>
                  <Text style={styles.settingDescription}>
                    {formatTime(settings.quietHoursStart)}
                  </Text>
                </View>
              </View>
              <Ionicons name='chevron-forward' size={16} color={me.ink3} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowEndPicker(true)}
            >
              <View style={styles.settingLeft}>
                <View
                  style={[styles.iconContainer, { backgroundColor: me.bg2 }]}
                >
                  <Ionicons name='time-outline' size={18} color={me.ink2} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>End Time</Text>
                  <Text style={styles.settingDescription}>
                    {formatTime(settings.quietHoursEnd)}
                  </Text>
                </View>
              </View>
              <Ionicons name='chevron-forward' size={16} color={me.ink3} />
            </TouchableOpacity>
          </>
        )}
      </SettingsSection>

      {showStartPicker && (
        <DateTimePicker
          value={parseTime(settings.quietHoursStart)}
          mode='time'
          is24Hour
          display='default'
          onChange={(_e, d) => {
            setShowStartPicker(false);
            if (d) {
              const hh = String(d.getHours()).padStart(2, '0');
              const mm = String(d.getMinutes()).padStart(2, '0');
              onTimeChange('quietHoursStart', `${hh}:${mm}`);
            }
          }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={parseTime(settings.quietHoursEnd)}
          mode='time'
          is24Hour
          display='default'
          onChange={(_e, d) => {
            setShowEndPicker(false);
            if (d) {
              const hh = String(d.getHours()).padStart(2, '0');
              const mm = String(d.getMinutes()).padStart(2, '0');
              onTimeChange('quietHoursEnd', `${hh}:${mm}`);
            }
          }}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
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
    color: me.ink,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: me.ink3,
    lineHeight: 18,
  },
});

export default QuietHoursSection;
