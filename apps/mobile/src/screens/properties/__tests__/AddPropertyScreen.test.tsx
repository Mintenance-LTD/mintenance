/* eslint-disable import/first --
 * jest.mock factories are hoisted above imports, so the screen under test must
 * be imported after them. Same pattern as ExploreMapScreen.test.tsx.
 */
/**
 * AddPropertyScreen — the discard-dialog contract.
 *
 * The bug this pins: hasUnsavedChanges never reset after a successful save, so
 * `navigation.goBack()` in onSuccess tripped the beforeRemove guard and showed
 * "Discard changes?" over a property that already existed. Choosing "Don't
 * leave" stranded the user on the still-filled form, where tapping Add Property
 * again created a duplicate — production had two identical "1 peveril road"
 * rows from exactly this path.
 *
 * The contract: dirty form → guard armed; successful save → guard silent.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockPost = jest.fn();
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: { post: (...args: unknown[]) => mockPost(...args) },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

// The jest config maps AuthContext to a fallback whose initial user is null,
// and the mutation throws 'Not authenticated' before ever posting. These tests
// are about the discard guard, not auth, so a signed-in user is a precondition.
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'homeowner-1' } }),
}));

jest.mock('expo-location', () => ({
  geocodeAsync: jest.fn(async () => []),
  reverseGeocodeAsync: jest.fn(async () => []),
  requestForegroundPermissionsAsync: jest.fn(async () => ({
    status: 'denied',
  })),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { High: 4 },
}));

jest.mock('../../../components/ui/DatePicker', () => ({
  DatePicker: 'DatePicker',
}));

// The unsaved-changes hook calls useNavigation() itself, so both the screen
// prop and the hook must see the same navigation object for the test to
// exercise the real guard logic rather than a stub of it.
type BeforeRemoveListener = (e: {
  preventDefault: jest.Mock;
  data: { action: { type: string } };
}) => void;

const mockListeners: BeforeRemoveListener[] = [];
const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  dispatch: jest.fn(),
  addListener: jest.fn((event: string, cb: BeforeRemoveListener) => {
    if (event === 'beforeRemove') mockListeners.push(cb);
    return () => {
      const i = mockListeners.indexOf(cb);
      if (i >= 0) mockListeners.splice(i, 1);
    };
  }),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

import { AddPropertyScreen } from '../AddPropertyScreen';

/** Fire a beforeRemove as React Navigation would, and report if it was blocked. */
function simulateLeave(): { blocked: boolean } {
  const e = {
    preventDefault: jest.fn(),
    data: { action: { type: 'GO_BACK' } },
  };
  // Iterate a copy: the guard unsubscribes as state changes.
  [...mockListeners].forEach((cb) => cb(e));
  return { blocked: e.preventDefault.mock.calls.length > 0 };
}

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AddPropertyScreen navigation={mockNavigation as never} />
    </QueryClientProvider>
  );
}

function fillRequiredFields(utils: ReturnType<typeof renderScreen>) {
  fireEvent.changeText(
    utils.getByPlaceholderText('e.g. 42 High Street'),
    '1 peveril road'
  );
  fireEvent.changeText(utils.getByPlaceholderText('e.g. London'), 'Stafford');
  fireEvent.changeText(utils.getByPlaceholderText('e.g. SW1A 1AA'), 'ST16 1YS');
}

/**
 * Press the submit button. "Add Property" appears twice on this screen — the
 * ScreenHeader title and the button — so getByText throws on ambiguity. The
 * header renders first, making the last match the button.
 */
function pressSubmit(utils: ReturnType<typeof renderScreen>) {
  const matches = utils.getAllByText('Add Property');
  fireEvent.press(matches[matches.length - 1]!);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListeners.length = 0;
  mockPost.mockResolvedValue({ id: 'p-new' });
});

describe('AddPropertyScreen — discard guard', () => {
  it('arms the guard once the form is dirty', () => {
    const utils = renderScreen();
    fillRequiredFields(utils);

    const { blocked } = simulateLeave();
    expect(blocked).toBe(true);
  });

  it('does not arm the guard on a pristine form', () => {
    renderScreen();
    const { blocked } = simulateLeave();
    expect(blocked).toBe(false);
  });

  it('leaves silently after a successful save', async () => {
    // The production bug: this exact path showed "Discard changes?" over a
    // property that had already been created.
    const utils = renderScreen();
    fillRequiredFields(utils);

    pressSubmit(utils);

    await waitFor(() => expect(mockNavigation.goBack).toHaveBeenCalled());
    expect(mockPost).toHaveBeenCalledTimes(1);

    const { blocked } = simulateLeave();
    expect(blocked).toBe(false);
  });

  it('keeps the guard armed when the save fails', async () => {
    // A failed save means the work IS still unsaved — the fix must not
    // disarm the prompt on the error path.
    mockPost.mockRejectedValueOnce(new Error('server said no'));

    const utils = renderScreen();
    fillRequiredFields(utils);

    pressSubmit(utils);

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockNavigation.goBack).not.toHaveBeenCalled();

    const { blocked } = simulateLeave();
    expect(blocked).toBe(true);
  });
});
