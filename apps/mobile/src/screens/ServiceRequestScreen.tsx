import React, { useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { ModalStackParamList } from '../navigation/types';
import { useServiceRequestForm } from './service-request/useServiceRequestForm';
import { CategoryPicker } from './service-request/CategoryPicker';
import { ServiceForm } from './service-request/ServiceForm';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';

interface Props {
  navigation: NativeStackNavigationProp<ModalStackParamList, 'ServiceRequest'>;
  route: RouteProp<ModalStackParamList, 'ServiceRequest'>;
}

const ServiceRequestScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  // Discard-prompt — the form's own state lives inside
  // `useServiceRequestForm`. We need `allowExit()` callable from the
  // form's success path (to bypass the prompt on a posted-OK
  // navigation), but `useUnsavedChanges` needs `isDirty` which is
  // derived from the form's state — so we forward through a ref to
  // dodge the chicken-and-egg.
  const allowExitRef = useRef<() => void>(() => {});
  const form = useServiceRequestForm(() => {
    allowExitRef.current();
    navigation.goBack();
  });

  const isDirty = !!(
    form.description ||
    form.selectedSubcategory ||
    form.photos.length > 0
  );
  allowExitRef.current = useUnsavedChanges(isDirty);

  const handleAddProperty = () => {
    navigation.goBack();
    setTimeout(() => {
      (navigation as { navigate: (...args: unknown[]) => void }).navigate(
        'Main',
        {
          screen: 'ProfileTab',
          params: { screen: 'AddProperty' },
        }
      );
    }, 300);
  };

  if (!form.selectedCategory) {
    return (
      <CategoryPicker
        onBack={() => navigation.goBack()}
        onSelect={form.handleCategorySelect}
        headerPaddingTop={insets.top}
      />
    );
  }

  return (
    <ServiceForm
      category={form.selectedCategory}
      selectedSubcategory={form.selectedSubcategory}
      title={form.title}
      description={form.description}
      location={form.location}
      priority={form.priority}
      photos={form.photos}
      loading={form.loading}
      selectedProperty={form.selectedProperty}
      properties={form.properties}
      headerPaddingTop={insets.top}
      onBack={() => form.handleCategorySelect(form.selectedCategory!)}
      onSubcategorySelect={form.handleSubcategorySelect}
      onPropertySelect={form.setSelectedProperty}
      onAddProperty={handleAddProperty}
      onTitleChange={form.setTitle}
      onDescriptionChange={form.setDescription}
      onLocationChange={form.setLocation}
      onPriorityChange={form.setPriority}
      onAddPhoto={form.showImagePickerOptions}
      onRemovePhoto={form.removePhoto}
      onSubmit={form.handleSubmit}
    />
  );
};

export default ServiceRequestScreen;
