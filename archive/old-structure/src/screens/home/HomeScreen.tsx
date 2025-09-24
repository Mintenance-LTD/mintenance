/**
 * HomeScreen Container
 * 
 * Main container component that orchestrates the home screen functionality
 * and renders the appropriate dashboard based on user role.
 */

import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { ResponsiveContainer } from '../../components/responsive';
import { theme } from '../../theme';
import { HomeownerDashboard } from './HomeownerDashboard';
import { ContractorDashboard } from './ContractorDashboard';
import { HomeScreenLoading } from './HomeScreenLoading';
import { HomeScreenError } from './HomeScreenError';

interface HomeScreenProps {
  // Navigation and other props can be passed down if needed
}

export const HomeScreen: React.FC<HomeScreenProps> = () => {
  const { user, loading: authLoading } = useAuth();

  // Loading state: show spinner when checking auth (no user) or contractor loading
  if ((!user && authLoading) || (user?.role === 'contractor' && authLoading)) {
    return <HomeScreenLoading />;
  }

  // Error state would be handled by individual dashboard components
  // This container focuses on role-based rendering

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ResponsiveContainer
        maxWidth={{
          mobile: undefined,
          tablet: 768,
          desktop: 1200,
        }}
        padding={{
          mobile: 0,
          tablet: 16,
          desktop: 24,
        }}
        style={styles.container}
        testID='home-screen'
      >
        {user?.role === 'homeowner' ? (
          <HomeownerDashboard />
        ) : (
          <ContractorDashboard />
        )}
      </ResponsiveContainer>
    </SafeAreaView>
  );
};

const styles = {
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
};

export default HomeScreen;
