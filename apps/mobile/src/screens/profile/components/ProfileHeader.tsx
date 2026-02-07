import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface ProfileHeaderUser {
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImageUrl?: string;
  isVerified?: boolean;
  role?: string;
}

interface ProfileHeaderProps {
  user: ProfileHeaderUser | null;
  joinDate: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, joinDate }) => {
  return (
    <View style={styles.profileInfo}>
      <View style={styles.avatarContainer}>
        {user?.profileImageUrl ? (
          <Image
            source={{ uri: user.profileImageUrl }}
            style={styles.avatarImage}
            accessibilityLabel={`Profile photo of ${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}
          />
        ) : (
          <View
            style={styles.avatar}
            accessibilityLabel={`Profile initials for ${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}
          >
            <Text style={styles.avatarText}>
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </Text>
          </View>
        )}

        {(user?.isVerified || user?.role === 'contractor') && (
          <View style={styles.verificationBadges}>
            {user?.isVerified && (
              <View style={styles.verifiedBadge} accessibilityLabel='Verified account'>
                <Ionicons
                  name='checkmark-circle'
                  size={20}
                  color={theme.colors.success}
                />
              </View>
            )}
            {user?.role === 'contractor' && (
              <View style={styles.licensedBadge} accessibilityLabel='Licensed contractor'>
                <Ionicons
                  name='shield-checkmark'
                  size={16}
                  color={theme.colors.info}
                />
              </View>
            )}
          </View>
        )}
      </View>

      <Text style={styles.userName}>
        {user?.firstName} {user?.lastName}
      </Text>

      {user?.role === 'contractor' && (
        <View style={styles.contractorTitle}>
          <Ionicons name='hammer' size={16} color={theme.colors.textSecondary} />
          <Text style={styles.contractorTitleText}>
            Professional Contractor
          </Text>
        </View>
      )}

      <Text style={styles.userEmail}>{user?.email}</Text>

      <View style={styles.badgeContainer}>
        <View
          style={[
            styles.roleBadge,
            user?.role === 'contractor' && styles.contractorBadge,
          ]}
        >
          <Ionicons
            name={user?.role === 'contractor' ? 'construct' : 'home'}
            size={14}
            color={user?.role === 'contractor' ? '#FF6B35' : theme.colors.info}
          />
          <Text
            style={[
              styles.roleText,
              user?.role === 'contractor' && styles.contractorRoleText,
            ]}
          >
            {user?.role === 'contractor' ? 'Professional' : 'Homeowner'}
          </Text>
        </View>

        <View style={styles.memberSinceBadge}>
          <Ionicons name='calendar-outline' size={14} color='#666' />
          <Text style={styles.memberSinceText}>
            Since {joinDate}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  profileInfo: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: -16,
    padding: 24,
    alignItems: 'center',
    borderRadius: 20,
    ...theme.shadows.base,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
  },
  verificationBadges: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    flexDirection: 'row',
  },
  verifiedBadge: {
    backgroundColor: theme.colors.surface,
    borderRadius: 15,
    padding: 3,
    marginLeft: 2,
    ...theme.shadows.sm,
  },
  licensedBadge: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 4,
    marginLeft: 2,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  contractorTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contractorTitleText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginLeft: 6,
  },
  userEmail: {
    fontSize: 17,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  roleBadge: {
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 8,
  },
  contractorBadge: {
    backgroundColor: theme.colors.surfaceSecondary,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 6,
  },
  contractorRoleText: {
    color: theme.colors.secondary,
  },
  memberSinceBadge: {
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberSinceText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
});
