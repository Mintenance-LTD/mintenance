import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import type { ProfileStackParamList } from '../../navigation/types';

interface QuoteTemplatesScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'QuoteTemplates'>;
}

interface QuoteTemplate {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  category: string;
  basePrice: number;
}

const TEMPLATES: QuoteTemplate[] = [
  {
    id: 'plumbing-inspection',
    icon: 'water-outline',
    title: 'Plumbing Inspection',
    description: 'Full property plumbing assessment including pipe check, leak detection, and water pressure test.',
    category: 'Plumbing',
    basePrice: 150,
  },
  {
    id: 'electrical-survey',
    icon: 'flash-outline',
    title: 'Electrical Survey',
    description: 'Comprehensive electrical inspection covering consumer unit, sockets, lighting circuits, and safety checks.',
    category: 'Electrical',
    basePrice: 200,
  },
  {
    id: 'boiler-service',
    icon: 'thermometer-outline',
    title: 'Boiler Service',
    description: 'Annual boiler service including cleaning, safety check, and efficiency testing.',
    category: 'Heating',
    basePrice: 90,
  },
  {
    id: 'roof-repair',
    icon: 'home-outline',
    title: 'Roof Repair',
    description: 'Roof inspection and repair of missing/broken tiles, flashing, and guttering.',
    category: 'Roofing',
    basePrice: 300,
  },
  {
    id: 'garden-landscaping',
    icon: 'leaf-outline',
    title: 'Garden Landscaping',
    description: 'Full garden design and landscaping including lawn, planting, and paving.',
    category: 'Garden',
    basePrice: 500,
  },
  {
    id: 'bathroom-renovation',
    icon: 'sparkles-outline',
    title: 'Bathroom Renovation',
    description: 'Complete bathroom renovation including tiling, fixtures, and waterproofing.',
    category: 'Renovation',
    basePrice: 2500,
  },
  {
    id: 'kitchen-fitting',
    icon: 'restaurant-outline',
    title: 'Kitchen Fitting',
    description: 'Kitchen unit installation, worktop fitting, and appliance connection.',
    category: 'Renovation',
    basePrice: 3500,
  },
  {
    id: 'painting-decorating',
    icon: 'color-palette-outline',
    title: 'Painting & Decorating',
    description: 'Full interior painting including preparation, priming, and two coats finish.',
    category: 'Decorating',
    basePrice: 400,
  },
];

export const QuoteTemplatesScreen: React.FC<QuoteTemplatesScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const handleSelectTemplate = (template: QuoteTemplate) => {
    navigation.navigate('CreateQuote', {
      jobId: undefined,
    });
  };

  const renderTemplate = ({ item }: { item: QuoteTemplate }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => handleSelectTemplate(item)}
      activeOpacity={0.7}
    >
      <View style={styles.templateIcon}>
        <Ionicons name={item.icon} size={28} color='#717171' />
      </View>
      <View style={styles.templateInfo}>
        <View style={styles.templateHeader}>
          <Text style={styles.templateTitle}>{item.title}</Text>
          <Text style={styles.templateCategory}>{item.category}</Text>
        </View>
        <Text style={styles.templateDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.templatePrice}>From £{item.basePrice.toLocaleString()}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quote Templates</Text>
        <View style={styles.headerButton} />
      </View>

      <FlatList
        data={TEMPLATES}
        renderItem={renderTemplate}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.subtitle}>
            Choose a template to pre-fill your quote with common service details.
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  headerButton: { padding: 8, width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
  listContent: { padding: 16 },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 16, lineHeight: 20 },
  templateCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  templateIcon: {
    width: 52,
    height: 52,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  templateInfo: { flex: 1, marginRight: 8 },
  templateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  templateTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary, flex: 1 },
  templateCategory: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600', backgroundColor: theme.colors.surfaceSecondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 },
  templateDescription: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18, marginBottom: 6 },
  templatePrice: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
});

export default QuoteTemplatesScreen;
