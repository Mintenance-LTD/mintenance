import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { AuthStackParamList } from '../navigation/AppNavigator';
import { theme } from '../theme';
import { useAccessibleText } from '../hooks/useAccessibleText';
import { useHaptics } from '../utils/haptics';
import { useI18n } from '../hooks/useI18n';
import Button from '../components/ui/Button';

type LoginScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'Login'
>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading } = useAuth();

  // Development mode test credentials
  const isDev = __DEV__ || process.env.NODE_ENV === 'development';

  // Dynamic text scaling for accessibility
  const headerTitleText = useAccessibleText(28);
  const buttonText = useAccessibleText(18);
  const linkText = useAccessibleText(14);
  useAccessibleText(16); // inputText (style uses fixed size)
  // const { colors } = useAccessibleColors();

  // Haptic feedback
  const haptics = useHaptics();

  // Internationalization
  const { t, auth, common, getErrorMessage } = useI18n();

  const handleLogin = async () => {
    haptics.buttonPress();

    if (!email || !password) {
      haptics.error();
      Alert.alert(
        String(common.error()),
        String(t('auth.fillAllFields', 'Please fill in all fields'))
      );
      return;
    }

    try {
      haptics.formSubmit();
      await signIn(email, password);
      haptics.loginSuccess();
    } catch (error: any) {
      haptics.loginFailed();
      Alert.alert(
        String(t('auth.loginFailed', 'Login Failed')),
        String(getErrorMessage('loginFailed', error.message))
      );
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
          <Text style={[styles.headerTitle, headerTitleText.textStyle]}>
            Mintenance
          </Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Connect homeowners and contractors easily
        </Text>
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
          {/* Login Form */}
          <View style={styles.formContainer}>
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
                placeholder={String(auth.email())}
                value={email}
                onChangeText={setEmail}
                keyboardType='email-address'
                autoCapitalize='none'
                autoCorrect={false}
                placeholderTextColor={theme.colors.placeholder}
                accessibilityLabel={String(auth.email())}
                accessibilityHint={String(
                  t(
                    'auth.emailHint',
                    'Please enter your email address to sign in'
                  )
                )}
                accessibilityRole='none'
                textContentType='emailAddress'
                autoComplete='email'
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
                placeholder={String(auth.password())}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor={theme.colors.placeholder}
                accessibilityLabel={String(auth.password())}
                accessibilityHint={String(
                  t(
                    'auth.passwordHint',
                    'Please enter your password to sign in'
                  )
                )}
                accessibilityRole='none'
                textContentType='password'
                autoComplete='password'
              />
            </View>

            {/* Green Log In Button */}
            <Button
              variant='success'
              title={
                loading ? String(t('auth.loggingIn')) : String(auth.login())
              }
              onPress={handleLogin}
              disabled={loading}
              loading={loading}
              accessibilityLabel={
                loading ? String(t('auth.loggingIn')) : String(auth.login())
              }
              fullWidth
              style={{ borderRadius: theme.borderRadius.xxl, marginBottom: 32 }}
              textStyle={buttonText.textStyle as any}
            />

            {/* Development Test Login Buttons */}
            {isDev && (
              <View style={styles.devSection}>
                <Text style={styles.devTitle}>Development Login</Text>
                <TouchableOpacity
                  style={styles.devButton}
                  onPress={() => {
                    setEmail('test@homeowner.com');
                    setPassword('password123');
                  }}
                >
                  <Text style={styles.devButtonText}>Test Homeowner</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.devButton}
                  onPress={() => {
                    setEmail('test@contractor.com');
                    setPassword('password123');
                  }}
                >
                  <Text style={styles.devButtonText}>Test Contractor</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Links */}
            <View style={styles.linksContainer}>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => {
                  haptics.buttonPress();
                  navigation.navigate('ForgotPassword');
                }}
                accessibilityRole='button'
                accessibilityLabel={String(auth.forgotPassword())}
                accessibilityHint={String(
                  t(
                    'auth.forgotPasswordHint',
                    'Double tap to reset your password'
                  )
                )}
              >
                <Text style={[styles.linkText, linkText.textStyle]}>
                  {String(auth.forgotPassword())}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => {
                  haptics.buttonPress();
                  navigation.navigate('Register');
                }}
                accessibilityRole='button'
                accessibilityLabel={String(
                  t('auth.signUpForAccount', 'Sign up for new account')
                )}
                accessibilityHint={String(
                  t('auth.signUpHint', 'Double tap to create a new account')
                )}
              >
                <Text style={[styles.linkText, linkText.textStyle]}>
                  {String(auth.register())}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLogo: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  headerTitle: {
    // fontSize handled by useAccessibleText hook
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.textInverseMuted,
    textAlign: 'center',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.xxl,
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
  loginButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.xxl,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 32,
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.textTertiary,
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  // Development styles
  devSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  devTitle: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  devButton: {
    backgroundColor: theme.colors.textSecondary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginVertical: 4,
  },
  devButtonText: {
    color: theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default LoginScreen;
