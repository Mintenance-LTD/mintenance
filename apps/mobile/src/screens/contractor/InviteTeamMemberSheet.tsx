/**
 * InviteTeamMemberSheet — R6 mobile parity for
 * apps/web/app/contractor/team/InviteMemberDialog.tsx.
 *
 * Owner / manager-only UI for inviting a teammate by email with a role.
 * POSTs to /api/organizations/:id/invite. Server decides whether to add
 * directly (existing profile) or send an invite-link email.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mobileApiClient as apiClient } from '../../utils/mobileApiClient';
import { me } from '../../design-system/mint-editorial';

export type OrgRole =
  | 'owner'
  | 'manager'
  | 'maintenance_coordinator'
  | 'dispatcher'
  | 'field'
  | 'accountant';

interface Props {
  orgId: string;
  actorRole: OrgRole;
  visible: boolean;
  onClose: () => void;
  onInvited: () => void;
}

const ROLE_OPTIONS: Array<{ value: OrgRole; label: string; help: string }> = [
  { value: 'owner', label: 'Owner', help: 'Full control, including billing' },
  { value: 'manager', label: 'Manager', help: 'Manage team and operations' },
  { value: 'dispatcher', label: 'Dispatcher', help: 'Assign and triage jobs' },
  { value: 'field', label: 'Field crew', help: 'Work on assigned jobs' },
  {
    value: 'accountant',
    label: 'Accountant',
    help: 'Read financial reports and invoices',
  },
];

export const InviteTeamMemberSheet: React.FC<Props> = ({
  orgId,
  actorRole,
  visible,
  onClose,
  onInvited,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('field');
  const [submitting, setSubmitting] = useState(false);

  const availableRoles = ROLE_OPTIONS.filter((r) =>
    r.value === 'owner' ? actorRole === 'owner' : true
  );

  async function submit() {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Enter an email address first.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.post<{
        added: boolean;
        direct?: boolean;
        message?: string;
      }>(`/api/organizations/${orgId}/invite`, {
        email: email.trim(),
        role,
      });
      if (res.direct) {
        Alert.alert('Added', 'Teammate added to your organization.');
      } else {
        Alert.alert('Invitation sent', `We've emailed ${email.trim()}.`);
      }
      setEmail('');
      setRole('field');
      onInvited();
      onClose();
    } catch (err) {
      Alert.alert(
        'Invite failed',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: me.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: me.ink,
              }}
            >
              Invite a teammate
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name='close' size={22} color={me.ink2} />
            </TouchableOpacity>
          </View>

          <Text
            style={{
              fontSize: 13,
              color: me.ink2,
              marginBottom: 14,
            }}
          >
            We&apos;ll add them right away if they already have a Mintenance
            account. Otherwise we&apos;ll email them a signup link.
          </Text>

          <Text style={labelStyle}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder='teammate@yourcompany.co.uk'
            placeholderTextColor={me.ink3}
            keyboardType='email-address'
            autoCapitalize='none'
            style={inputStyle}
            editable={!submitting}
          />

          <Text style={labelStyle}>Role</Text>
          <View style={{ marginBottom: 12 }}>
            {availableRoles.map((r) => (
              <TouchableOpacity
                key={r.value}
                onPress={() => setRole(r.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                }}
              >
                <Ionicons
                  name={
                    role === r.value ? 'radio-button-on' : 'radio-button-off'
                  }
                  size={20}
                  color={role === r.value ? me.brand : me.ink2}
                />
                <View style={{ marginLeft: 10 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: me.ink,
                    }}
                  >
                    {r.label}
                  </Text>
                  <Text style={{ fontSize: 12, color: me.ink2 }}>{r.help}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={submit}
            disabled={submitting}
            style={{
              backgroundColor: me.brand,
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? (
              <ActivityIndicator color={me.surface} />
            ) : (
              <Text style={{ color: me.surface, fontWeight: '700' }}>
                Send invite
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const labelStyle = {
  fontSize: 13,
  fontWeight: '600' as const,
  color: me.ink,
  marginBottom: 4,
};

const inputStyle = {
  borderWidth: 1,
  borderColor: me.line,
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 10,
  color: me.ink,
  marginBottom: 12,
};
