/**
 * ChatHeader — Presence-aware header with job context pill.
 * Direction A · Mint Editorial — token-styled.
 *
 * Avatar with online/offline dot, name, tappable job context pill,
 * action buttons, and dropdown menu.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoCallService } from '../../../services/VideoCallService';
import { me } from '../../../design-system/mint-editorial';

interface ChatHeaderProps {
  otherUserName: string;
  jobTitle: string;
  userId: string;
  jobId?: string;
  onGoBack: () => void;
  onScheduleCall: () => void;
  onStartVideoCall: () => void;
  onPrepareContract?: () => void;
  onShareDocument?: () => void;
  onSendQuote?: () => void;
  onViewJobDetails?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  otherUserName,
  jobTitle,
  userId,
  onGoBack,
  onScheduleCall,
  onStartVideoCall,
  onPrepareContract,
  onShareDocument,
  onSendQuote,
  onViewJobDetails,
}) => {
  const isInCall = VideoCallService.isUserInCall(userId);
  const [showMenu, setShowMenu] = useState(false);

  const initials = otherUserName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const menuItems = [
    {
      label: 'Prepare Contract',
      icon: 'document-text-outline' as const,
      onPress: onPrepareContract,
    },
    {
      label: 'Send Quote',
      icon: 'pricetag-outline' as const,
      onPress: onSendQuote,
    },
    {
      label: 'Share Document',
      icon: 'attach-outline' as const,
      onPress: onShareDocument,
    },
    {
      label: 'View Job Details',
      icon: 'briefcase-outline' as const,
      onPress: onViewJobDetails,
    },
  ].filter((item) => item.onPress);

  return (
    <View style={styles.header}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={onGoBack}
        accessibilityRole='button'
        accessibilityLabel='Go back'
      >
        <Ionicons name='arrow-back' size={20} color={me.ink} />
      </TouchableOpacity>

      {/* Avatar with presence dot */}
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.presenceDot} />
      </View>

      {/* Name + job context pill */}
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {otherUserName}
        </Text>
        {jobTitle ? (
          <TouchableOpacity
            style={styles.jobPill}
            onPress={onViewJobDetails}
            accessibilityRole='button'
            accessibilityLabel={`View job: ${jobTitle}`}
          >
            <Ionicons name='briefcase' size={10} color={me.brand} />
            <Text style={styles.jobPillText} numberOfLines={1}>
              {jobTitle}
            </Text>
            <Ionicons name='chevron-forward' size={10} color={me.brand} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Action buttons */}
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.actionCircle}
          onPress={onScheduleCall}
          disabled={isInCall}
          accessibilityRole='button'
          accessibilityLabel='Schedule a call'
        >
          <Ionicons
            name='calendar-outline'
            size={18}
            color={isInCall ? me.ink4 : me.ink2}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCircle, !isInCall && styles.videoActionCircle]}
          onPress={onStartVideoCall}
          disabled={isInCall}
          accessibilityRole='button'
          accessibilityLabel='Start video call'
        >
          <Ionicons
            name='videocam'
            size={18}
            color={isInCall ? me.ink4 : me.brand}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCircle}
          onPress={() => setShowMenu(true)}
          accessibilityRole='button'
          accessibilityLabel='More options'
        >
          <Ionicons name='ellipsis-horizontal' size={18} color={me.ink2} />
        </TouchableOpacity>
      </View>

      {/* Dropdown menu */}
      <Modal
        visible={showMenu}
        transparent
        animationType='fade'
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setShowMenu(false)}
        >
          <Pressable style={styles.menuCard}>
            {menuItems.map((item, index) => (
              <React.Fragment key={item.label}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    item.onPress?.();
                  }}
                  accessibilityRole='button'
                  accessibilityLabel={item.label}
                >
                  <View style={styles.menuIconWrap}>
                    <Ionicons name={item.icon} size={18} color={me.ink2} />
                  </View>
                  <Text style={styles.menuItemText}>{item.label}</Text>
                </TouchableOpacity>
                {index < menuItems.length - 1 && (
                  <View style={styles.menuDivider} />
                )}
              </React.Fragment>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: me.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: me.brand,
  },
  presenceDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: me.brand,
    borderWidth: 2,
    borderColor: me.surface,
  },
  headerInfo: {
    flex: 1,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: me.ink,
    letterSpacing: -0.3,
  },
  jobPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: me.brandSoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 3,
  },
  jobPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: me.brand,
    maxWidth: 140,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoActionCircle: {
    backgroundColor: me.brandSoft,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 70,
    paddingRight: 16,
  },
  menuCard: {
    backgroundColor: me.surface,
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 220,
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.pop,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: me.ink,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: me.line2,
    marginHorizontal: 16,
  },
});
