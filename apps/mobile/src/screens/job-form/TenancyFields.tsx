/**
 * TenancyFields (mobile) — R6 #19 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Mobile counterpart of
 * apps/web/app/jobs/create/_components/tenancy-fields.tsx.
 * Two optional questions at the bottom of the mobile JobPostingScreen:
 *   1. Is this a rental property? (checkbox)
 *   2. Who pays?                  (me / someone_else + payer email)
 *
 * When unset, behaviour is identical to today's flow (server defaults
 * to homeowner as payer, is_rental_property = false).
 */

import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';

export interface TenancyState {
  isRentalProperty: boolean;
  whoPays: 'me' | 'someone_else';
  payerEmail: string;
}

interface Props {
  value: TenancyState;
  onChange: (next: TenancyState) => void;
}

export const TenancyFields: React.FC<Props> = ({ value, onChange }) => {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: me.line,
        borderRadius: 12,
        padding: 14,
        marginVertical: 12,
        backgroundColor: me.bg2,
      }}
    >
      <Text
        style={{
          fontSize: 15,
          fontWeight: '700',
          color: me.ink,
          marginBottom: 4,
        }}
      >
        About this property
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: me.ink2,
          marginBottom: 12,
        }}
      >
        Optional — helps us contact the right people about scheduling and
        paperwork.
      </Text>

      {/* Rental checkbox */}
      <TouchableOpacity
        onPress={() =>
          onChange({ ...value, isRentalProperty: !value.isRentalProperty })
        }
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 14,
        }}
        accessibilityRole='checkbox'
        accessibilityState={{ checked: value.isRentalProperty }}
      >
        <Ionicons
          name={value.isRentalProperty ? 'checkbox' : 'square-outline'}
          size={22}
          color={value.isRentalProperty ? me.brand : me.ink2}
        />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: me.ink,
            }}
          >
            This is a rental property
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: me.ink2,
              marginTop: 2,
            }}
          >
            We&apos;ll route tenant-facing messages accordingly.
          </Text>
        </View>
      </TouchableOpacity>

      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: me.ink,
          marginBottom: 6,
        }}
      >
        Who pays for this job?
      </Text>
      <TouchableOpacity
        onPress={() => onChange({ ...value, whoPays: 'me' })}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 6,
        }}
      >
        <Ionicons
          name={value.whoPays === 'me' ? 'radio-button-on' : 'radio-button-off'}
          size={20}
          color={value.whoPays === 'me' ? me.brand : me.ink2}
        />
        <Text
          style={{
            marginLeft: 10,
            fontSize: 14,
            color: me.ink,
          }}
        >
          I&apos;ll pay
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onChange({ ...value, whoPays: 'someone_else' })}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 6,
        }}
      >
        <Ionicons
          name={
            value.whoPays === 'someone_else'
              ? 'radio-button-on'
              : 'radio-button-off'
          }
          size={20}
          color={value.whoPays === 'someone_else' ? me.brand : me.ink2}
        />
        <Text
          style={{
            marginLeft: 10,
            fontSize: 14,
            color: me.ink,
          }}
        >
          Someone else pays (landlord / agent)
        </Text>
      </TouchableOpacity>

      {value.whoPays === 'someone_else' && (
        <View style={{ marginTop: 10 }}>
          <Text
            style={{
              fontSize: 12,
              color: me.ink2,
              marginBottom: 4,
            }}
          >
            Payer&apos;s email
          </Text>
          <TextInput
            value={value.payerEmail}
            onChangeText={(t) => onChange({ ...value, payerEmail: t })}
            placeholder='landlord@example.co.uk'
            placeholderTextColor={me.ink3}
            keyboardType='email-address'
            autoCapitalize='none'
            style={{
              borderWidth: 1,
              borderColor: me.line,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
              color: me.ink,
              backgroundColor: me.surface,
            }}
          />
          <Text
            style={{
              fontSize: 11,
              color: me.ink2,
              marginTop: 4,
            }}
          >
            We&apos;ll invite them to fund the job in escrow before work starts.
          </Text>
        </View>
      )}
    </View>
  );
};
