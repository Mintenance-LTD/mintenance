import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import { 
  changeLanguage, 
  getCurrentLanguage, 
  isRTL, 
  formatCurrency, 
  formatDate, 
  formatRelativeTime,
  availableLanguages,
  Language 
} from '../i18n';
import { logger } from '../utils/logger';
import { useHaptics } from '../utils/haptics';

export const useI18n = () => {
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<Language>(getCurrentLanguage());
  const [isRTLLayout, setIsRTLLayout] = useState(isRTL());
  const haptics = useHaptics();

  useEffect(() => {
    const handleLanguageChange = (language: string) => {
      const lang = language as Language;
      setCurrentLanguage(lang);
      setIsRTLLayout(isRTL(lang));
      
      // Handle RTL layout changes
      if (isRTL(lang) !== I18nManager.isRTL) {
        I18nManager.allowRTL(isRTL(lang));
        I18nManager.forceRTL(isRTL(lang));
        // Note: App restart is required for RTL changes to take effect
        logger.warn('RTL layout change detected. App restart may be required.');
      }
    };

    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const switchLanguage = async (language: Language) => {
    try {
      await changeLanguage(language);
      haptics.selection();
      setCurrentLanguage(language);
      setIsRTLLayout(isRTL(language));
    } catch (error) {
      logger.error('Failed to change language:', error);
      haptics.error();
    }
  };

  // Enhanced translation function with fallbacks
  const translate = (key: string, options?: any) => {
    try {
      return t(key, options);
    } catch (error) {
      logger.warn('Translation missing for key: ${key}');
      // Return the key as fallback
      return key.split('.').pop() || key;
    }
  };

  // Pluralization helper
  const translatePlural = (key: string, count: number, options?: any) => {
    return t(key, { count, ...options });
  };

  // Context-aware translations
  const translateWithContext = (key: string, context: string, options?: any) => {
    const contextKey = `${key}_${context}`;
    const translation = t(contextKey, { defaultValue: '', ...options });
    
    // Fallback to base key if context-specific translation doesn't exist
    return translation || t(key, options);
  };

  // Helper for getting localized strings with interpolation
  const getString = (namespace: string, key: string, values?: Record<string, any>) => {
    const fullKey = `${namespace}.${key}`;
    return translate(fullKey, values);
  };

  // Common translation helpers
  const common = {
    ok: () => translate('common.ok'),
    cancel: () => translate('common.cancel'),
    close: () => translate('common.close'),
    save: () => translate('common.save'),
    loading: () => translate('common.loading'),
    error: () => translate('common.error'),
    success: () => translate('common.success'),
    retry: () => translate('common.retry'),
    search: () => translate('common.search'),
    next: () => translate('common.next'),
    back: () => translate('common.back'),
    done: () => translate('common.done'),
  };

  const auth = {
    login: () => translate('auth.login'),
    register: () => translate('auth.register'),
    logout: () => translate('auth.logout'),
    email: () => translate('auth.email'),
    password: () => translate('auth.password'),
    forgotPassword: () => translate('auth.forgotPassword'),
    createAccount: () => translate('auth.createAccount'),
  };

  const navigation = {
    home: () => translate('navigation.home'),
    profile: () => translate('navigation.profile'),
    messages: () => translate('navigation.messages'),
    jobs: () => translate('navigation.jobs'),
    feed: () => translate('navigation.feed'),
    inbox: () => translate('navigation.inbox'),
  };

  // Accessibility helpers
  const accessibility = {
    button: () => translate('accessibility.button'),
    doubleTabTo: (action: string) => translate('accessibility.doubleTabTo', { action }),
    selected: () => translate('accessibility.selected'),
    loading: () => translate('accessibility.loading'),
  };

  // Format helpers that respect current locale
  const formatters = {
    currency: (amount: number, currency = 'USD') => 
      formatCurrency(amount, currency, currentLanguage),
    date: (date: Date) => 
      formatDate(date, currentLanguage),
    relativeTime: (date: Date) => 
      formatRelativeTime(date, currentLanguage),
    number: (num: number) => {
      try {
        return new Intl.NumberFormat(currentLanguage === 'en' ? 'en-US' : currentLanguage)
          .format(num);
      } catch {
        return num.toString();
      }
    },
  };

  // Error message helpers
  const getErrorMessage = (errorCode: string, fallback?: string) => {
    const errorKey = `errors.${errorCode}`;
    const translation = translate(errorKey);
    
    // If translation is the same as key, it means translation is missing
    if (translation === errorKey) {
      return fallback || translate('errors.somethingWentWrong');
    }
    
    return translation;
  };

  // Success message helpers
  const getSuccessMessage = (actionCode: string, fallback?: string) => {
    const successKey = `success.${actionCode}`;
    const translation = translate(successKey);
    
    if (translation === successKey) {
      return fallback || translate('success.actionCompleted');
    }
    
    return translation;
  };

  // Language information
  const languageInfo = {
    current: currentLanguage,
    isRTL: isRTLLayout,
    name: availableLanguages[currentLanguage]?.name || 'English',
    nativeName: availableLanguages[currentLanguage]?.nativeName || 'English',
    available: Object.entries(availableLanguages).map(([code, info]) => ({
      code: code as Language,
      ...info,
    })),
  };

  return {
    // Core translation functions
    t: translate,
    translate,
    translatePlural,
    translateWithContext,
    getString,
    
    // Language management
    switchLanguage,
    currentLanguage,
    languageInfo,
    isRTL: isRTLLayout,
    
    // Predefined translation helpers
    common,
    auth,
    navigation,
    accessibility,
    
    // Formatting helpers
    formatters,
    
    // Error and success helpers
    getErrorMessage,
    getSuccessMessage,
    
    // Raw i18n instance for advanced usage
    i18n,
  };
};

// Hook for RTL-aware styles
export const useRTLStyles = <T extends Record<string, any>>(
  ltrStyles: T,
  rtlStyles?: Partial<T>
) => {
  const { isRTL } = useI18n();
  
  if (!isRTL || !rtlStyles) {
    return ltrStyles;
  }
  
  return {
    ...ltrStyles,
    ...rtlStyles,
  };
};

// Hook for direction-aware values
export const useDirectionValue = <T>(ltrValue: T, rtlValue: T) => {
  const { isRTL } = useI18n();
  return isRTL ? rtlValue : ltrValue;
};

export default useI18n;