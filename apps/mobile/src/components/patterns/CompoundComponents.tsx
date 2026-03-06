// Compound Components - barrel re-export
// Each pattern is now in its own module for maintainability

export {
  Modal,
  type ModalProps,
  type ModalTriggerProps,
  type ModalContentProps,
  type ModalHeaderProps,
  type ModalTitleProps,
  type ModalCloseProps,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalClose,
} from './ModalPattern';

export {
  Accordion,
  type AccordionProps,
  type AccordionItemProps,
  type AccordionTriggerProps,
  type AccordionContentProps,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './AccordionPattern';

export {
  Tabs,
  type TabsProps,
  type TabsListProps,
  type TabsTriggerProps,
  type TabsContentProps,
  TabsList,
  TabsTrigger,
  TabsContent,
} from './TabsPattern';