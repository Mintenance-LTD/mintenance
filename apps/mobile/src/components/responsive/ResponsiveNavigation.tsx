import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive, useSidebarLayout } from '../../hooks/useResponsive';
import { theme } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';

interface NavigationItem {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: number;
}

interface ResponsiveNavigationProps {
  items: NavigationItem[];
  activeRoute: string;
  onNavigate: (route: string) => void;
  children: React.ReactNode;
}

export const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = ({
  items,
  activeRoute,
  onNavigate,
  children,
}) => {
  const { isDesktop } = useResponsive();
  const { shouldShowSidebar, sidebarWidth } = useSidebarLayout();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Enhanced keyboard navigation for web accessibility
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Handle number keys for quick navigation (1-9)
      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (items[index] && e.altKey) { // Alt + number for navigation
          e.preventDefault();
          onNavigate(items[index].route);
        }
      }

      // Handle arrow keys for sidebar navigation
      if (shouldShowSidebar && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        const currentIndex = items.findIndex(item => item.route === activeRoute);
        if (currentIndex !== -1) {
          let newIndex;
          if (e.key === 'ArrowUp') {
            newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
          } else {
            newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          }

          if (e.ctrlKey) { // Ctrl + Arrow to navigate
            e.preventDefault();
            onNavigate(items[newIndex].route);
          }
        }
      }

      // Handle Escape key for accessibility
      if (e.key === 'Escape') {
        // Focus management for accessibility
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.blur) {
          activeElement.blur();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [items, activeRoute, onNavigate, shouldShowSidebar]);

  // Desktop sidebar navigation
  const renderSidebar = () => {
    if (!shouldShowSidebar) return null;

    return (
      <View style={[styles.sidebar, { width: sidebarWidth, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.sidebarHeader}>
          <Text style={styles.appTitle}>Mintenance</Text>
          {user && (
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.first_name} {user.last_name}
              </Text>
              <Text style={styles.userRole} numberOfLines={1}>
                {user.role === 'contractor' ? 'Contractor' : 'Homeowner'}
              </Text>
            </View>
          )}
        </View>

        {/* Navigation Items */}
        <View style={styles.sidebarNav}>
          {items.map((item) => {
            const isActive = activeRoute === item.route;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.sidebarItem,
                  isActive && styles.sidebarItemActive,
                ]}
                onPress={() => onNavigate(item.route)}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                accessibilityState={{ selected: isActive }}
              >
                <View style={styles.sidebarItemContent}>
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={isActive ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.sidebarItemText,
                      isActive && styles.sidebarItemTextActive,
                    ]}
                  >
                    {item.title}
                  </Text>
                  {item.badge && item.badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {item.badge > 99 ? '99+' : item.badge.toString()}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Mobile bottom tab navigation
  const renderBottomTabs = () => {
    if (isDesktop) return null;

    return (
      <View style={[styles.bottomTabs, { paddingBottom: insets.bottom }]}>
        {items.slice(0, 5).map((item) => {
          const isActive = activeRoute === item.route;
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.tabItem}
              onPress={() => onNavigate(item.route)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              accessibilityState={{ selected: isActive }}
            >
              <View style={styles.tabIconContainer}>
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={isActive ? theme.colors.primary : theme.colors.textSecondary}
                />
                {item.badge && item.badge > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>
                      {item.badge > 9 ? '9+' : item.badge.toString()}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.tabTextActive,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderSidebar()}

      {/* Main Content */}
      <View
        style={[
          styles.content,
          {
            marginLeft: shouldShowSidebar ? sidebarWidth : 0,
            paddingBottom: isDesktop ? 0 : 80, // Space for bottom tabs
          },
        ]}
      >
        {children}
      </View>

      {renderBottomTabs()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },

  // Sidebar styles (Desktop)
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: theme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    zIndex: 1000,
  },
  sidebarHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 16,
  },
  userInfo: {
    gap: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  userRole: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  sidebarNav: {
    flex: 1,
    paddingTop: 16,
  },
  sidebarItem: {
    marginHorizontal: 12,
    marginVertical: 2,
    borderRadius: 8,
  },
  sidebarItemActive: {
    backgroundColor: theme.colors.primary + '15',
  },
  sidebarItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  sidebarItemText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  sidebarItemTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Bottom tabs styles (Mobile)
  bottomTabs: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabIconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Badge styles
  badge: {
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: theme.colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: theme.colors.surface,
    fontSize: 10,
    fontWeight: '600',
  },
});