import React, { createContext, useContext, useState, useCallback, useMemo, memo } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, ViewStyle } from 'react-native';

// ============================================================================
// ACCORDION COMPOUND COMPONENT
// ============================================================================

interface AccordionContextType {
  openItems: Set<string>;
  toggleItem: (id: string) => void;
  isOpen: (id: string) => boolean;
  multiple?: boolean;
}

const AccordionContext = createContext<AccordionContextType | undefined>(undefined);

const useAccordion = () => {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion compound components must be used within Accordion');
  }
  return context;
};

export interface AccordionProps {
  children: React.ReactNode;
  multiple?: boolean;
  defaultOpen?: string[];
  onValueChange?: (openItems: string[]) => void;
  testID?: string;
}

export const Accordion = memo<AccordionProps>(({ 
  children, 
  multiple = false, 
  defaultOpen = [],
  onValueChange,
  testID 
}) => {
  const [openItems, setOpenItems] = useState(new Set(defaultOpen));

  const toggleItem = useCallback((id: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        if (!multiple) {
          newSet.clear();
        }
        newSet.add(id);
      }
      
      onValueChange?.(Array.from(newSet));
      return newSet;
    });
  }, [multiple, onValueChange]);

  const isOpen = useCallback((id: string) => {
    return openItems.has(id);
  }, [openItems]);

  const contextValue = useMemo<AccordionContextType>(() => ({
    openItems,
    toggleItem,
    isOpen,
    multiple,
  }), [openItems, toggleItem, isOpen, multiple]);

  return (
    <AccordionContext.Provider value={contextValue}>
      <View testID={testID}>
        {children}
      </View>
    </AccordionContext.Provider>
  );
});

Accordion.displayName = 'Accordion';

// Accordion Item
interface AccordionItemContextType {
  id: string;
  isOpen: boolean;
}

const AccordionItemContext = createContext<AccordionItemContextType | undefined>(undefined);

const useAccordionItem = () => {
  const context = useContext(AccordionItemContext);
  if (!context) {
    throw new Error('AccordionItem compound components must be used within AccordionItem');
  }
  return context;
};

export interface AccordionItemProps {
  children: React.ReactNode;
  id: string;
  style?: ViewStyle;
  testID?: string;
}

export const AccordionItem = memo<AccordionItemProps>(({ 
  children, 
  id, 
  style,
  testID 
}) => {
  const { isOpen } = useAccordion();
  const isItemOpen = isOpen(id);

  const contextValue = useMemo<AccordionItemContextType>(() => ({
    id,
    isOpen: isItemOpen,
  }), [id, isItemOpen]);

  return (
    <AccordionItemContext.Provider value={contextValue}>
      <View style={[styles.accordionItem, style]} testID={testID}>
        {children}
      </View>
    </AccordionItemContext.Provider>
  );
});

AccordionItem.displayName = 'Accordion.Item';

// Accordion Trigger
export interface AccordionTriggerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export const AccordionTrigger = memo<AccordionTriggerProps>(({ 
  children, 
  style,
  testID 
}) => {
  const { toggleItem } = useAccordion();
  const { id, isOpen } = useAccordionItem();

  return (
    <TouchableOpacity 
      style={[styles.accordionTrigger, isOpen && styles.accordionTriggerOpen, style]} 
      onPress={() => toggleItem(id)}
      testID={testID}
    >
      {children}
    </TouchableOpacity>
  );
});

AccordionTrigger.displayName = 'Accordion.Trigger';

// Accordion Content
export interface AccordionContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export const AccordionContent = memo<AccordionContentProps>(({ 
  children, 
  style,
  testID 
}) => {
  const { isOpen } = useAccordionItem();
  const [height] = useState(new Animated.Value(isOpen ? 1 : 0));

  React.useEffect(() => {
    Animated.timing(height, {
      toValue: isOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isOpen, height]);

  if (!isOpen) return null;

  return (
    <Animated.View 
      style={[
        styles.accordionContent, 
        { opacity: height },
        style
      ]} 
      testID={testID}
    >
      {children}
    </Animated.View>
  );
});

AccordionContent.displayName = 'Accordion.Content';

// Attach sub-components to Accordion
Accordion.Item = AccordionItem;
Accordion.Trigger = AccordionTrigger;
Accordion.Content = AccordionContent;

const styles = StyleSheet.create({
  accordionItem: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E5E5" },
  accordionTrigger: { padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "transparent" },
  accordionTriggerOpen: { backgroundColor: "#F8F9FA" },
  accordionContent: { padding: 16, paddingTop: 0 },
});
