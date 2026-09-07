/**
 * PhoneVerificationModal — in-flow phone verification for homeowners,
 * opened by usePhoneVerificationGate when POST /api/jobs rejects with
 * the phone-verification 403. Two steps (number → 6-digit SMS code),
 * both against the existing POST /api/auth/verify-phone endpoint, so
 * its rate limits (send/resend 3/hr, verify 5/15min) and SMS fallback
 * chain apply unchanged. The drafted job stays in the parent screen's
 * state throughout — on success the gate re-runs the submission.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';
import { me } from '../../design-system/mint-editorial';
import {
  normalizePhoneNumber,
  isPlausiblePhoneNumber,
} from './phoneVerification';
import { styles } from './PhoneVerificationModal.styles';

const RESEND_COOLDOWN_SECONDS = 60;

interface PhoneVerificationModalProps {
  visible: boolean;
  /** User dismissed without verifying. */
  onClose: () => void;
  /** Phone verified — parent should close and retry the blocked action. */
  onVerified: () => void;
}

export const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  visible,
  onClose,
  onVerified,
}) => {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const prefetchedRef = useRef(false);

  // Pre-fill from the profile via the API — profiles is
  // column-grant locked against direct client selects.
  useEffect(() => {
    if (!visible || prefetchedRef.current) return;
    prefetchedRef.current = true;
    const controller = new AbortController();
    mobileApiClient
      .get<{ profile?: { phone?: string | null } }>('/api/users/profile', {
        signal: controller.signal,
      })
      .then((res) => {
        if (res?.profile?.phone) {
          setPhone((current) => current || res.profile!.phone!);
        }
      })
      .catch((e) => {
        // Best-effort — the user can still type their number.
        if (!controller.signal.aborted) {
          logger.warn('PhoneVerificationModal: prefill failed', {
            error: String(e),
          });
        }
      });

    return () => controller.abort();
  }, [visible]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const resetAndClose = () => {
    setStep('phone');
    setCode('');
    setError(null);
    setBusy(false);
    onClose();
  };

  const extractMessage = (e: unknown, fallback: string): string =>
    e instanceof Error && e.message ? e.message : fallback;

  const handleSend = async (action: 'send' | 'resend') => {
    const normalized = normalizePhoneNumber(phone);
    if (action === 'send' && !isPlausiblePhoneNumber(phone)) {
      setError(
        'Please enter a valid phone number, e.g. 07984 596545 or +44 7984 596545.'
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await mobileApiClient.post(
        '/api/auth/verify-phone',
        action === 'send'
          ? { action: 'send', phoneNumber: normalized }
          : { action: 'resend' }
      );
      setStep('code');
      setCode('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      setError(
        extractMessage(
          e,
          'We could not send the code. Please check the number and try again.'
        )
      );
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from the text message.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await mobileApiClient.post('/api/auth/verify-phone', {
        action: 'verify',
        code,
      });
      setStep('phone');
      setCode('');
      onVerified();
    } catch (e) {
      setError(extractMessage(e, 'That code did not work. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const primaryDisabled =
    busy || (step === 'phone' ? phone.trim().length === 0 : code.length !== 6);

  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={resetAndClose}
    >
      <Pressable style={styles.overlay} onPress={resetAndClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.handle} />
            <View style={styles.iconBadge}>
              <Ionicons
                name={step === 'phone' ? 'call-outline' : 'chatbox-outline'}
                size={22}
                color={me.brand}
              />
            </View>
            <Text style={styles.title} accessibilityRole='header'>
              {step === 'phone' ? 'Verify your phone number' : 'Enter the code'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'phone'
                ? 'To keep the platform safe for contractors, we text you a one-time code before your first job goes live. Your draft is saved — posting continues right after.'
                : `We sent a 6-digit code to ${normalizePhoneNumber(phone)}. It expires in 5 minutes.`}
            </Text>

            {error ? (
              <View style={styles.errorBox} accessibilityRole='alert'>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {step === 'phone' ? (
              <>
                <Text style={styles.inputLabel}>Phone number</Text>
                <TextInput
                  testID='phone-verification-phone-input'
                  style={styles.input}
                  value={phone}
                  onChangeText={(v) => {
                    setPhone(v);
                    if (error) setError(null);
                  }}
                  placeholder='07984 596545'
                  placeholderTextColor={me.ink3}
                  keyboardType='phone-pad'
                  textContentType='telephoneNumber'
                  autoFocus
                  editable={!busy}
                  accessibilityLabel='Phone number'
                />
                <Text style={styles.hint}>
                  UK numbers can start with 07 — we add +44 for you.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Verification code</Text>
                <TextInput
                  testID='phone-verification-code-input'
                  style={[styles.input, styles.codeInput]}
                  value={code}
                  onChangeText={(v) => {
                    setCode(v.replace(/\D/g, '').slice(0, 6));
                    if (error) setError(null);
                  }}
                  placeholder='000000'
                  placeholderTextColor={me.ink3}
                  keyboardType='number-pad'
                  textContentType='oneTimeCode'
                  autoFocus
                  maxLength={6}
                  editable={!busy}
                  accessibilityLabel='6 digit verification code'
                />
                <Text style={styles.hint}>
                  Codes are rate-limited — you can request 3 per hour.
                </Text>
              </>
            )}

            <TouchableOpacity
              testID='phone-verification-primary-button'
              style={[
                styles.primaryButton,
                primaryDisabled && styles.primaryButtonDisabled,
              ]}
              onPress={() =>
                step === 'phone' ? handleSend('send') : handleVerify()
              }
              disabled={primaryDisabled}
              accessibilityRole='button'
              accessibilityLabel={
                step === 'phone' ? 'Send verification code' : 'Verify code'
              }
            >
              {busy ? (
                <ActivityIndicator color={me.onBrand} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {step === 'phone' ? 'Text me a code' : 'Verify and continue'}
                </Text>
              )}
            </TouchableOpacity>

            {step === 'code' ? (
              <View style={styles.secondaryRow}>
                <TouchableOpacity
                  onPress={() => {
                    setStep('phone');
                    setCode('');
                    setError(null);
                  }}
                  disabled={busy}
                  accessibilityRole='button'
                >
                  <Text style={styles.linkText}>Change number</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID='phone-verification-resend-button'
                  onPress={() => handleSend('resend')}
                  disabled={busy || cooldown > 0}
                  accessibilityRole='button'
                >
                  <Text
                    style={[
                      styles.linkText,
                      (busy || cooldown > 0) && styles.linkTextDisabled,
                    ]}
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={resetAndClose}
                accessibilityRole='button'
              >
                <Text style={styles.dismissText}>Not now</Text>
              </TouchableOpacity>
            )}
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
