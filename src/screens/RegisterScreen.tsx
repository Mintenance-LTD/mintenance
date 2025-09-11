import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { AuthStackParamList } from '../navigation/AppNavigator';
import { theme } from '../theme';
import Button from '../components/ui/Button';

type RegisterScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'Register'
>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

const RegisterScreen: React.FC<Props> = ({ navigation: _navigation }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'homeowner' | 'contractor'>('homeowner');
  const { signUp, loading } = useAuth();

  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return false;
    }
    if (!password || password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      const [firstName, ...lastNameParts] = fullName.trim().split(' ');
      const lastName = lastNameParts.join(' ') || '';
      await signUp(email, password, { firstName, lastName, role });
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Dark Blue Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.headerLogo}
            resizeMode='contain'
          />
          <Text style={styles.headerTitle}>Mintenance</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
        >
          <View style={styles.formContainer}>
            {/* Role Selection Toggle */}
            <View
              style={styles.roleSelectionContainer}
              accessibilityRole='radiogroup'
              accessibilityLabel='Account type selection'
            >
              <TouchableOpacity
                style={[
                  styles.roleToggle,
                  role === 'homeowner' && styles.roleToggleActive,
                ]}
                onPress={() => setRole('homeowner')}
                accessibilityRole='radio'
                accessibilityLabel='Homeowner account'
                accessibilityHint='Select homeowner account type to find and hire contractors'
                accessibilityState={{ selected: role === 'homeowner' }}
              >
                <Text
                  style={[
                    styles.roleToggleText,
                    role === 'homeowner' && styles.roleToggleTextActive,
                  ]}
                >
                  Homeowner
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleToggle,
                  role === 'contractor' && styles.roleToggleActive,
                ]}
                onPress={() => setRole('contractor')}
                accessibilityRole='radio'
                accessibilityLabel='Contractor account'
                accessibilityHint='Select contractor account type to offer services to homeowners'
                accessibilityState={{ selected: role === 'contractor' }}
              >
                <Text
                  style={[
                    styles.roleToggleText,
                    role === 'contractor' && styles.roleToggleTextActive,
                  ]}
                >
                  Contractor
                </Text>
              </TouchableOpacity>
            </View>

            {/* Full Name Input with Icon */}
            <View style={styles.inputContainer}>
              <Ionicons
                name='person-outline'
                size={20}
                color={theme.colors.placeholder}
                style={styles.inputIcon}
                accessibilityHidden={true}
              />
              <TextInput
                style={styles.input}
                placeholder='Full Name'
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize='words'
                placeholderTextColor={theme.colors.placeholder}
                accessibilityLabel='Full name'
                accessibilityHint='Enter your first and last name'
                accessibilityRole='none'
                textContentType='name'
                autoComplete='name'
              />
            </View>

            {/* Email Input with Icon */}
            <View style={styles.inputContainer}>
              <Ionicons
                name='mail-outline'
                size={20}
                color={theme.colors.placeholder}
                style={styles.inputIcon}
                accessibilityHidden={true}
              />
              <TextInput
                style={styles.input}
                placeholder='Email'
                value={email}
                onChangeText={setEmail}
                keyboardType='email-address'
                autoCapitalize='none'
                autoCorrect={false}
                placeholderTextColor={theme.colors.placeholder}
                accessibilityLabel='Email address'
                accessibilityHint='Enter your email address for account creation'
                accessibilityRole='none'
                textContentType='emailAddress'
                autoComplete='email'
              />
            </View>

            {/* Phone Number Input with Icon */}
            <View style={styles.inputContainer}>
              <Ionicons
                name='call-outline'
                size={20}
                color={theme.colors.placeholder}
                style={styles.inputIcon}
                accessibilityHidden={true}
              />
              <TextInput
                style={styles.input}
                placeholder='Phone Number'
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType='phone-pad'
                placeholderTextColor={theme.colors.placeholder}
                accessibilityLabel='Phone number'
                accessibilityHint='Enter your phone number for account verification'
                accessibilityRole='none'
                textContentType='telephoneNumber'
                autoComplete='tel'
              />
            </View>

            {/* Password Input with Icon */}
            <View style={styles.inputContainer}>
              <Ionicons
                name='lock-closed-outline'
                size={20}
                color={theme.colors.placeholder}
                style={styles.inputIcon}
                accessibilityHidden={true}
              />
              <TextInput
                style={styles.input}
                placeholder='Password'
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor={theme.colors.placeholder}
                accessibilityLabel='Password'
                accessibilityHint='Create a secure password with at least 8 characters'
                accessibilityRole='none'
                textContentType='newPassword'
                autoComplete='password-new'
              />
            </View>

            {/* Confirm Password Input with Icon */}
            <View style={styles.inputContainer}>
              <Ionicons
                name='lock-closed-outline'
                size={20}
                color={theme.colors.placeholder}
                style={styles.inputIcon}
                accessibilityHidden={true}
              />
              <TextInput
                style={styles.input}
                placeholder='Confirm Password'
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholderTextColor={theme.colors.placeholder}
                accessibilityLabel='Confirm password'
                accessibilityHint='Re-enter your password to confirm it matches'
                accessibilityRole='none'
                textContentType='newPassword'
                autoComplete='password-new'
              />
            </View>

            {/* Green Create Account Button */}
            <Button
              variant='success'
              title={loading ? 'Creating Account...' : 'Create Account'}
              onPress={handleRegister}
              disabled={loading}
              loading={loading}
              accessibilityLabel={
                loading ? 'Creating account' : 'Create account'
              }
              fullWidth
              style={{ borderRadius: theme.borderRadius.xxl, marginBottom: 24 }}
            />

            {/* Terms & Privacy Note */}
            <Text style={styles.termsText}>
              By signing up, you agree to our{' '}
              <Text style={styles.linkInline}>Terms & Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // Clean white background
  },
  header: {
    backgroundColor: theme.colors.primary, // Dark blue header
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  formContainer: {
    flex: 1,
  },
  roleSelectionContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: 20,
    padding: 4,
    marginBottom: 32,
  },
  roleToggle: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  roleToggleActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  roleToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  roleToggleTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border, // Subtle gray outline
    borderRadius: theme.borderRadius.xxl, // Large rounded input fields
    backgroundColor: theme.colors.surface,
    marginBottom: 20,
    paddingHorizontal: 16,
    height: 60,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
    paddingVertical: 18,
  },
  createAccountButton: {
    backgroundColor: theme.colors.secondary, // Green rounded button
    borderRadius: theme.borderRadius.xxl,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
    ...theme.shadows.lg,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.textTertiary,
    shadowOpacity: 0,
    elevation: 0,
  },
  createAccountButtonText: {
    color: theme.colors.textInverse,
    fontSize: 18,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    color: theme.colors.textSecondary, // Lighter text
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  linkInline: {
    color: theme.colors.primary,
    fontWeight: '500',
    textDecorationLine: 'underline' as const,
  },
});

export default RegisterScreen;
