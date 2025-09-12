import React, { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useMemo,
  Children,
  cloneElement,
  isValidElement,
  memo
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
  LayoutAnimation,
  Platform,
} from 'react-native';

// ============================================================================
// MODAL COMPOUND COMPONENT
// ============================================================================

interface ModalContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('Modal compound components must be used within Modal');
  }
  return context;
};

export interface ModalProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  testID?: string;
}

export const Modal = memo<ModalProps>(({ 
  children, 
  defaultOpen = false, 
  onOpenChange,
  testID 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpenChange?.(true);
    if (Platform.OS === 'ios') {
      LayoutAnimation.easeInEaseOut();
    }
  }, [onOpenChange]);

  const close = useCallback(() => {
    setIsOpen(false);
    onOpenChange?.(false);
    if (Platform.OS === 'ios') {
      LayoutAnimation.easeInEaseOut();
    }
  }, [onOpenChange]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const contextValue = useMemo<ModalContextType>(() => ({
    isOpen,
    open,
    close,
    toggle,
  }), [isOpen, open, close, toggle]);

  return (
    <ModalContext.Provider value={contextValue}>
      <View testID={testID}>
        {children}
      </View>
    </ModalContext.Provider>
  );
});

Modal.displayName = 'Modal';

// Modal Trigger
export interface ModalTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const ModalTrigger = memo<ModalTriggerProps>(({ 
  children, 
  asChild = false, 
  style,
  testID 
}) => {
  const { toggle } = useModal();

  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      onPress: toggle,
      testID,
    });
  }

  return (
    <TouchableOpacity 
      style={[styles.trigger, style]} 
      onPress={toggle}
      testID={testID}
    >
      {children}
    </TouchableOpacity>
  );
});

ModalTrigger.displayName = 'Modal.Trigger';

// Modal Content
export interface ModalContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
  overlayStyle?: ViewStyle;
  showOverlay?: boolean;
  testID?: string;
}

export const ModalContent = memo<ModalContentProps>(({ 
  children, 
  style, 
  overlayStyle,
  showOverlay = true,
  testID 
}) => {
  const { isOpen, close } = useModal();

  if (!isOpen) return null;

  return (
    <View style={styles.modalContainer} testID={testID}>
      {showOverlay && (
        <TouchableOpacity 
          style={[styles.overlay, overlayStyle]} 
          onPress={close}
          activeOpacity={1}
          testID={`${testID}-overlay`}
        />
      )}
      <View style={[styles.content, style]}>
        {children}
      </View>
    </View>
  );
});

ModalContent.displayName = 'Modal.Content';

// Modal Header
export interface ModalHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export const ModalHeader = memo<ModalHeaderProps>(({ children, style, testID }) => (
  <View style={[styles.header, style]} testID={testID}>
    {children}
  </View>
));

ModalHeader.displayName = 'Modal.Header';

// Modal Title
export interface ModalTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
  testID?: string;
}

export const ModalTitle = memo<ModalTitleProps>(({ children, style, testID }) => (
  <Text style={[styles.title, style]} testID={testID}>
    {children}
  </Text>
));

ModalTitle.displayName = 'Modal.Title';

// Modal Close
export interface ModalCloseProps {
  children: React.ReactNode;
  asChild?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const ModalClose = memo<ModalCloseProps>(({ 
  children, 
  asChild = false, 
  style,
  testID 
}) => {
  const { close } = useModal();

  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      onPress: close,
      testID,
    });
  }

  return (
    <TouchableOpacity 
      style={[styles.closeButton, style]} 
      onPress={close}
      testID={testID}
    >
      {children}
    </TouchableOpacity>
  );
});

ModalClose.displayName = 'Modal.Close';

// Attach sub-components to Modal
Modal.Trigger = ModalTrigger;
Modal.Content = ModalContent;
Modal.Header = ModalHeader;
Modal.Title = ModalTitle;
Modal.Close = ModalClose;

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

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Modal Styles
  trigger: {
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },

  // Accordion Styles
  accordionItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  accordionTrigger: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  accordionTriggerOpen: {
    backgroundColor: '#F8F9FA',
  },
  accordionContent: {
    padding: 16,
    paddingTop: 0,
  },

  // Tabs Styles
  tabsList: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  tabsTrigger: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabsTriggerActive: {
    borderBottomColor: '#007AFF',
  },
  tabsContent: {
    padding: 16,
  },
});

export { Modal, Accordion, Tabs };
