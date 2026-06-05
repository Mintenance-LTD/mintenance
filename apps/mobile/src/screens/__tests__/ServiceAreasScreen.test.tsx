/**
 * ServiceAreasScreen — branch-coverage suite.
 *
 * Strategy: render the REAL screen, mock only externals. `useServiceAreas`
 * is mocked so every state (loading / empty / populated / primary
 * selection) is drivable. Child modals/cards are stubbed to plain hosts
 * that expose their callback props as press targets, so we can fire the
 * screen's handlers (add / delete / toggle / refresh / mode select).
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ---- external mocks -------------------------------------------------------

// Render FlatList eagerly so ListHeaderComponent / renderItem /
// ListEmptyComponent / ItemSeparatorComponent all execute (the default
// RN test mock renders nothing, hiding the sub-components). Patch the
// `react-native` barrel because the screen imports FlatList from it.
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const React = require('react');
  const FlatListMock = (props: any) => {
    const {
      data = [],
      renderItem,
      ListHeaderComponent,
      ListEmptyComponent,
      ItemSeparatorComponent,
      keyExtractor,
      refreshControl,
    } = props;
    const resolve = (C: any) =>
      C == null ? null : React.isValidElement(C) ? C : React.createElement(C);
    const children: any[] = [];
    if (refreshControl) children.push(resolve(refreshControl));
    if (ListHeaderComponent)
      children.push(
        React.createElement(
          React.Fragment,
          { key: 'header' },
          resolve(ListHeaderComponent)
        )
      );
    if (!data || data.length === 0) {
      if (ListEmptyComponent)
        children.push(
          React.createElement(
            React.Fragment,
            { key: 'empty' },
            resolve(ListEmptyComponent)
          )
        );
    } else {
      data.forEach((item: any, index: number) => {
        children.push(
          React.createElement(
            React.Fragment,
            { key: keyExtractor ? keyExtractor(item, index) : index },
            renderItem ? renderItem({ item, index }) : null,
            index < data.length - 1 && ItemSeparatorComponent
              ? resolve(ItemSeparatorComponent)
              : null
          )
        );
      });
    }
    return React.createElement(RN.View, { testID: 'flatlist' }, children);
  };
  return { ...RN, FlatList: FlatListMock };
});

jest.mock('react-native-safe-area-context', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    SafeAreaView: ({ children }: any) =>
      React.createElement(RN.View, null, children),
    SafeAreaProvider: ({ children }: any) =>
      React.createElement(RN.View, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@expo/vector-icons', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    Ionicons: ({ name }: any) =>
      React.createElement(RN.Text, null, `icon:${name}`),
  };
});

jest.mock('../../components/LoadingSpinner', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    LoadingSpinner: ({ message }: any) =>
      React.createElement(RN.Text, { testID: 'loading-spinner' }, message),
  };
});

// Auth — overridable per test via mockUser.
let mockUser: any = {
  id: 'u1',
  address: '1 High St',
  city: 'Leeds',
  postcode: 'LS1',
  latitude: 53.8,
  longitude: -1.5,
};
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Child components — expose their callbacks as fire targets.
jest.mock('../../components/service-areas/DeleteConfirmationModal', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    DeleteConfirmationModal: ({
      visible,
      selectedArea,
      onClose,
      onConfirm,
    }: any) =>
      visible
        ? React.createElement(
            RN.View,
            { testID: 'delete-modal' },
            React.createElement(
              RN.Text,
              null,
              `delete:${selectedArea ? selectedArea.area_name : 'none'}`
            ),
            React.createElement(RN.TouchableOpacity, {
              testID: 'delete-confirm',
              onPress: onConfirm,
            }),
            React.createElement(RN.TouchableOpacity, {
              testID: 'delete-close',
              onPress: onClose,
            })
          )
        : null,
  };
});

jest.mock('../../components/service-areas/CreateServiceAreaModal', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    CreateServiceAreaModal: ({
      visible,
      onClose,
      onCreated,
      onCreate,
      defaultAddress,
    }: any) =>
      visible
        ? React.createElement(
            RN.View,
            { testID: 'create-modal' },
            React.createElement(
              RN.Text,
              null,
              `addr:${defaultAddress ? defaultAddress.city : 'none'}`
            ),
            React.createElement(RN.TouchableOpacity, {
              testID: 'create-submit',
              onPress: () =>
                onCreate({
                  area_name: 'New',
                  center_latitude: 1,
                  center_longitude: 2,
                  radius_km: 10,
                  is_primary_area: true,
                }),
            }),
            React.createElement(RN.TouchableOpacity, {
              testID: 'create-created',
              onPress: onCreated,
            }),
            React.createElement(RN.TouchableOpacity, {
              testID: 'create-close',
              onPress: onClose,
            })
          )
        : null,
  };
});

jest.mock('../../components/service-areas/RadiusRingsCard', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    RadiusRingsCard: ({
      standardMiles,
      extendedMiles,
      selectedMode,
      onSelectMode,
    }: any) =>
      React.createElement(
        RN.View,
        { testID: 'radius-rings' },
        React.createElement(
          RN.Text,
          null,
          `rings:${standardMiles}/${extendedMiles}/${selectedMode}`
        ),
        React.createElement(RN.TouchableOpacity, {
          testID: 'select-extended',
          onPress: () => onSelectMode('extended'),
        })
      ),
  };
});

jest.mock('../../components/service-areas/TravelSurchargeCard', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    TravelSurchargeCard: ({
      thresholdMiles,
      ratePerMile,
      formatCurrency,
    }: any) =>
      React.createElement(
        RN.View,
        { testID: 'surcharge-card' },
        React.createElement(
          RN.Text,
          null,
          `surcharge:${thresholdMiles}:${formatCurrency(ratePerMile)}`
        )
      ),
  };
});

// useServiceAreas — fully mocked so we drive every state.
// `mock`-prefixed so the jest.mock factory may reference it.
const mockHook: any = {
  state: {},
  handleRefresh: jest.fn(),
  handleCreateServiceArea: jest.fn(),
  handleToggleActive: jest.fn(),
  handleDeletePress: jest.fn(),
  handleDeleteConfirm: jest.fn(),
  setDeleteModalVisible: jest.fn(),
  setCreateModalVisible: jest.fn(),
};
const handleRefresh = mockHook.handleRefresh;
const handleCreateServiceArea = mockHook.handleCreateServiceArea;
const handleToggleActive = mockHook.handleToggleActive;
const handleDeletePress = mockHook.handleDeletePress;
const handleDeleteConfirm = mockHook.handleDeleteConfirm;
const setDeleteModalVisible = mockHook.setDeleteModalVisible;
const setCreateModalVisible = mockHook.setCreateModalVisible;
const hookState = mockHook.state;

jest.mock('../../hooks/useServiceAreas', () => ({
  useServiceAreas: () => ({
    serviceAreas: mockHook.state.serviceAreas,
    loading: mockHook.state.loading,
    refreshing: mockHook.state.refreshing,
    selectedArea: mockHook.state.selectedArea,
    deleteModalVisible: mockHook.state.deleteModalVisible,
    setDeleteModalVisible: mockHook.setDeleteModalVisible,
    createModalVisible: mockHook.state.createModalVisible,
    setCreateModalVisible: mockHook.setCreateModalVisible,
    handleRefresh: mockHook.handleRefresh,
    handleCreateServiceArea: mockHook.handleCreateServiceArea,
    handleToggleActive: mockHook.handleToggleActive,
    handleDeletePress: mockHook.handleDeletePress,
    handleDeleteConfirm: mockHook.handleDeleteConfirm,
  }),
}));

// Import after mocks are registered.
import { ServiceAreasScreen } from '../ServiceAreasScreen';

const mockNavigation: any = { goBack: jest.fn() };

const baseArea = (over: Partial<any> = {}): any => ({
  id: 'a1',
  contractor_id: 'c1',
  area_name: 'Central Leeds',
  area_type: 'radius',
  radius_km: 16.09, // ~10 mi
  cities: ['Leeds'],
  base_travel_charge: 0,
  per_km_rate: 0,
  minimum_job_value: 0,
  priority_level: 1,
  is_primary_area: true,
  is_active: true,
  response_time_hours: 24,
  max_distance_km: undefined,
  ...over,
});

const setHook = (over: Partial<any>) => {
  hookState.serviceAreas = [];
  hookState.loading = false;
  hookState.refreshing = false;
  hookState.selectedArea = null;
  hookState.deleteModalVisible = false;
  hookState.createModalVisible = false;
  Object.assign(hookState, over);
};

const renderScreen = () =>
  render(<ServiceAreasScreen navigation={mockNavigation} />);

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = {
    id: 'u1',
    address: '1 High St',
    city: 'Leeds',
    postcode: 'LS1',
    latitude: 53.8,
    longitude: -1.5,
  };
  setHook({});
});

describe('ServiceAreasScreen — loading state', () => {
  it('renders the LoadingSpinner while loading', () => {
    setHook({ loading: true });
    const { getByTestId } = renderScreen();
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });
});

describe('ServiceAreasScreen — empty state', () => {
  it('renders EmptyState + define-radius CTA when no areas', () => {
    setHook({ serviceAreas: [] });
    const { getByText, queryByTestId } = renderScreen();
    expect(getByText('Set your service area')).toBeTruthy();
    // No primary => no rings card, no surcharge card.
    expect(queryByTestId('radius-rings')).toBeNull();
    expect(queryByTestId('surcharge-card')).toBeNull();
  });

  it('uses the define-radius CTA to open the create modal', () => {
    setHook({ serviceAreas: [] });
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Define service radius →'));
    expect(setCreateModalVisible).toHaveBeenCalledWith(true);
  });

  it('falls back to default sub copy when no primary', () => {
    setHook({ serviceAreas: [] });
    const { getByText } = renderScreen();
    expect(
      getByText('Define where you take work — and how far you travel.')
    ).toBeTruthy();
  });
});

describe('ServiceAreasScreen — populated with primary', () => {
  it('renders rings card, borough header and area card', () => {
    setHook({ serviceAreas: [baseArea()] });
    const { getByTestId, getByText } = renderScreen();
    expect(getByTestId('radius-rings')).toBeTruthy();
    // 10 mi radius around Leeds (computed sub).
    expect(getByText('10 mi radius around Leeds')).toBeTruthy();
    expect(getByText('Boroughs you serve · 1')).toBeTruthy();
    expect(getByText('Central Leeds')).toBeTruthy();
  });

  it('shows the surcharge card only when per_km_rate > 0', () => {
    setHook({ serviceAreas: [baseArea({ per_km_rate: 2 })] });
    const { getByTestId } = renderScreen();
    expect(getByTestId('surcharge-card')).toBeTruthy();
  });

  it('hides the surcharge card when per_km_rate is 0', () => {
    setHook({ serviceAreas: [baseArea({ per_km_rate: 0 })] });
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('surcharge-card')).toBeNull();
  });

  it('selects the primary that is active AND is_primary_area', () => {
    const nonPrimary = baseArea({
      id: 'a0',
      area_name: 'Edge',
      is_primary_area: false,
      cities: ['Bradford'],
    });
    const primary = baseArea({ id: 'a1', cities: ['Leeds'] });
    setHook({ serviceAreas: [nonPrimary, primary] });
    const { getByText } = renderScreen();
    expect(getByText('10 mi radius around Leeds')).toBeTruthy();
  });

  it('falls back to first active area when none is is_primary_area', () => {
    const a = baseArea({
      id: 'a1',
      is_primary_area: false,
      is_active: true,
      cities: ['Hull'],
    });
    setHook({ serviceAreas: [a] });
    const { getByText } = renderScreen();
    expect(getByText('10 mi radius around Hull')).toBeTruthy();
  });

  it('falls back to first area when none active', () => {
    const a = baseArea({
      id: 'a1',
      is_primary_area: false,
      is_active: false,
      cities: ['York'],
    });
    setHook({ serviceAreas: [a] });
    const { getByText } = renderScreen();
    // Inactive area still drives the headline as a last-resort fallback.
    expect(getByText('10 mi radius around York')).toBeTruthy();
  });

  it('uses user.city when primary has no cities', () => {
    const a = baseArea({ cities: [] });
    setHook({ serviceAreas: [a] });
    const { getByText } = renderScreen();
    expect(getByText('10 mi radius around Leeds')).toBeTruthy();
  });

  it('uses "your area" when primary has no cities and no user city', () => {
    mockUser = { id: 'u1' };
    const a = baseArea({ cities: undefined });
    setHook({ serviceAreas: [a] });
    const { getByText } = renderScreen();
    expect(getByText('10 mi radius around your area')).toBeTruthy();
  });

  it('computes extended radius from max_distance_km branch', () => {
    const a = baseArea({ radius_km: 16.09, max_distance_km: 80.45 }); // 50 mi
    setHook({ serviceAreas: [a] });
    const { getByText } = renderScreen();
    // rings:standard/extended/mode -> standard 10, extended 50
    expect(getByText('rings:10/50/standard')).toBeTruthy();
  });

  it('computes extended radius from radius_km*1.6 fallback', () => {
    const a = baseArea({ radius_km: 16.09, max_distance_km: undefined });
    setHook({ serviceAreas: [a] });
    const { getByText } = renderScreen();
    // max(10+4, round(16.09*1.6/1.609)) = max(14, 16) = 16
    expect(getByText('rings:10/16/standard')).toBeTruthy();
  });

  it('handles primary with undefined radius_km (nullish fallback to 0)', () => {
    // radius_km undefined => kmToMiles(undefined)=0; extended fallback
    // path uses (radius_km ?? 0) * 1.6 => 0 => max(0+4, 0) = 4.
    const a = baseArea({ radius_km: undefined, max_distance_km: undefined });
    setHook({ serviceAreas: [a] });
    const { getByText } = renderScreen();
    expect(getByText('rings:0/4/standard')).toBeTruthy();
  });
});

describe('ServiceAreasScreen — top nav handlers', () => {
  it('goes back when the back button is pressed', () => {
    setHook({ serviceAreas: [baseArea()] });
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Go back'));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('opens create modal from the add button', () => {
    setHook({ serviceAreas: [baseArea()] });
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Add service area'));
    expect(setCreateModalVisible).toHaveBeenCalledWith(true);
  });
});

describe('ServiceAreasScreen — area card interactions', () => {
  it('toggles active when the switch changes', () => {
    const a = baseArea();
    setHook({ serviceAreas: [a] });
    const { UNSAFE_getByType } = renderScreen();
    const Switch = require('react-native').Switch;
    fireEvent(UNSAFE_getByType(Switch), 'valueChange', false);
    expect(handleToggleActive).toHaveBeenCalledWith(a);
  });

  it('fires delete press from the trash button', () => {
    const a = baseArea();
    setHook({ serviceAreas: [a] });
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Delete Central Leeds'));
    expect(handleDeletePress).toHaveBeenCalledWith(a);
  });

  it('renders area meta without city when cities empty', () => {
    const a = baseArea({ cities: [], area_name: 'NoCity' });
    setHook({ serviceAreas: [a] });
    const { getByText } = renderScreen();
    // "10 mi radius" with no " · city" suffix.
    expect(getByText('10 mi radius')).toBeTruthy();
  });
});

describe('ServiceAreasScreen — borough chips', () => {
  it('renders surcharged chip text with +£ when base_travel_charge > 0', () => {
    const a = baseArea({ base_travel_charge: 5, cities: ['Leeds'] });
    setHook({ serviceAreas: [a] });
    const { getByText } = renderScreen();
    expect(getByText('Leeds +£5')).toBeTruthy();
  });

  it('renders plain chip text when no surcharge', () => {
    const a = baseArea({ base_travel_charge: 0, cities: ['Leeds'] });
    setHook({ serviceAreas: [a] });
    const { getByText } = renderScreen();
    expect(getByText('Leeds')).toBeTruthy();
  });

  it('skips inactive areas and dedupes city chips', () => {
    const active = baseArea({ id: 'a1', is_active: true, cities: ['Leeds'] });
    const dup = baseArea({ id: 'a2', is_active: true, cities: ['Leeds'] });
    const inactive = baseArea({
      id: 'a3',
      is_active: false,
      cities: ['Hidden'],
    });
    setHook({ serviceAreas: [active, dup, inactive] });
    const { getByText, queryByText } = renderScreen();
    expect(getByText('Leeds')).toBeTruthy();
    expect(queryByText('Hidden')).toBeNull();
  });

  it('handles an active area with missing cities array', () => {
    const a = baseArea({ cities: undefined, is_active: true });
    setHook({ serviceAreas: [a] });
    const { getByText } = renderScreen();
    // Still renders the Add chip / borough header.
    expect(getByText('Add')).toBeTruthy();
  });

  it('opens create modal from the borough Add chip', () => {
    setHook({ serviceAreas: [baseArea()] });
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Add borough'));
    expect(setCreateModalVisible).toHaveBeenCalledWith(true);
  });

  it('defaults surcharge to 0 when base_travel_charge is null', () => {
    // Exercises the `a.base_travel_charge ?? 0` nullish branch in the chip row.
    const a = baseArea({ base_travel_charge: null as any, cities: ['Leeds'] });
    setHook({ serviceAreas: [a] });
    const { getByText } = renderScreen();
    // surcharge 0 => plain chip text, no +£.
    expect(getByText('Leeds')).toBeTruthy();
  });
});

describe('ServiceAreasScreen — modals', () => {
  it('shows the delete modal with selected area and confirms', () => {
    setHook({
      serviceAreas: [baseArea()],
      deleteModalVisible: true,
      selectedArea: baseArea({ area_name: 'ToDelete' }),
    });
    const { getByTestId, getByText } = renderScreen();
    expect(getByText('delete:ToDelete')).toBeTruthy();
    fireEvent.press(getByTestId('delete-confirm'));
    expect(handleDeleteConfirm).toHaveBeenCalled();
    fireEvent.press(getByTestId('delete-close'));
    expect(setDeleteModalVisible).toHaveBeenCalledWith(false);
  });

  it('shows the create modal and wires submit/created/close', () => {
    setHook({ serviceAreas: [baseArea()], createModalVisible: true });
    const { getByTestId, getByText } = renderScreen();
    // defaultAddress derived from user.
    expect(getByText('addr:Leeds')).toBeTruthy();
    fireEvent.press(getByTestId('create-submit'));
    expect(handleCreateServiceArea).toHaveBeenCalled();
    fireEvent.press(getByTestId('create-created'));
    fireEvent.press(getByTestId('create-close'));
    expect(setCreateModalVisible).toHaveBeenCalledWith(false);
  });

  it('passes undefined defaultAddress when there is no user', () => {
    mockUser = null;
    setHook({ serviceAreas: [], createModalVisible: true });
    const { getByText } = renderScreen();
    expect(getByText('addr:none')).toBeTruthy();
  });

  it('forwards mode selection from the rings card', () => {
    setHook({ serviceAreas: [baseArea()] });
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('select-extended'));
    // Re-render reflects extended mode in the stub label.
    expect(getByText(/\/extended$/)).toBeTruthy();
  });
});

describe('ServiceAreasScreen — refresh', () => {
  it('invokes handleRefresh via the RefreshControl', async () => {
    setHook({ serviceAreas: [baseArea()] });
    const { UNSAFE_getByType } = renderScreen();
    const RefreshControl = require('react-native').RefreshControl;
    const rc = UNSAFE_getByType(RefreshControl);
    rc.props.onRefresh();
    await waitFor(() => expect(handleRefresh).toHaveBeenCalled());
  });
});
