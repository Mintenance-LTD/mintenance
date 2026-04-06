import React from 'react';
import { View, ScrollView, RefreshControl, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LoadingSpinner, ErrorView } from '../../components/shared';
import type { ProfileStackParamList } from '../../navigation/types';
import { theme } from '../../theme';
import { useFinancialsData } from './FinancialsScreen/useFinancialsData';
import { HeroSection } from './FinancialsScreen/HeroSection';
import { StatCardsRow } from './FinancialsScreen/StatCardsRow';
import { BudgetOverview } from './FinancialsScreen/BudgetOverview';
import { SpendingBreakdown } from './FinancialsScreen/SpendingBreakdown';
import { SubscriptionCard } from './FinancialsScreen/SubscriptionCard';
import { RecentTransactions } from './FinancialsScreen/RecentTransactions';
import { styles } from './FinancialsScreen/styles';

export const FinancialsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const insets = useSafeAreaInsets();

  const { data, isLoading, error, refetch } = useFinancialsData();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView message="Failed to load financial data" onRetry={refetch} />;
  if (!data) return <ErrorView message="No financial data available" onRetry={refetch} />;

  // Budget overview values
  const budgeted = data.totalSpent + data.inEscrow + data.refunded;
  const spent = data.totalSpent;
  const left = Math.max(budgeted - spent, 0);
  const spentPct = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#FFFFFF" colors={[theme.colors.primary]} />}
      >
        <HeroSection
          totalSpent={data.totalSpent}
          thisMonth={data.thisMonth}
          inEscrow={data.inEscrow}
          insetsTop={insets.top}
          onBack={() => navigation.goBack()}
        />

        <StatCardsRow
          totalSpent={data.totalSpent}
          inEscrow={data.inEscrow}
          refunded={data.refunded}
        />

        <View style={styles.contentBody}>
          <BudgetOverview budgeted={budgeted} spent={spent} left={left} spentPct={spentPct} />

          <SpendingBreakdown
            totalSpent={data.totalSpent}
            categoryBreakdown={data.categoryBreakdown}
          />

          {data.subscription && (
            <SubscriptionCard
              planType={data.subscription.planType}
              status={data.subscription.status}
              onPress={() => navigation.navigate('Subscription')}
            />
          )}

          <RecentTransactions
            recentPayments={data.recentPayments}
            onViewAll={() => navigation.navigate('PaymentHistory')}
          />

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
    </View>
  );
};

export default FinancialsScreen;
