import React, { forwardRef, useImperativeHandle, useRef, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { useAccessibility } from '../../hooks/useAccessibility';

// ============================================================================
// ACCESSIBLE BUTTON
// ============================================================================

export interface AccessibleButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
  hint?: string;
  testID?: string;
}

export const AccessibleButton = memo<AccessibleButtonProps>(({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
  hint,
  testID,
}) => {
  const { getButtonProps, shouldUseBoldText } = useAccessibility();

  const buttonStyle = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    disabled && styles.button_disabled,
    style,
  ];

  const textStyles = [
    styles.buttonText,
    styles[`buttonText_${variant}`],
    styles[`buttonText_${size}`],
    shouldUseBoldText && styles.boldText,
    disabled && styles.buttonText_disabled,
    textStyle,
  ];

  const accessibilityProps = getButtonProps(
    loading ? `${title}, loading` : title,
    hint,
    disabled || loading
  );

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
      {...accessibilityProps}
    >
      <Text style={textStyles}>
        {loading ? 'Loading...' : title}
      </Text>
    </TouchableOpacity>
  );
});

AccessibleButton.displayName = 'AccessibleButton';

// ============================================================================
// ACCESSIBLE TEXT INPUT
// ============================================================================

export interface AccessibleTextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  testID?: string;
}

export const AccessibleTextInput = memo<AccessibleTextInputProps>(({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  multiline = false,
  required = false,
  error,
  hint,
  disabled = false,
  style,
  inputStyle,
  testID,
}) => {
  const { 
    getTextInputProps, 
    getFormFieldProps, 
    getErrorProps,
    shouldUseBoldText 
  } = useAccessibility();

  const containerStyle = [styles.inputContainer, style];
  const labelStyle = [
    styles.inputLabel,
    shouldUseBoldText && styles.boldText,
    error && styles.inputLabel_error,
    disabled && styles.inputLabel_disabled,
  ];
  const textInputStyle = [
    styles.textInput,
    multiline && styles.textInput_multiline,
    error && styles.textInput_error,
    disabled && styles.textInput_disabled,
    inputStyle,
  ];

  const inputProps = getTextInputProps(
    label,
    value,
    hint,
    disabled,
    secureTextEntry
  );

  const formFieldProps = getFormFieldProps(label, required, error, hint);

  return (
    <View style={containerStyle}>
      {/* Label */}
      <Text style={labelStyle} {...formFieldProps}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      {/* Text Input */}
      <TextInput
        style={textInputStyle}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        editable={!disabled}
        testID={testID}
        {...inputProps}
      />

      {/* Error Message */}
      {error && (
        <Text style={styles.errorText} {...getErrorProps(error)}>
          {error}
        </Text>
      )}

      {/* Hint */}
      {hint && !error && (
        <Text style={styles.hintText}>
          {hint}
        </Text>
      )}
    </View>
  );
});

AccessibleTextInput.displayName = 'AccessibleTextInput';

// ============================================================================
// ACCESSIBLE HEADER
// ============================================================================

export interface AccessibleHeaderProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  style?: TextStyle;
  testID?: string;
}

export const AccessibleHeader = memo<AccessibleHeaderProps>(({
  level,
  children,
  style,
  testID,
}) => {
  const { getHeaderProps, shouldUseBoldText } = useAccessibility();

  const headerStyle = [
    styles.header,
    styles[`header_h${level}`],
    shouldUseBoldText && styles.boldText,
    style,
  ];

  const text = typeof children === 'string' ? children : 'Header';
  const headerProps = getHeaderProps(level, text);

  return (
    <Text style={headerStyle} testID={testID} {...headerProps}>
      {children}
    </Text>
  );
});

AccessibleHeader.displayName = 'AccessibleHeader';

// ============================================================================
// ACCESSIBLE LIST
// ============================================================================

export interface AccessibleListProps {
  data: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  label?: string;
  style?: ViewStyle;
  testID?: string;
}

export const AccessibleList = memo<AccessibleListProps>(({
  data,
  renderItem,
  label,
  style,
  testID,
}) => {
  const { getListProps, getListItemProps } = useAccessibility();

  const listProps = getListProps(data.length, label);

  return (
    <ScrollView style={[styles.list, style]} testID={testID} {...listProps}>
      {data.map((item, index) => {
        const itemProps = getListItemProps(
          index,
          data.length,
          item.title || item.name || `Item ${index + 1}`
        );

        return (
          <View key={index} style={styles.listItem} {...itemProps}>
            {renderItem(item, index)}
          </View>
        );
      })}
    </ScrollView>
  );
});

AccessibleList.displayName = 'AccessibleList';

// ============================================================================
// ACCESSIBLE CHECKBOX
// ============================================================================

export interface AccessibleCheckboxProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  hint?: string;
  style?: ViewStyle;
  testID?: string;
}

export const AccessibleCheckbox = memo<AccessibleCheckboxProps>(({
  label,
  checked,
  onToggle,
  disabled = false,
  hint,
  style,
  testID,
}) => {
  const { getCheckboxProps, shouldUseBoldText } = useAccessibility();

  const containerStyle = [styles.checkboxContainer, style];
  const labelStyle = [
    styles.checkboxLabel,
    shouldUseBoldText && styles.boldText,
    disabled && styles.checkboxLabel_disabled,
  ];
  const checkboxStyle = [
    styles.checkbox,
    checked && styles.checkbox_checked,
    disabled && styles.checkbox_disabled,
  ];

  const checkboxProps = getCheckboxProps(label, checked, hint, disabled);

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onToggle}
      disabled={disabled}
      testID={testID}
      {...checkboxProps}
    >
      <View style={checkboxStyle}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={labelStyle}>{label}</Text>
    </TouchableOpacity>
  );
});

AccessibleCheckbox.displayName = 'AccessibleCheckbox';

// ============================================================================
// ACCESSIBLE TAB BAR
// ============================================================================

export interface AccessibleTabBarProps {
  tabs: Array<{ key: string; title: string; icon?: string }>;
  activeTab: string;
  onTabPress: (key: string) => void;
  style?: ViewStyle;
  testID?: string;
}

export const AccessibleTabBar = memo<AccessibleTabBarProps>(({
  tabs,
  activeTab,
  onTabPress,
  style,
  testID,
}) => {
  const { getTabProps, shouldUseBoldText } = useAccessibility();

  return (
    <View style={[styles.tabBar, style]} testID={testID}>
      {tabs.map((tab, index) => {
        const isSelected = tab.key === activeTab;
        const tabProps = getTabProps(tab.title, isSelected, index, tabs.length);

        const tabStyle = [
          styles.tab,
          isSelected && styles.tab_active,
        ];

        const tabTextStyle = [
          styles.tabText,
          shouldUseBoldText && styles.boldText,
          isSelected && styles.tabText_active,
        ];

        return (
          <TouchableOpacity
            key={tab.key}
            style={tabStyle}
            onPress={() => onTabPress(tab.key)}
            testID={`${testID}-tab-${tab.key}`}
            {...tabProps}
          >
            {tab.icon && <Text style={styles.tabIcon}>{tab.icon}</Text>}
            <Text style={tabTextStyle}>{tab.title}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

AccessibleTabBar.displayName = 'AccessibleTabBar';

// ============================================================================
// ACCESSIBLE LOADING INDICATOR
// ============================================================================

export interface AccessibleLoadingProps {
  message?: string;
  visible: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const AccessibleLoading = memo<AccessibleLoadingProps>(({
  message = 'Loading',
  visible,
  style,
  testID,
}) => {
  const { announceLoading, shouldUseBoldText } = useAccessibility();

  React.useEffect(() => {
    announceLoading(visible, message);
  }, [visible, message, announceLoading]);

  if (!visible) return null;

  const textStyle = [
    styles.loadingText,
    shouldUseBoldText && styles.boldText,
  ];

  return (
    <View
      style={[styles.loadingContainer, style]}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      accessible
    >
      <Text style={textStyle}>{message}</Text>
    </View>
  );
});

AccessibleLoading.displayName = 'AccessibleLoading';

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  // Button styles
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 44, // Minimum touch target
  },
  button_primary: {
    backgroundColor: '#007AFF',
  },
  button_secondary: {
    backgroundColor: '#E5E5E7',
  },
  button_danger: {
    backgroundColor: '#FF3B30',
  },
  button_small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  button_medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  button_large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  button_disabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  buttonText_primary: {
    color: '#FFFFFF',
  },
  buttonText_secondary: {
    color: '#000000',
  },
  buttonText_danger: {
    color: '#FFFFFF',
  },
  buttonText_small: {
    fontSize: 14,
  },
  buttonText_medium: {
    fontSize: 16,
  },
  buttonText_large: {
    fontSize: 18,
  },
  buttonText_disabled: {
    opacity: 0.7,
  },

  // Input styles
  inputContainer: {
    marginVertical: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
    color: '#000000',
  },
  inputLabel_error: {
    color: '#FF3B30',
  },
  inputLabel_disabled: {
    color: '#8E8E93',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    minHeight: 44,
    backgroundColor: '#FFFFFF',
  },
  textInput_multiline: {
    minHeight: 100,
    textAlignVertical: 'top' as const,
  },
  textInput_error: {
    borderColor: '#FF3B30',
  },
  textInput_disabled: {
    backgroundColor: '#F2F2F7',
    color: '#8E8E93',
  },
  required: {
    color: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
  hintText: {
    color: '#8E8E93',
    fontSize: 14,
    marginTop: 4,
  },

  // Header styles
  header: {
    fontWeight: 'bold' as const,
    color: '#000000',
  },
  header_h1: {
    fontSize: 28,
    marginVertical: 16,
  },
  header_h2: {
    fontSize: 24,
    marginVertical: 14,
  },
  header_h3: {
    fontSize: 20,
    marginVertical: 12,
  },
  header_h4: {
    fontSize: 18,
    marginVertical: 10,
  },
  header_h5: {
    fontSize: 16,
    marginVertical: 8,
  },
  header_h6: {
    fontSize: 14,
    marginVertical: 6,
  },

  // List styles
  list: {
    flex: 1,
  },
  listItem: {
    paddingVertical: 8,
  },

  // Checkbox styles
  checkboxContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
    minHeight: 44,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  checkbox_checked: {
    backgroundColor: '#007AFF',
  },
  checkbox_disabled: {
    borderColor: '#8E8E93',
    backgroundColor: '#F2F2F7',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  checkboxLabel_disabled: {
    color: '#8E8E93',
  },

  // Tab styles
  tabBar: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: '#D1D1D6',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center' as const,
    minHeight: 44,
  },
  tab_active: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  tabText_active: {
    color: '#007AFF',
    fontWeight: '600' as const,
  },

  // Loading styles
  loadingContainer: {
    padding: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },

  // Accessibility styles
  boldText: {
    fontWeight: 'bold' as const,
  },
};

