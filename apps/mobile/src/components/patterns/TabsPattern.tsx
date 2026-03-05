import React, { createContext, useContext, useState, useCallback, useMemo, memo } from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';

// ============================================================================
// TABS COMPOUND COMPONENT
// ============================================================================

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs compound components must be used within Tabs');
  }
  return context;
};

export interface TabsProps {
  children: React.ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  testID?: string;
}

export const Tabs = memo<TabsProps>(({ 
  children, 
  defaultValue = '', 
  value: controlledValue,
  onValueChange,
  testID 
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeTab = controlledValue ?? internalValue;

  const setActiveTab = useCallback((tab: string) => {
    if (controlledValue === undefined) {
      setInternalValue(tab);
    }
    onValueChange?.(tab);
  }, [controlledValue, onValueChange]);

  const contextValue = useMemo<TabsContextType>(() => ({
    activeTab,
    setActiveTab,
  }), [activeTab, setActiveTab]);

  return (
    <TabsContext.Provider value={contextValue}>
      <View testID={testID}>
        {children}
      </View>
    </TabsContext.Provider>
  );
});

Tabs.displayName = 'Tabs';

// Tabs List
export interface TabsListProps {
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export const TabsList = memo<TabsListProps>(({ children, style, testID }) => (
  <View style={[styles.tabsList, style]} testID={testID}>
    {children}
  </View>
));

TabsList.displayName = 'Tabs.List';

// Tabs Trigger
export interface TabsTriggerProps {
  children: React.ReactNode;
  value: string;
  style?: ViewStyle;
  activeStyle?: ViewStyle;
  testID?: string;
}

export const TabsTrigger = memo<TabsTriggerProps>(({ 
  children, 
  value, 
  style, 
  activeStyle,
  testID 
}) => {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  return (
    <TouchableOpacity 
      style={[
        styles.tabsTrigger, 
        isActive && styles.tabsTriggerActive,
        style,
        isActive && activeStyle
      ]} 
      onPress={() => setActiveTab(value)}
      testID={testID}
    >
      {children}
    </TouchableOpacity>
  );
});

TabsTrigger.displayName = 'Tabs.Trigger';

// Tabs Content
export interface TabsContentProps {
  children: React.ReactNode;
  value: string;
  style?: ViewStyle;
  testID?: string;
}

export const TabsContent = memo<TabsContentProps>(({ 
  children, 
  value, 
  style,
  testID 
}) => {
  const { activeTab } = useTabs();
  
  if (activeTab !== value) return null;

  return (
    <View style={[styles.tabsContent, style]} testID={testID}>
      {children}
    </View>
  );
});

TabsContent.displayName = 'Tabs.Content';

// Attach sub-components to Tabs
Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;

const styles = StyleSheet.create({
  tabsList: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E5E5" },
  tabsTrigger: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabsTriggerActive: { borderBottomColor: "#007AFF" },
  tabsContent: { padding: 16 },
});
