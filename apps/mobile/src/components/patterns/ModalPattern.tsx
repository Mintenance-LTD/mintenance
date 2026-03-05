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
    return cloneElement(children as React.ReactElement<{ onPress?: () => void; testID?: string }>, {
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
    return cloneElement(children as React.ReactElement<{ onPress?: () => void; testID?: string }>, {
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

// Attach sub-components to Modal (cast required for memo() + compound component pattern)
(Modal as any).Trigger = ModalTrigger;
(Modal as any).Content = ModalContent;
(Modal as any).Header = ModalHeader;
(Modal as any).Title = ModalTitle;
(Modal as any).Close = ModalClose;

const styles = StyleSheet.create({
  trigger: { padding: 12, backgroundColor: "#007AFF", borderRadius: 8, alignItems: "center", justifyContent: "center" },
  modalContainer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", zIndex: 1000 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)" },
  content: { backgroundColor: "white", borderRadius: 12, padding: 20, margin: 20, maxWidth: "90%", maxHeight: "80%", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 8 },
  header: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E5E5" },
  title: { fontSize: 18, fontWeight: "600", color: "#1A1A1A" },
  closeButton: { position: "absolute", top: 12, right: 12, padding: 8 },
});
