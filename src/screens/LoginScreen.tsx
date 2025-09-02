import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { AuthStackParamList } from '../navigation/AppNavigator';
import { theme, scaledFontSize } from '../theme';
import { useAccessibleText, useAccessibleColors } from '../hooks/useAccessibleText';
import { useHaptics } from '../utils/haptics';
import { useI18n } from '../hooks/useI18n';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

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
  const inputText = useAccessibleText(16);
  const { colors } = useAccessibleColors();
  
  // Haptic feedback
  const haptics = useHaptics();
  
  // Internationalization
  const { t, auth, common, getErrorMessage } = useI18n();

  const handleLogin = async () => {
    // Haptic feedback for button press
    haptics.buttonPress();
    
    if (!email || !password) {
      haptics.error();
      Alert.alert(common.error(), t('auth.fillAllFields', 'Please fill in all fields'));
      return;
    }

    try {
      haptics.formSubmit();
      await signIn(email, password);
      haptics.loginSuccess();
    } catch (error: any) {
      haptics.loginFailed();
      Alert.alert(t('auth.loginFailed', 'Login Failed'), getErrorMessage('loginFailed', error.message));
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
            resizeMode="contain"
          />
          <Text style={[styles.headerTitle, headerTitleText.textStyle]}>MintEnance</Text>
        </View>
        <Text style={styles.headerSubtitle}>Connect homeowners and contractors easily</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Login Form */}
          <View style={styles.formContainer}>
            {/* Email Input with Icon */}
            <View style={styles.inputContainer}>
              <Ionicons 
                name="mail-outline" 
                size={20} 
                color={theme.colors.placeholder} 
                style={styles.inputIcon}
                accessibilityHidden={true}
              />
              <TextInput
                style={styles.input}
                placeholder={auth.email()}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={theme.colors.placeholder}
                accessibilityLabel={auth.email()}
                accessibilityHint={t('auth.emailHint', 'Enter your email address to sign in')}
                accessibilityRole="none"
                textContentType="emailAddress"
                autoComplete="email"
              />
            </View>
            
            {/* Password Input with Icon */}
            <View style={styles.inputContainer}>
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color={theme.colors.placeholder} 
                style={styles.inputIcon}
                accessibilityHidden={true}
              />
              <TextInput
                style={styles.input}
                placeholder={auth.password()}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor={theme.colors.placeholder}
                accessibilityLabel={auth.password()}
                accessibilityHint={t('auth.passwordHint', 'Enter your password to sign in')}
                accessibilityRole="none"
                textContentType="password"
                autoComplete="password"
              />
            </View>
            
            {/* Green Log In Button */}
            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.buttonDisabled]} 
              onPress={handleLogin}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={loading ? t('auth.loggingIn') : auth.login()}
              accessibilityHint={t('auth.loginHint', 'Double tap to sign in to your account')}
              accessibilityState={{ disabled: loading, busy: loading }}
            >
              <Text style={[styles.loginButtonText, buttonText.textStyle]}>
                {loading ? t('auth.loggingIn') : auth.login()}
              </Text>
            </TouchableOpacity>
            
            {/* Development Test Login Buttons */}
            {isDev && (
              <View style={styles.devSection}>
                <Text style={styles.devTitle}>🧪 Development Login</Text>
                <TouchableOpacity 
                  style={styles.devButton} 
                  onPress={() => {
                    setEmail('test@homeowner.com');
                    setPassword('password123');
                  }}
                >
                  <Text style={styles.devButtonText}>👤 Test Homeowner</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.devButton} 
                  onPress={() => {
                    setEmail('test@contractor.com');
                    setPassword('password123');
                  }}
                >
                  <Text style={styles.devButtonText}>🔧 Test Contractor</Text>
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
                accessibilityRole="button"
                accessibilityLabel={auth.forgotPassword()}
                accessibilityHint={t('auth.forgotPasswordHint', 'Double tap to reset your password')}
              >
                <Text style={[styles.linkText, linkText.textStyle]}>{auth.forgotPassword()}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.linkButton}
                onPress={() => {
                  haptics.buttonPress();
                  navigation.navigate('Register');
                }}
                accessibilityRole="button"
                accessibilityLabel={t('auth.signUpForAccount', 'Sign up for new account')}
                accessibilityHint={t('auth.signUpHint', 'Double tap to create a new account')}
              >
                <Text style={[styles.linkText, linkText.textStyle]}>{auth.register()}</Text>
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
    backgroundColor: theme.colors.background, // Clean white background
  },
  header: {
    backgroundColor: theme.colors.primary, // Dark blue header
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
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
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
    borderColor: theme.colors.border, // Subtle gray outline
    borderRadius: 20, // Large rounded input fields
    backgroundColor: theme.colors.surface,
    marginBottom: 20,
    paddingHorizontal: 16,
    height: 60,
    // Focus styles for accessibility
    ':focus': {
      borderColor: theme.colors.borderFocus,
      borderWidth: 2,
    },
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
    backgroundColor: theme.colors.secondary, // Green rounded button
    borderRadius: 20,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 32,
    shadowColor: theme.colors.secondary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
    color: '#fff',
    // fontSize handled by useAccessibleText hook
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
    color: theme.colors.primary, // Better contrast for links
    // fontSize handled by useAccessibleText hook
    fontWeight: '500',
    textDecorationLine: 'underline' as const,
  },
  // Development styles
  devSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  devTitle: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6c757d',
    marginBottom: 10,
  },
  devButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginVertical: 4,
  },
  devButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default LoginScreen;