import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useI18n } from '../hooks/useI18n';
import { useHaptics } from '../utils/haptics';
import { useAccessibleText } from '../hooks/useAccessibleText';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSearch?: (query: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
  onFilterPress?: () => void;
  showFilterButton?: boolean;
  loading?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  suggestions?: string[];
  onSuggestionPress?: (suggestion: string) => void;
  debounceMs?: number;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder,
  value = '',
  onChangeText,
  onSearch,
  onFocus,
  onBlur,
  onClear,
  onFilterPress,
  showFilterButton = true,
  loading = false,
  autoFocus = false,
  disabled = false,
  suggestions = [],
  onSuggestionPress,
  debounceMs = 300,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const focusAnimation = useRef(new Animated.Value(0)).current;
  
  const { t, common } = useI18n();
  const haptics = useHaptics();
  const searchText = useAccessibleText(16);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (onChangeText && localValue !== value) {
      debounceRef.current = setTimeout(() => {
        onChangeText(localValue);
      }, debounceMs);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [localValue, onChangeText, debounceMs, value]);

  useEffect(() => {
    Animated.timing(focusAnimation, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, focusAnimation]);

  const handleFocus = () => {
    setIsFocused(true);
    setShowSuggestions(suggestions.length > 0);
    haptics.light();
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding suggestions to allow for suggestion taps
    setTimeout(() => setShowSuggestions(false), 150);
    onBlur?.();
  };

  const handleClear = () => {
    setLocalValue('');
    onChangeText?.('');
    onClear?.();
    haptics.light();
    inputRef.current?.focus();
  };

  const handleSearch = () => {
    if (localValue.trim()) {
      onSearch?.(localValue.trim());
      haptics.medium();
      inputRef.current?.blur();
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setLocalValue(suggestion);
    onChangeText?.(suggestion);
    onSuggestionPress?.(suggestion);
    setShowSuggestions(false);
    haptics.selection();
  };

  const handleFilterPress = () => {
    onFilterPress?.();
    haptics.buttonPress();
  };

  const borderColor = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.border, theme.colors.primary],
  });

  const backgroundColor = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.surfaceSecondary, theme.colors.surface],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.searchContainer,
          {
            borderColor,
            backgroundColor,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        {/* Search Icon */}
        <Ionicons
          name="search"
          size={20}
          color={isFocused ? theme.colors.primary : theme.colors.textTertiary}
          style={styles.searchIcon}
        />

        {/* Search Input */}
        <TextInput
          ref={inputRef}
          style={[styles.input, searchText.textStyle]}
          value={localValue}
          onChangeText={setLocalValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSearch}
          placeholder={placeholder || String(t('common.search'))}
          placeholderTextColor={theme.colors.placeholder}
          autoFocus={autoFocus}
          editable={!disabled}
          returnKeyType="search"
          clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
          accessibilityRole="search"
          accessibilityLabel={String(t('search.searchInput', 'Search input'))}
          accessibilityHint={String(t('search.searchHint', 'Enter search terms and tap search'))}
        />

        {/* Loading Indicator */}
        {loading && (
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            style={styles.loadingIndicator}
          />
        )}

        {/* Clear Button (Android) */}
        {Platform.OS === 'android' && localValue.length > 0 && !loading && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel={String(t('common.clear'))}
            accessibilityHint={String(t('search.clearHint', 'Clear search text'))}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>
        )}

        {/* Filter Button */}
        {showFilterButton && (
          <TouchableOpacity
            onPress={handleFilterPress}
            style={styles.filterButton}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={String(t('search.filters'))}
            accessibilityHint={String(t('search.filtersHint', 'Open search filters'))}
          >
            <Ionicons
              name="options"
              size={20}
              color={isFocused ? theme.colors.primary : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.slice(0, 5).map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => handleSuggestionPress(suggestion)}
              accessibilityRole="button"
              accessibilityLabel={`${String(t('search.suggestion'))}: ${suggestion}`}
            >
              <Ionicons
                name="search"
                size={16}
                color={theme.colors.textTertiary}
                style={styles.suggestionIcon}
              />
              <Text style={[styles.suggestionText, searchText.textStyle]}>
                {suggestion}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius['2xl'],
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 50,
    ...theme.shadows.sm,
  },
  searchIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: theme.colors.textPrimary,
  },
  loadingIndicator: {
    marginHorizontal: 8,
  },
  clearButton: {
    padding: 4,
    marginHorizontal: 4,
  },
  filterButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: theme.borderRadius.xxl,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginTop: 4,
    ...theme.shadows.base,
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderLight,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
    color: theme.colors.textPrimary,
  },
});

export default SearchBar;
