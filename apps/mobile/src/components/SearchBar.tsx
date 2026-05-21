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
import { useI18n } from '../hooks/useI18n';
import { useHaptics } from '../utils/haptics';
import { useAccessibleText } from '../hooks/useAccessibleText';
import { me } from '../design-system/mint-editorial';

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

  // 2026-05-21 audit: was reading from dynamic theme tokens, so on a
  // device honouring system dark mode the bar went near-black even
  // though every consumer screen (CRMDashboard, MessagesList) renders
  // on the Mint Editorial light paper background. Pin to mint tokens
  // — these are the only two callers and both are mint-editorial.
  const borderColor = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [me.line, me.brand],
  });

  const backgroundColor = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [me.surface, me.bg],
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
          name='search'
          size={20}
          color={isFocused ? me.ink : me.ink3}
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
          placeholderTextColor={me.ink3}
          autoFocus={autoFocus}
          editable={!disabled}
          returnKeyType='search'
          clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
          accessibilityRole='search'
          accessibilityLabel={String(
            t('search.searchInput', { defaultValue: 'Search input' })
          )}
          accessibilityHint={String(
            t('search.searchHint', {
              defaultValue: 'Enter search terms and tap search',
            })
          )}
        />

        {/* Loading Indicator */}
        {loading && (
          <ActivityIndicator
            size='small'
            color={me.brand}
            style={styles.loadingIndicator}
            testID='activity-indicator'
          />
        )}

        {/* Clear Button (Android) */}
        {Platform.OS === 'android' && localValue.length > 0 && !loading && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            accessibilityRole='button'
            accessibilityLabel={String(t('common.clear'))}
            accessibilityHint={String(
              t('search.clearHint', { defaultValue: 'Clear search text' })
            )}
          >
            <Ionicons name='close-circle' size={20} color={me.ink3} />
          </TouchableOpacity>
        )}

        {/* Filter Button */}
        {showFilterButton && (
          <TouchableOpacity
            onPress={handleFilterPress}
            style={styles.filterButton}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityLabel={String(t('search.filters'))}
            accessibilityHint={String(
              t('search.filtersHint', { defaultValue: 'Open search filters' })
            )}
          >
            <Ionicons
              name='options'
              size={20}
              color={isFocused ? me.ink : me.ink2}
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
              accessibilityRole='button'
              accessibilityLabel={`${String(t('search.suggestion'))}: ${suggestion}`}
            >
              <Ionicons
                name='search'
                size={16}
                color={me.ink3}
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
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 48,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  searchIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: me.ink,
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
    borderRadius: 20,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: me.surface,
    borderRadius: 12,
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
    color: me.ink,
  },
});

export default SearchBar;
