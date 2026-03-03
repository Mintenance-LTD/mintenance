import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { ModalStackParamList } from '../navigation/types';
import { useServiceRequestForm } from './service-request/useServiceRequestForm';
import { CategoryPicker } from './service-request/CategoryPicker';
import { ServiceForm } from './service-request/ServiceForm';

interface Props {
  navigation: NativeStackNavigationProp<ModalStackParamList, 'ServiceRequest'>;
  route: RouteProp<ModalStackParamList, 'ServiceRequest'>;
}

const ServiceRequestScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const form = useServiceRequestForm(() => navigation.goBack());

  const handleAddProperty = () => {
    navigation.goBack();
    setTimeout(() => {
      navigation.navigate('Main' as never, {
        screen: 'ProfileTab',
        params: { screen: 'AddProperty' },
      } as never);
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
      budget={form.budget}
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
      onBudgetChange={form.setBudget}
      onPriorityChange={form.setPriority}
      onAddPhoto={form.showImagePickerOptions}
      onRemovePhoto={form.removePhoto}
      onSubmit={form.handleSubmit}
    />
  );
};

export default ServiceRequestScreen;
