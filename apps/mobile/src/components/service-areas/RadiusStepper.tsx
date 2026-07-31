/**
 * RadiusStepper — the control that makes the Standard / Extended pills
 * mean something. Adjusts whichever threshold is selected in
 * `RadiusRingsCard` and surfaces an explicit Save.
 *
 * Explicit Save rather than save-on-tap: each press is a 1-mile step, so
 * autosaving would fire a PATCH per tap and a contractor dragging from 6
 * to 20 miles would issue fourteen writes. The dirty state also gives
 * somewhere honest to show a failure — the previous screen had no way to
 * report one because it never wrote anything.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';
import {
  MIN_RADIUS_MILES,
  MAX_RADIUS_MILES,
  type RadiusMode,
} from './radiusModel';

interface Props {
  mode: RadiusMode;
  miles: number;
  dirty: boolean;
  saving: boolean;
  onStep: (delta: number) => void;
  onSave: () => void;
}

const HIT = { top: 10, bottom: 10, left: 10, right: 10 };

export const RadiusStepper: React.FC<Props> = ({
  mode,
  miles,
  dirty,
  saving,
  onStep,
  onSave,
}) => {
  const label = mode === 'standard' ? 'Standard radius' : 'Extended reach';
  const atMin = miles <= MIN_RADIUS_MILES;
  const atMax = miles >= MAX_RADIUS_MILES;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.labelCol}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.hint}>
            {mode === 'standard'
              ? 'Travel included in your price'
              : 'Travel billed per mile beyond standard'}
          </Text>
        </View>

        <View style={styles.stepper}>
          <StepBtn
            icon='remove'
            disabled={atMin || saving}
            onPress={() => onStep(-1)}
            label={`Decrease ${label}`}
          />
          <Text style={styles.value}>{miles} mi</Text>
          <StepBtn
            icon='add'
            disabled={atMax || saving}
            onPress={() => onStep(1)}
            label={`Increase ${label}`}
          />
        </View>
      </View>

      {dirty ? (
        <TouchableOpacity
          style={[styles.save, saving && styles.saveBusy]}
          onPress={onSave}
          disabled={saving}
          accessibilityRole='button'
          accessibilityLabel='Save coverage changes'
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size='small' color={me.onBrand} />
          ) : (
            <Text style={styles.saveText}>Save coverage</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const StepBtn: React.FC<{
  icon: 'add' | 'remove';
  disabled: boolean;
  onPress: () => void;
  label: string;
}> = ({ icon, disabled, onPress, label }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    hitSlop={HIT}
    style={[styles.stepBtn, disabled && styles.stepBtnOff]}
    accessibilityRole='button'
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
    activeOpacity={0.7}
  >
    <Ionicons name={icon} size={16} color={disabled ? me.ink3 : me.brand} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    backgroundColor: me.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: me.line2,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  labelCol: { flex: 1 },
  label: { fontSize: 14, fontWeight: '700', color: me.ink },
  hint: { fontSize: 11, color: me.ink3, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: me.brandSoft,
    borderWidth: 1,
    borderColor: me.brand,
  },
  stepBtnOff: { backgroundColor: me.bg2, borderColor: me.line2 },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
    minWidth: 52,
    textAlign: 'center',
  },
  save: {
    marginTop: 12,
    backgroundColor: me.brand,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBusy: { opacity: 0.7 },
  saveText: { color: me.onBrand, fontSize: 14, fontWeight: '700' },
});

export default RadiusStepper;
