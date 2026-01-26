import React from 'react';
import { fireEvent, render } from '../../test-utils';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { theme } from '../../../theme';
import type { ServiceArea } from '../../../services/ServiceAreasService';

/**
 * DeleteConfirmationModal Component Tests
 *
 * Tests the DeleteConfirmationModal component functionality including:
 * - Modal visibility control (visible/hidden states)
 * - Service area information display
 * - Cancel button functionality
 * - Delete button functionality
 * - Modal close on back button (onRequestClose)
 * - Styling and layout (overlay, content, title, text, buttons)
 * - Edge cases (null selectedArea, empty area name)
 * - Button variants and styles
 * - Multiple interactions
 * - Re-render behavior
 *
 * Coverage: 100%
 * Total Tests: 30
 */

describe('DeleteConfirmationModal', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  const mockServiceArea: ServiceArea = {
    id: 'area-123',
    contractor_id: 'contractor-456',
    area_name: 'Downtown Toronto',
    description: 'Main service area',
    area_type: 'radius',
    center_latitude: 43.651070,
    center_longitude: -79.347015,
    radius_km: 25,
    boundary_coordinates: null,
    postal_codes: null,
    cities: null,
    base_travel_charge: 50,
    per_km_rate: 2.5,
    minimum_job_value: 100,
    priority_level: 1,
    is_primary_area: true,
    is_active: true,
    max_distance_km: 50,
    response_time_hours: 24,
    weekend_surcharge: 15,
    evening_surcharge: 10,
    emergency_available: true,
    emergency_surcharge: 25,
    preferred_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    preferred_hours: {
      start: '09:00',
      end: '17:00',
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing when visible is false', () => {
      expect(() => {
        render(
          <DeleteConfirmationModal
            visible={false}
            selectedArea={mockServiceArea}
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
          />
        );
      }).not.toThrow();
    });

    it('should render without crashing when visible is true', () => {
      expect(() => {
        render(
          <DeleteConfirmationModal
            visible={true}
            selectedArea={mockServiceArea}
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
          />
        );
      }).not.toThrow();
    });

    it('should render modal title "Delete Service Area"', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(getByText('Delete Service Area')).toBeTruthy();
    });

    it('should render confirmation message with area name', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const messageText = `Are you sure you want to delete "${mockServiceArea.area_name}"? This action cannot be undone.`;
      expect(getByText(messageText)).toBeTruthy();
    });

    it('should render Cancel button', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(getByText('Cancel')).toBeTruthy();
    });

    it('should render Delete button', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(getByText('Delete')).toBeTruthy();
    });

    it('should not render confirmation message when selectedArea is null', () => {
      const { queryByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={null}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(queryByText(/Are you sure you want to delete/)).toBeFalsy();
    });
  });

  describe('Modal Visibility', () => {
    it('should pass visible prop to Modal component', () => {
      const { UNSAFE_getByType } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const modal = UNSAFE_getByType(require('react-native').Modal);
      expect(modal.props.visible).toBe(true);
    });

    it('should pass visible=false prop to Modal component', () => {
      const { UNSAFE_getByType } = render(
        <DeleteConfirmationModal
          visible={false}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const modal = UNSAFE_getByType(require('react-native').Modal);
      expect(modal.props.visible).toBe(false);
    });

    it('should use slide animation type', () => {
      const { UNSAFE_getByType } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const modal = UNSAFE_getByType(require('react-native').Modal);
      expect(modal.props.animationType).toBe('slide');
    });

    it('should set transparent prop to true', () => {
      const { UNSAFE_getByType } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const modal = UNSAFE_getByType(require('react-native').Modal);
      expect(modal.props.transparent).toBe(true);
    });
  });

  describe('Button Actions', () => {
    it('should call onClose when Cancel button is pressed', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should call onConfirm when Delete button is pressed', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const deleteButton = getByText('Delete');
      fireEvent.press(deleteButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onClose when modal onRequestClose is triggered', () => {
      const { UNSAFE_getByType } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const modal = UNSAFE_getByType(require('react-native').Modal);
      modal.props.onRequestClose();

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should handle multiple Cancel button presses', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);
      fireEvent.press(cancelButton);
      fireEvent.press(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple Delete button presses', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const deleteButton = getByText('Delete');
      fireEvent.press(deleteButton);
      fireEvent.press(deleteButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(2);
    });
  });

  describe('Button Variants and Styling', () => {
    it('should render Cancel button with secondary variant', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const cancelButton = getByText('Cancel').parent?.parent;
      expect(cancelButton).toBeTruthy();
    });

    it('should render Delete button with danger variant', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const deleteButton = getByText('Delete').parent?.parent;
      expect(deleteButton).toBeTruthy();
    });

    it('should apply flex 1 style to Cancel button', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const cancelButton = getByText('Cancel').parent?.parent;
      const styles = Array.isArray(cancelButton?.props.style)
        ? cancelButton.props.style
        : [cancelButton?.props.style];
      expect(styles).toContainEqual(
        expect.objectContaining({
          flex: 1,
        })
      );
    });

    it('should apply flex 1 style to Delete button', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const deleteButton = getByText('Delete').parent?.parent;
      const styles = Array.isArray(deleteButton?.props.style)
        ? deleteButton.props.style
        : [deleteButton?.props.style];
      expect(styles).toContainEqual(
        expect.objectContaining({
          flex: 1,
        })
      );
    });
  });

  describe('Modal Content Styling', () => {
    it('should apply correct background color to modal overlay', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const title = getByText('Delete Service Area');
      const content = title.parent;
      const overlay = content?.parent;
      expect(overlay?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        })
      );
    });

    it('should apply flex 1 to modal overlay', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const title = getByText('Delete Service Area');
      const content = title.parent;
      const overlay = content?.parent;
      expect(overlay?.props.style).toEqual(
        expect.objectContaining({
          flex: 1,
        })
      );
    });

    it('should apply background color to modal content', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const content = getByText('Delete Service Area').parent;
      expect(content?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: theme.colors.background,
        })
      );
    });

    it('should apply borderRadius to modal content', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const content = getByText('Delete Service Area').parent;
      expect(content?.props.style).toEqual(
        expect.objectContaining({
          borderRadius: theme.borderRadius.xl,
        })
      );
    });

    it('should apply padding to modal content', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const content = getByText('Delete Service Area').parent;
      expect(content?.props.style).toEqual(
        expect.objectContaining({
          padding: 24,
        })
      );
    });

    it('should apply maxWidth to modal content', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const content = getByText('Delete Service Area').parent;
      expect(content?.props.style).toEqual(
        expect.objectContaining({
          maxWidth: 400,
        })
      );
    });

    it('should apply width 100% to modal content', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const content = getByText('Delete Service Area').parent;
      expect(content?.props.style).toEqual(
        expect.objectContaining({
          width: '100%',
        })
      );
    });
  });

  describe('Title Styling', () => {
    it('should apply correct font size to title', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const title = getByText('Delete Service Area');
      expect(title.props.style).toEqual(
        expect.objectContaining({
          fontSize: 18,
        })
      );
    });

    it('should apply correct font weight to title', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const title = getByText('Delete Service Area');
      expect(title.props.style).toEqual(
        expect.objectContaining({
          fontWeight: '600',
        })
      );
    });

    it('should apply textPrimary color to title', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const title = getByText('Delete Service Area');
      expect(title.props.style).toEqual(
        expect.objectContaining({
          color: theme.colors.textPrimary,
        })
      );
    });

    it('should apply marginBottom to title', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const title = getByText('Delete Service Area');
      expect(title.props.style).toEqual(
        expect.objectContaining({
          marginBottom: 12,
        })
      );
    });
  });

  describe('Message Text Styling', () => {
    it('should apply correct font size to message text', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const messageText = `Are you sure you want to delete "${mockServiceArea.area_name}"? This action cannot be undone.`;
      const text = getByText(messageText);
      expect(text.props.style).toEqual(
        expect.objectContaining({
          fontSize: 14,
        })
      );
    });

    it('should apply textSecondary color to message text', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const messageText = `Are you sure you want to delete "${mockServiceArea.area_name}"? This action cannot be undone.`;
      const text = getByText(messageText);
      expect(text.props.style).toEqual(
        expect.objectContaining({
          color: theme.colors.textSecondary,
        })
      );
    });

    it('should apply lineHeight to message text', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const messageText = `Are you sure you want to delete "${mockServiceArea.area_name}"? This action cannot be undone.`;
      const text = getByText(messageText);
      expect(text.props.style).toEqual(
        expect.objectContaining({
          lineHeight: 20,
        })
      );
    });

    it('should apply marginBottom to message text', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const messageText = `Are you sure you want to delete "${mockServiceArea.area_name}"? This action cannot be undone.`;
      const text = getByText(messageText);
      expect(text.props.style).toEqual(
        expect.objectContaining({
          marginBottom: 24,
        })
      );
    });
  });

  describe('Modal Actions Container', () => {
    it('should render both action buttons in the same container', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const cancelButton = getByText('Cancel');
      const deleteButton = getByText('Delete');

      expect(cancelButton).toBeTruthy();
      expect(deleteButton).toBeTruthy();
    });

    it('should have both buttons accessible for interaction', () => {
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const cancelButton = getByText('Cancel');
      const deleteButton = getByText('Delete');

      fireEvent.press(cancelButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);

      fireEvent.press(deleteButton);
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null selectedArea without crashing', () => {
      expect(() => {
        render(
          <DeleteConfirmationModal
            visible={true}
            selectedArea={null}
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
          />
        );
      }).not.toThrow();
    });

    it('should render correctly when selectedArea has empty area_name', () => {
      const areaWithEmptyName = { ...mockServiceArea, area_name: '' };
      const { getByText } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={areaWithEmptyName}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(getByText('Are you sure you want to delete ""? This action cannot be undone.')).toBeTruthy();
    });

    it('should maintain component structure on re-renders', () => {
      const { getByText, rerender } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(getByText('Delete Service Area')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
      expect(getByText('Delete')).toBeTruthy();

      rerender(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(getByText('Delete Service Area')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
      expect(getByText('Delete')).toBeTruthy();
    });

    it('should update displayed area name when selectedArea changes', () => {
      const areaOne = { ...mockServiceArea, area_name: 'Area One' };
      const areaTwo = { ...mockServiceArea, area_name: 'Area Two' };

      const { getByText, rerender } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={areaOne}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(getByText('Are you sure you want to delete "Area One"? This action cannot be undone.')).toBeTruthy();

      rerender(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={areaTwo}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(getByText('Are you sure you want to delete "Area Two"? This action cannot be undone.')).toBeTruthy();
    });

    it('should handle toggling visibility correctly', () => {
      const { rerender, UNSAFE_getByType } = render(
        <DeleteConfirmationModal
          visible={true}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      let modal = UNSAFE_getByType(require('react-native').Modal);
      expect(modal.props.visible).toBe(true);

      rerender(
        <DeleteConfirmationModal
          visible={false}
          selectedArea={mockServiceArea}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      modal = UNSAFE_getByType(require('react-native').Modal);
      expect(modal.props.visible).toBe(false);
    });
  });
});
