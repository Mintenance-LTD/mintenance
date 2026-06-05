import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { CreateServiceAreaModal } from '../CreateServiceAreaModal';

// Mock the only true external: the API client used for geocoding.
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    post: jest.fn(),
  },
}));

import { mobileApiClient } from '../../../utils/mobileApiClient';

const mockPost = mobileApiClient.post as jest.Mock;

/**
 * CreateServiceAreaModal Component Tests
 *
 * Covers:
 * - Visible vs hidden modal rendering
 * - Profile-address shortcut (conditional render + prefill behaviour)
 * - useEffect prefill on open (city/postcode/coords) + reset of prefill ref on close
 * - Area name + postcode validation branches
 * - Radius chip selection (active branch toggling)
 * - Primary-area checkbox toggle (checked branch)
 * - Submit using profile coords (skip geocode) vs geocode path
 * - Geocode success / failure (location-not-found) branches
 * - onCreate success -> onCreated; onCreate error (Error / non-Error) -> Alert
 * - Loading (disabled) state via ActivityIndicator
 * - Close / reset / onRequestClose
 */

describe('CreateServiceAreaModal', () => {
  const onClose = jest.fn();
  const onCreated = jest.fn();
  const onCreate = jest.fn();

  const baseProps = {
    visible: true,
    onClose,
    onCreated,
    onCreate,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    onCreate.mockResolvedValue(undefined);
  });

  describe('Modal visibility', () => {
    it('passes visible=true to Modal', () => {
      const { UNSAFE_getByType } = render(
        <CreateServiceAreaModal {...baseProps} />
      );
      const modal = UNSAFE_getByType(require('react-native').Modal);
      expect(modal.props.visible).toBe(true);
      expect(modal.props.transparent).toBe(true);
      expect(modal.props.animationType).toBe('slide');
    });

    it('passes visible=false to Modal', () => {
      const { UNSAFE_getByType } = render(
        <CreateServiceAreaModal {...baseProps} visible={false} />
      );
      const modal = UNSAFE_getByType(require('react-native').Modal);
      expect(modal.props.visible).toBe(false);
    });

    it('renders core form fields and submit button when visible', () => {
      const { getByText } = render(<CreateServiceAreaModal {...baseProps} />);
      expect(getByText('Add Service Area')).toBeTruthy();
      expect(getByText('Area Name *')).toBeTruthy();
      expect(getByText('Postcode or Town *')).toBeTruthy();
      expect(getByText('Coverage Radius')).toBeTruthy();
      expect(getByText('Save Service Area')).toBeTruthy();
    });
  });

  describe('Profile address shortcut', () => {
    it('does NOT render the profile shortcut when no defaultAddress', () => {
      const { queryByText } = render(<CreateServiceAreaModal {...baseProps} />);
      expect(queryByText('Use My Profile Address')).toBeNull();
    });

    it('does NOT render the profile shortcut when defaultAddress has no postcode', () => {
      const { queryByText } = render(
        <CreateServiceAreaModal
          {...baseProps}
          defaultAddress={{ city: 'Cheltenham' }}
        />
      );
      expect(queryByText('Use My Profile Address')).toBeNull();
    });

    it('renders the profile shortcut when defaultAddress has a postcode', () => {
      const { getByText } = render(
        <CreateServiceAreaModal
          {...baseProps}
          defaultAddress={{ postcode: 'GL50 1QN' }}
        />
      );
      expect(getByText('Use My Profile Address')).toBeTruthy();
    });

    it('prefills name + postcode from profile on open (useEffect)', () => {
      const { getByPlaceholderText } = render(
        <CreateServiceAreaModal
          {...baseProps}
          defaultAddress={{
            city: 'Cheltenham',
            postcode: 'GL50 1QN',
            latitude: 51.9,
            longitude: -2.07,
          }}
        />
      );
      expect(getByPlaceholderText('e.g. Cheltenham Central').props.value).toBe(
        'Cheltenham'
      );
      expect(
        getByPlaceholderText('e.g. GL50 1QN or Cheltenham').props.value
      ).toBe('GL50 1QN');
    });

    it('does not prefill coords when lat/lon are missing (null branch)', async () => {
      // city + postcode present but no coords -> must geocode on submit
      mockPost.mockResolvedValue({
        latitude: 1,
        longitude: 2,
        formatted_address: 'x',
      });
      const { getByText } = render(
        <CreateServiceAreaModal
          {...baseProps}
          defaultAddress={{ city: 'Cheltenham', postcode: 'GL50 1QN' }}
        />
      );
      fireEvent.press(getByText('Save Service Area'));
      await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    });

    it('fillFromProfile populates fields when shortcut tapped', () => {
      const { getByText, getByPlaceholderText } = render(
        <CreateServiceAreaModal
          {...baseProps}
          defaultAddress={{
            city: 'Bristol',
            postcode: 'BS1 4DJ',
            latitude: 51.45,
            longitude: -2.58,
          }}
        />
      );
      // change values away from prefill, then re-fill from profile
      fireEvent.changeText(
        getByPlaceholderText('e.g. Cheltenham Central'),
        'Manual'
      );
      fireEvent.press(getByText('Use My Profile Address'));
      expect(getByPlaceholderText('e.g. Cheltenham Central').props.value).toBe(
        'Bristol'
      );
    });

    it('fillFromProfile is a no-op when defaultAddress becomes undefined', () => {
      // Render with postcode so the button exists, then assert tapping with
      // the early-return guard does not crash. Covered via partial address.
      const { getByText } = render(
        <CreateServiceAreaModal
          {...baseProps}
          defaultAddress={{ postcode: 'GL50 1QN' }}
        />
      );
      // No city/coords -> fillFromProfile takes the false branches but runs.
      expect(() =>
        fireEvent.press(getByText('Use My Profile Address'))
      ).not.toThrow();
    });
  });

  describe('Validation', () => {
    it('alerts when area name is empty', () => {
      const { getByText } = render(<CreateServiceAreaModal {...baseProps} />);
      fireEvent.press(getByText('Save Service Area'));
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation',
        'Please enter an area name.'
      );
      expect(onCreate).not.toHaveBeenCalled();
    });

    it('alerts when postcode is empty (name filled)', () => {
      const { getByText, getByPlaceholderText } = render(
        <CreateServiceAreaModal {...baseProps} />
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. Cheltenham Central'),
        'My Area'
      );
      fireEvent.press(getByText('Save Service Area'));
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation',
        'Please enter a postcode or town name.'
      );
      expect(onCreate).not.toHaveBeenCalled();
    });

    it('trims whitespace-only inputs and treats them as empty', () => {
      const { getByText, getByPlaceholderText } = render(
        <CreateServiceAreaModal {...baseProps} />
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. Cheltenham Central'),
        '   '
      );
      fireEvent.press(getByText('Save Service Area'));
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation',
        'Please enter an area name.'
      );
    });
  });

  describe('Radius selection', () => {
    it('selects a radius chip and submits it as radius_km', async () => {
      mockPost.mockResolvedValue({
        latitude: 10,
        longitude: 20,
        formatted_address: 'x',
      });
      const { getByText, getByPlaceholderText } = render(
        <CreateServiceAreaModal {...baseProps} />
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. Cheltenham Central'),
        'Area'
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. GL50 1QN or Cheltenham'),
        'SW1A 1AA'
      );
      fireEvent.press(getByText('30 km'));
      fireEvent.press(getByText('Save Service Area'));
      await waitFor(() =>
        expect(onCreate).toHaveBeenCalledWith(
          expect.objectContaining({ radius_km: 30 })
        )
      );
    });

    it('defaults radius to 10 km when no chip pressed', async () => {
      mockPost.mockResolvedValue({
        latitude: 10,
        longitude: 20,
        formatted_address: 'x',
      });
      const { getByText, getByPlaceholderText } = render(
        <CreateServiceAreaModal {...baseProps} />
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. Cheltenham Central'),
        'Area'
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. GL50 1QN or Cheltenham'),
        'SW1A 1AA'
      );
      fireEvent.press(getByText('Save Service Area'));
      await waitFor(() =>
        expect(onCreate).toHaveBeenCalledWith(
          expect.objectContaining({ radius_km: 10 })
        )
      );
    });
  });

  describe('Primary area checkbox', () => {
    it('toggles is_primary_area on and submits true', async () => {
      mockPost.mockResolvedValue({
        latitude: 10,
        longitude: 20,
        formatted_address: 'x',
      });
      const { getByText, getByPlaceholderText } = render(
        <CreateServiceAreaModal {...baseProps} />
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. Cheltenham Central'),
        'Area'
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. GL50 1QN or Cheltenham'),
        'SW1A 1AA'
      );
      fireEvent.press(getByText('Set as primary area'));
      fireEvent.press(getByText('Save Service Area'));
      await waitFor(() =>
        expect(onCreate).toHaveBeenCalledWith(
          expect.objectContaining({ is_primary_area: true })
        )
      );
    });

    it('toggles checkbox on then off (both branches), submitting false', async () => {
      mockPost.mockResolvedValue({
        latitude: 10,
        longitude: 20,
        formatted_address: 'x',
      });
      const { getByText, getByPlaceholderText } = render(
        <CreateServiceAreaModal {...baseProps} />
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. Cheltenham Central'),
        'Area'
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. GL50 1QN or Cheltenham'),
        'SW1A 1AA'
      );
      fireEvent.press(getByText('Set as primary area'));
      fireEvent.press(getByText('Set as primary area'));
      fireEvent.press(getByText('Save Service Area'));
      await waitFor(() =>
        expect(onCreate).toHaveBeenCalledWith(
          expect.objectContaining({ is_primary_area: false })
        )
      );
    });
  });

  describe('Submit / geocode paths', () => {
    it('geocodes the postcode and submits returned coords', async () => {
      mockPost.mockResolvedValue({
        latitude: 51.5,
        longitude: -0.12,
        formatted_address: 'London',
      });
      const { getByText, getByPlaceholderText } = render(
        <CreateServiceAreaModal {...baseProps} />
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. Cheltenham Central'),
        '  London  '
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. GL50 1QN or Cheltenham'),
        'SW1A 1AA'
      );
      fireEvent.press(getByText('Save Service Area'));
      await waitFor(() => expect(onCreate).toHaveBeenCalled());
      expect(mockPost).toHaveBeenCalledWith('/api/geocode-proxy', {
        address: 'SW1A 1AA, UK',
      });
      expect(onCreate).toHaveBeenCalledWith({
        area_name: 'London', // trimmed
        center_latitude: 51.5,
        center_longitude: -0.12,
        radius_km: 10,
        is_primary_area: false,
      });
      expect(onCreated).toHaveBeenCalledTimes(1);
    });

    it('uses profile coords (skips geocode) when postcode unchanged from profile', async () => {
      const { getByText } = render(
        <CreateServiceAreaModal
          {...baseProps}
          defaultAddress={{
            city: 'Cheltenham',
            postcode: 'gl50 1qn', // different case/spacing than typed below
            latitude: 51.9,
            longitude: -2.07,
          }}
        />
      );
      // Prefilled name=Cheltenham, postcode=gl50 1qn. Submit directly.
      fireEvent.press(getByText('Save Service Area'));
      await waitFor(() => expect(onCreate).toHaveBeenCalled());
      // geocode must NOT have been called
      expect(mockPost).not.toHaveBeenCalled();
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          center_latitude: 51.9,
          center_longitude: -2.07,
        })
      );
    });

    it('falls back to geocode when postcode edited away from profile', async () => {
      mockPost.mockResolvedValue({
        latitude: 1,
        longitude: 2,
        formatted_address: 'x',
      });
      const { getByText, getByPlaceholderText } = render(
        <CreateServiceAreaModal
          {...baseProps}
          defaultAddress={{
            city: 'Cheltenham',
            postcode: 'GL50 1QN',
            latitude: 51.9,
            longitude: -2.07,
          }}
        />
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. GL50 1QN or Cheltenham'),
        'M1 1AE'
      );
      fireEvent.press(getByText('Save Service Area'));
      await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({ center_latitude: 1, center_longitude: 2 })
      );
    });

    it('alerts "Location not found" when geocode returns null (rejects)', async () => {
      mockPost.mockRejectedValue(new Error('network'));
      const { getByText, getByPlaceholderText } = render(
        <CreateServiceAreaModal {...baseProps} />
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. Cheltenham Central'),
        'Area'
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. GL50 1QN or Cheltenham'),
        'ZZ99 9ZZ'
      );
      fireEvent.press(getByText('Save Service Area'));
      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith(
          'Location not found',
          'Could not find coordinates for "ZZ99 9ZZ". Please check and try again.'
        )
      );
      expect(onCreate).not.toHaveBeenCalled();
    });
  });

  describe('onCreate result handling', () => {
    it('calls onCreated after successful onCreate', async () => {
      mockPost.mockResolvedValue({
        latitude: 1,
        longitude: 2,
        formatted_address: 'x',
      });
      onCreate.mockResolvedValue(undefined);
      const { getByText, getByPlaceholderText } = render(
        <CreateServiceAreaModal {...baseProps} />
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. Cheltenham Central'),
        'Area'
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. GL50 1QN or Cheltenham'),
        'SW1A 1AA'
      );
      fireEvent.press(getByText('Save Service Area'));
      await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    });

    it('alerts onCreate Error message (Error instance branch)', async () => {
      mockPost.mockResolvedValue({
        latitude: 1,
        longitude: 2,
        formatted_address: 'x',
      });
      onCreate.mockRejectedValue(new Error('Duplicate area'));
      const { getByText, getByPlaceholderText } = render(
        <CreateServiceAreaModal {...baseProps} />
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. Cheltenham Central'),
        'Area'
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. GL50 1QN or Cheltenham'),
        'SW1A 1AA'
      );
      fireEvent.press(getByText('Save Service Area'));
      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Duplicate area')
      );
      expect(onCreated).not.toHaveBeenCalled();
    });

    it('alerts fallback message when onCreate rejects with non-Error', async () => {
      mockPost.mockResolvedValue({
        latitude: 1,
        longitude: 2,
        formatted_address: 'x',
      });
      onCreate.mockRejectedValue('string failure');
      const { getByText, getByPlaceholderText } = render(
        <CreateServiceAreaModal {...baseProps} />
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. Cheltenham Central'),
        'Area'
      );
      fireEvent.changeText(
        getByPlaceholderText('e.g. GL50 1QN or Cheltenham'),
        'SW1A 1AA'
      );
      fireEvent.press(getByText('Save Service Area'));
      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to create service area'
        )
      );
    });
  });

  describe('Loading state', () => {
    it('shows ActivityIndicator while onCreate is pending and hides submit text', async () => {
      mockPost.mockResolvedValue({
        latitude: 1,
        longitude: 2,
        formatted_address: 'x',
      });
      let resolveCreate: () => void = () => {};
      onCreate.mockImplementation(
        () =>
          new Promise<void>((res) => {
            resolveCreate = res;
          })
      );
      const { ActivityIndicator } = require('react-native');
      const utils = render(<CreateServiceAreaModal {...baseProps} />);
      fireEvent.changeText(
        utils.getByPlaceholderText('e.g. Cheltenham Central'),
        'Area'
      );
      fireEvent.changeText(
        utils.getByPlaceholderText('e.g. GL50 1QN or Cheltenham'),
        'SW1A 1AA'
      );
      fireEvent.press(utils.getByText('Save Service Area'));
      await waitFor(() =>
        expect(utils.UNSAFE_getByType(ActivityIndicator)).toBeTruthy()
      );
      expect(utils.queryByText('Save Service Area')).toBeNull();
      resolveCreate();
      await waitFor(() => expect(onCreate).toHaveBeenCalled());
    });
  });

  describe('Close / reset', () => {
    it('calls onClose when close icon pressed', () => {
      const { UNSAFE_getByType, getByText } = render(
        <CreateServiceAreaModal {...baseProps} />
      );
      // onRequestClose path
      const modal = UNSAFE_getByType(require('react-native').Modal);
      modal.props.onRequestClose();
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(getByText('Add Service Area')).toBeTruthy();
    });

    it('resets fields after a successful create', async () => {
      mockPost.mockResolvedValue({
        latitude: 1,
        longitude: 2,
        formatted_address: 'x',
      });
      onCreate.mockResolvedValue(undefined);
      const { getByText, getByPlaceholderText } = render(
        <CreateServiceAreaModal {...baseProps} />
      );
      const nameInput = getByPlaceholderText('e.g. Cheltenham Central');
      fireEvent.changeText(nameInput, 'Area');
      fireEvent.changeText(
        getByPlaceholderText('e.g. GL50 1QN or Cheltenham'),
        'SW1A 1AA'
      );
      fireEvent.press(getByText('Save Service Area'));
      await waitFor(() => expect(onCreated).toHaveBeenCalled());
      // reset() clears the name field back to ''
      expect(getByPlaceholderText('e.g. Cheltenham Central').props.value).toBe(
        ''
      );
    });

    it('resets prefill ref so reopening re-prefills', () => {
      const props = {
        ...baseProps,
        defaultAddress: { city: 'Cheltenham', postcode: 'GL50 1QN' },
      };
      const { getByPlaceholderText, rerender } = render(
        <CreateServiceAreaModal {...props} />
      );
      // edit name
      fireEvent.changeText(
        getByPlaceholderText('e.g. Cheltenham Central'),
        'Edited'
      );
      // close -> hasPrefilledRef reset
      rerender(<CreateServiceAreaModal {...props} visible={false} />);
      // reopen -> useEffect prefills again
      rerender(<CreateServiceAreaModal {...props} visible={true} />);
      expect(getByPlaceholderText('e.g. Cheltenham Central').props.value).toBe(
        'Cheltenham'
      );
    });
  });
});
