import React from 'react';
import { render } from '@testing-library/react-native';
import { MapView } from '../MapPlaceholder.native';
import { shouldRenderNativeMap } from '../../../../utils/mapAvailability';

jest.mock('../../../../utils/mapAvailability', () => ({
  shouldRenderNativeMap: jest.fn(),
}));
jest.mock('react-native-maps', () => ({
  __esModule: true,
  default: 'NativeMapView',
  Marker: 'Marker',
  Polyline: 'Polyline',
}));

describe('native meeting map', () => {
  it('renders a native map with the requested region when configured', () => {
    jest.mocked(shouldRenderNativeMap).mockReturnValue(true);
    const region = {
      latitude: 51,
      longitude: 0,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
    const screen = render(<MapView testID='meeting-map' region={region} />);
    expect(screen.getByTestId('meeting-map').props.region).toEqual(region);
    expect(
      screen.queryByText('Map view available on mobile devices')
    ).toBeNull();
  });

  it('does not mount the native map without required Android configuration', () => {
    jest.mocked(shouldRenderNativeMap).mockReturnValue(false);
    const screen = render(<MapView testID='meeting-map' />);
    expect(screen.queryByTestId('meeting-map')).toBeNull();
    expect(
      screen.getByText(
        'Map unavailable. Use the meeting address for directions.'
      )
    ).toBeTruthy();
  });
});
