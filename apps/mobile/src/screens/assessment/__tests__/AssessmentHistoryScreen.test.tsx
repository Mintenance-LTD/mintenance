/* eslint-disable import/first --
 * jest.mock factories are hoisted above imports, so the screen under test must
 * be imported after them. Same pattern as ExploreMapScreen.test.tsx.
 */
/**
 * AssessmentHistoryScreen.
 *
 * Surveys were persisted from the start but unreachable on mobile, so the
 * things worth pinning are the ones that decide whether a saved survey is
 * findable at all: that rows render, that a room filter reaches the API, and
 * that "you have no surveys" is never shown when the request actually failed.
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';

const mockGet = jest.fn();
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

import { AssessmentHistoryScreen } from '../AssessmentHistoryScreen';

const navigation = { goBack: jest.fn(), navigate: jest.fn() };

const row = (over: Record<string, unknown> = {}) => ({
  id: 'a1',
  damageType: 'damp',
  severity: 'significant',
  confidence: 70,
  urgency: 'urgent',
  createdAt: '2026-07-28T21:54:12.490Z',
  thumbnailUrl: null,
  room: null,
  ...over,
});

const renderScreen = (params: Record<string, unknown> = {}) =>
  render(
    <AssessmentHistoryScreen
      navigation={navigation as never}
      route={{ params: { propertyId: 'p1', ...params } } as never}
    />
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AssessmentHistoryScreen', () => {
  it('lists saved surveys', async () => {
    mockGet.mockResolvedValue({
      assessments: [row(), row({ id: 'a2', damageType: 'exposed wiring' })],
    });

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('damp')).toBeTruthy();
      expect(getByText('exposed wiring')).toBeTruthy();
    });
  });

  it('scopes the request to a room when one is given', async () => {
    mockGet.mockResolvedValue({ assessments: [] });

    renderScreen({ roomId: 'r1', roomName: 'Kitchen' });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/api/properties/p1/assessments?roomId=r1'
      );
    });
  });

  it('asks for the whole property when no room is given', async () => {
    mockGet.mockResolvedValue({ assessments: [] });

    renderScreen();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/api/properties/p1/assessments');
    });
  });

  it('shows the empty state only when the fetch succeeded', async () => {
    mockGet.mockResolvedValue({ assessments: [] });

    const { getByText } = renderScreen();

    await waitFor(() => expect(getByText('No surveys yet')).toBeTruthy());
  });

  it('never claims "no surveys" when the request failed', async () => {
    // The distinction that matters: telling someone their surveys do not exist
    // when the server merely did not answer is a false statement about their
    // data, and it is the failure this screen is meant to end.
    mockGet.mockRejectedValue(new Error('network down'));

    const { getByText, queryByText } = renderScreen();

    await waitFor(() =>
      expect(getByText(/couldn.t load your past surveys/i)).toBeTruthy()
    );
    expect(queryByText('No surveys yet')).toBeNull();
  });

  it('retries after a failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('network down'));
    mockGet.mockResolvedValueOnce({ assessments: [row()] });

    const { getByText } = renderScreen();

    await waitFor(() => expect(getByText('Try again')).toBeTruthy());
    fireEvent.press(getByText('Try again'));

    await waitFor(() => expect(getByText('damp')).toBeTruthy());
  });

  it('opens a survey by id', async () => {
    mockGet.mockResolvedValue({
      assessments: [
        row({ room: { id: 'r1', name: 'Kitchen', type: 'kitchen' } }),
      ],
    });

    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('damp')).toBeTruthy());

    fireEvent.press(getByText('damp'));

    expect(navigation.navigate).toHaveBeenCalledWith('AssessmentDetail', {
      assessmentId: 'a1',
      title: 'Kitchen',
    });
  });

  it('survives a response that is not the expected shape', async () => {
    // The endpoint is typed at the boundary by assertion, which the compiler
    // cannot check — so a malformed body must not crash the screen.
    mockGet.mockResolvedValue({ assessments: null });

    const { getByText } = renderScreen();

    await waitFor(() => expect(getByText('No surveys yet')).toBeTruthy());
  });

  it('renders a survey with no damage type or severity', async () => {
    mockGet.mockResolvedValue({
      assessments: [
        row({ damageType: null, severity: null, confidence: null }),
      ],
    });

    const { getByText } = renderScreen();

    await waitFor(() => expect(getByText('Survey')).toBeTruthy());
  });
});
