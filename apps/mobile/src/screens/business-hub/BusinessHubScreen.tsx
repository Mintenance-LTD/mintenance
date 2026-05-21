/**
 * BusinessHubScreen — contractor "Business" tab landing surface.
 *
 * Reference: redesign-v2 contractor business deck screen 01 "The hub".
 * Restyled into Mint Editorial: serif "Business" headline, mint
 * eyebrow, pastel rounded tiles (all colours sourced from the `me.*`
 * token set, never literal hexes). The legacy gradient "Scale Your
 * Operations" CTA has been retired — the deck doesn't have one and it
 * was adding visual noise without behavioural value (the tiles
 * already CTA to Finance, which the banner duplicated).
 *
 * Lives in `screens/business-hub/` rather than inline in
 * `navigation/navigators/BusinessNavigator.tsx` so:
 *   (a) the screen file stays under the 300-line MDC cap,
 *   (b) the navigator stays focused on routing,
 *   (c) the styles can sit beside the component instead of being a
 *       second half of a 480-line navigator file.
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { ProfileStackParamList } from '../../navigation/types';
import { me } from '../../design-system/mint-editorial';
import { styles } from './styles';

interface ToolItem {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  // Paired tile-icon palette — only `me.*` token values, no literal
  // hex. Matches the deck's pastel-with-coloured-icon pattern.
  iconColor: string;
  bgColor: string;
  screen: keyof ProfileStackParamList;
}

// 12 tiles, ordered to match the deck (top-down: Finance, Invoices →
// Quotes, Clients → Expenses, Payouts → Calendar, Time → Reports,
// Documents → Service Areas, Escrow). Order also reflects priority:
// money-flow + customer-flow first, infrastructure second.
const TOOLS: ToolItem[] = [
  {
    label: 'Finance',
    subtitle: 'Dashboard & analytics',
    icon: 'analytics',
    iconColor: me.brand,
    bgColor: me.brandSoft,
    screen: 'FinanceDashboard',
  },
  {
    label: 'Invoices',
    subtitle: 'Create & manage',
    icon: 'receipt',
    iconColor: me.cat.electricalFg,
    bgColor: me.cat.electricalBg,
    screen: 'InvoiceManagement',
  },
  {
    label: 'Quotes',
    subtitle: 'Build estimates',
    icon: 'document-text',
    iconColor: me.cat.paintingFg,
    bgColor: me.cat.paintingBg,
    screen: 'QuoteBuilder',
  },
  {
    label: 'Clients',
    subtitle: 'CRM & contacts',
    icon: 'people',
    iconColor: me.infoFg,
    bgColor: me.infoBg,
    screen: 'CRMDashboard',
  },
  {
    label: 'Expenses',
    subtitle: 'Track costs',
    icon: 'wallet',
    iconColor: me.errFg,
    bgColor: me.errBg,
    screen: 'Expenses',
  },
  {
    label: 'Payouts',
    subtitle: 'Earnings & transfers',
    icon: 'cash',
    iconColor: me.okFg,
    bgColor: me.okBg,
    screen: 'Payouts',
  },
  {
    label: 'Calendar',
    subtitle: 'Schedule & plan',
    icon: 'calendar',
    iconColor: me.cat.plumbingFg,
    bgColor: me.cat.plumbingBg,
    screen: 'Calendar',
  },
  {
    label: 'Time',
    subtitle: 'Track hours',
    icon: 'time',
    iconColor: me.infoFg,
    bgColor: me.infoBg,
    screen: 'TimeTracking',
  },
  {
    label: 'Reports',
    subtitle: 'Analytics & insights',
    icon: 'bar-chart',
    iconColor: me.cat.landscapeFg,
    bgColor: me.cat.landscapeBg,
    screen: 'Reporting',
  },
  {
    label: 'Documents',
    subtitle: 'Files & certs',
    icon: 'document',
    iconColor: me.ink2,
    bgColor: me.bg3,
    screen: 'Documents',
  },
  {
    label: 'Service Areas',
    subtitle: 'Coverage zones',
    icon: 'map',
    iconColor: me.cat.plumbingFg,
    bgColor: me.cat.plumbingBg,
    screen: 'ServiceAreas',
  },
  {
    label: 'Escrow',
    subtitle: 'Held payments',
    icon: 'lock-closed',
    iconColor: me.warnFg,
    bgColor: me.warnBg,
    screen: 'EscrowDashboard',
  },
];

export const BusinessHubScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Business hub</Text>
          <Text style={styles.headline}>Business</Text>
          <Text style={styles.sub}>
            Manage your contractor business with precision and efficiency.
          </Text>
        </View>

        <View style={styles.grid}>
          {TOOLS.map((tool) => (
            <TouchableOpacity
              key={tool.screen}
              style={styles.toolCard}
              onPress={() =>
                (navigation.navigate as (screen: string) => void)(tool.screen)
              }
              accessibilityRole='button'
              accessibilityLabel={`${tool.label}: ${tool.subtitle}`}
              activeOpacity={0.78}
            >
              <View style={styles.toolCardInner}>
                <View
                  style={[styles.iconWrap, { backgroundColor: tool.bgColor }]}
                >
                  <Ionicons name={tool.icon} size={20} color={tool.iconColor} />
                </View>
                <Text style={styles.toolLabel}>{tool.label}</Text>
                <Text style={styles.toolSubtitle}>{tool.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default BusinessHubScreen;
