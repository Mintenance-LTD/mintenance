import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import Button from '../ui/Button';
import { theme } from '../../theme';
import type { ServiceArea } from '../../services/ServiceAreasService';

interface DeleteConfirmationModalProps {
  visible: boolean;
  selectedArea: ServiceArea | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  visible,
  selectedArea,
  onClose,
  onConfirm,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Delete Service Area</Text>
          {selectedArea && (
            <Text style={styles.modalText}>
              Are you sure you want to delete "{selectedArea.area_name}"? This
              action cannot be undone.
            </Text>
          )}
          <View style={styles.modalActions}>
            <Button
              variant='secondary'
              title='Cancel'
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              variant='danger'
              title='Delete'
              onPress={onConfirm}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
});
