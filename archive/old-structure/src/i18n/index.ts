import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

// Import translations
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import de from './locales/de.json';
import it from './locales/it.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import ru from './locales/ru.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';

// Define available languages with RTL support
export const availableLanguages = {
  en: { name: 'English', nativeName: 'English', isRTL: false },
  es: { name: 'Spanish', nativeName: 'Español', isRTL: false },
  fr: { name: 'French', nativeName: 'Français', isRTL: false },
  pt: { name: 'Portuguese', nativeName: 'Português', isRTL: false },
  de: { name: 'German', nativeName: 'Deutsch', isRTL: false },
  it: { name: 'Italian', nativeName: 'Italiano', isRTL: false },
  nl: { name: 'Dutch', nativeName: 'Nederlands', isRTL: false },
  pl: { name: 'Polish', nativeName: 'Polski', isRTL: false },
  ru: { name: 'Russian', nativeName: 'Русский', isRTL: false },
  zh: { name: 'Chinese', nativeName: '中文', isRTL: false },
  ja: { name: 'Japanese', nativeName: '日本語', isRTL: false },
  ko: { name: 'Korean', nativeName: '한국어', isRTL: false },
  ar: { name: 'Arabic', nativeName: 'العربية', isRTL: true },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', isRTL: false },
} as const;

export type Language = keyof typeof availableLanguages;

// Detect device language
const getDeviceLanguage = (): Language => {
  const locales = RNLocalize.getLocales();

  for (const locale of locales) {
    const languageCode = locale.languageCode as Language;
    if (availableLanguages[languageCode]) {
      return languageCode;
    }
  }

  // Fallback to English if no supported language is found
  return 'en';
};

// Language persistence
const LANGUAGE_STORAGE_KEY = 'user_language_preference';

export const saveLanguagePreference = async (language: Language) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    logger.error('Failed to save language preference:', error);
  }
};

export const getLanguagePreference = async (): Promise<Language | null> => {
  try {
    const language = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return language as Language;
  } catch (error) {
    logger.error('Failed to get language preference:', error);
    return null;
  }
};

// Custom language detector
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (language: Language) => void) => {
    try {
      // First check for saved preference
      const savedLanguage = await getLanguagePreference();
      if (savedLanguage) {
        callback(savedLanguage);
        return;
      }

      // Fall back to device language
      const deviceLanguage = getDeviceLanguage();
      callback(deviceLanguage);
    } catch (error) {
      logger.error('Language detection error:', error);
      callback('en'); // Fallback to English
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: Language) => {
    await saveLanguagePreference(language);
  },
};

// Initialize i18next
i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    // Debug mode in development
    debug: __DEV__,

    // Default language
    fallbackLng: 'en',

    // Supported languages
    supportedLngs: Object.keys(availableLanguages) as Language[],

    // Language resources
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      pt: { translation: pt },
      de: { translation: de },
      it: { translation: it },
      nl: { translation: nl },
      pl: { translation: pl },
      ru: { translation: ru },
      zh: { translation: zh },
      ja: { translation: ja },
      ko: { translation: ko },
      ar: { translation: ar },
      hi: { translation: hi },
    },

    // Interpolation settings
    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // React settings
    react: {
      useSuspense: false, // Important for React Native
    },

    // Cache settings
    cache: {
      enabled: true,
      prefix: 'i18next_res_',
      expirationTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  });

// Helper functions
export const changeLanguage = async (language: Language) => {
  await i18n.changeLanguage(language);
  await saveLanguagePreference(language);

  // Force app to re-render with new language
  // This can trigger a haptic feedback
  const HapticService = require('../utils/haptics').default;
  HapticService.selection();
};

export const getCurrentLanguage = (): Language => {
  return (i18n.language || 'en') as Language;
};

export const isRTL = (language?: Language): boolean => {
  const lang = language || getCurrentLanguage();
  return availableLanguages[lang]?.isRTL || false;
};

export const formatCurrency = (
  amount: number,
  currency?: string,
  language?: Language
): string => {
  const lang = language || getCurrentLanguage();
  const deviceCurrency = (RNLocalize as any)?.getCurrencies?.()?.[0] || 'USD';
  const resolvedCurrency = currency || deviceCurrency;

  try {
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : lang, {
      style: 'currency',
      currency: resolvedCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback to simple formatting
    return `$${amount.toFixed(2)}`;
  }
};

export const formatDate = (date: Date, language?: Language): string => {
  const lang = language || getCurrentLanguage();

  try {
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : lang, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (error) {
    // Fallback to ISO string
    return date.toISOString().split('T')[0];
  }
};

export const formatRelativeTime = (date: Date, language?: Language): string => {
  const lang = language || getCurrentLanguage();
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  try {
    const rtf = new Intl.RelativeTimeFormat(lang === 'en' ? 'en-US' : lang, {
      numeric: 'auto',
    });

    if (diffInSeconds < 60) {
      return rtf.format(-diffInSeconds, 'second');
    } else if (diffInSeconds < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    } else if (diffInSeconds < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    } else {
      return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    }
  } catch (error) {
    // Fallback to simple formatting
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }
};

export default i18n;
