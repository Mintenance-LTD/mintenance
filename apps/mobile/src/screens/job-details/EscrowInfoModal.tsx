/**
 * EscrowInfoModal - Explains how escrow protection works.
 *
 * Extracted from JobDetailsScreen to reduce file size.
 */
import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';
import { styles } from './jobDetailsStyles';

interface EscrowInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export const EscrowInfoModal: React.FC<EscrowInfoModalProps> = ({
  visible,
  onClose,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType='fade'
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View
        style={styles.modalContent}
        accessibilityRole='none'
        accessibilityLabel='Protected Payment information'
      >
        <Text style={styles.modalTitle}>How Protected Payment Works</Text>

        <View style={styles.escrowStep}>
          <View
            style={[styles.escrowStepIcon, { backgroundColor: me.brandSoft }]}
          >
            <Ionicons name='shield-checkmark' size={24} color={me.brand} />
          </View>
          <View style={styles.escrowStepContent}>
            <Text style={styles.escrowStepTitle}>Payment Held Securely</Text>
            <Text style={styles.escrowStepDescription}>
              Your payment is held with Protected Payment until the job is
              complete
            </Text>
          </View>
        </View>

        <View style={styles.escrowStep}>
          <View
            style={[styles.escrowStepIcon, { backgroundColor: me.brandSoft }]}
          >
            <Ionicons name='checkmark-circle' size={24} color={me.brand} />
          </View>
          <View style={styles.escrowStepContent}>
            <Text style={styles.escrowStepTitle}>Approve Completed Work</Text>
            <Text style={styles.escrowStepDescription}>
              Review before/after photos and approve the work
            </Text>
          </View>
        </View>

        <View style={styles.escrowStep}>
          <View
            style={[styles.escrowStepIcon, { backgroundColor: me.brandSoft }]}
          >
            <Ionicons name='cash' size={24} color={me.brand} />
          </View>
          <View style={styles.escrowStepContent}>
            <Text style={styles.escrowStepTitle}>Payment Released</Text>
            <Text style={styles.escrowStepDescription}>
              Funds are released to the contractor after your approval
            </Text>
          </View>
        </View>

        <Text style={styles.escrowFooterNote}>
          If you don't respond within 7 days, payment is automatically released.
        </Text>

        <TouchableOpacity
          style={styles.escrowModalButton}
          onPress={onClose}
          accessibilityRole='button'
          accessibilityLabel='Close Protected Payment information'
        >
          <Text style={styles.escrowModalButtonText}>Got it</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);
